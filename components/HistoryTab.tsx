import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ShoppingBag, Coffee, Car, Film, Zap, Activity, MoreHorizontal, 
  Trash2, Edit3, Filter, Utensils, Bus, Gamepad2, Receipt, HeartPulse, GraduationCap,
  Banknote, Gift, Coins, TrendingUp, HandCoins, ArrowDownLeft, ArrowUpRight, CheckCircle, AlertTriangle, PartyPopper,
  Search, X
} from 'lucide-react';

interface HistoryTabProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void; 
  currentFilter: 'all' | 'expense' | 'income';
  onFilterChange: (filter: 'all' | 'expense' | 'income') => void;
  budgetConfig: { limit: number };
}

type ViewMode = 'week' | 'month';

// --- UTILS: Normalize Vietnamese String ---
const removeAccents = (str: string) => {
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase();
};

const HistoryTab: React.FC<HistoryTabProps> = ({ 
  transactions, 
  onDeleteTransaction,
  onEditTransaction,
  currentFilter,
  onFilterChange,
  budgetConfig
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  
  // --- 1. SMART SEARCH STATE ---
  const [searchTerm, setSearchTerm] = useState('');

  // --- Helper Functions ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getCategoryStyle = (category: string, type: 'income' | 'expense') => {
    const iconProps = { size: 24, className: 'text-white' }; 

    if (type === 'income') {
      return { icon: <Banknote {...iconProps} />, bg: 'bg-emerald-500 shadow-emerald-500/40' };
    }

    switch (category) {
      case 'Ăn uống': return { icon: <Utensils {...iconProps} />, bg: 'bg-orange-500 shadow-orange-500/40' };
      case 'Di chuyển': return { icon: <Bus {...iconProps} />, bg: 'bg-blue-500 shadow-blue-500/40' };
      case 'Mua sắm': return { icon: <ShoppingBag {...iconProps} />, bg: 'bg-indigo-500 shadow-indigo-500/40' };
      case 'Giải trí': return { icon: <Gamepad2 {...iconProps} />, bg: 'bg-violet-500 shadow-violet-500/40' };
      case 'Hóa đơn': return { icon: <Receipt {...iconProps} />, bg: 'bg-emerald-500 shadow-emerald-500/40' };
      case 'Sức khỏe': return { icon: <HeartPulse {...iconProps} />, bg: 'bg-rose-500 shadow-rose-500/40' };
      case 'Giáo dục': return { icon: <GraduationCap {...iconProps} />, bg: 'bg-sky-500 shadow-sky-500/40' };
      default: return { icon: <MoreHorizontal {...iconProps} />, bg: 'bg-slate-500 shadow-slate-500/40' };
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // --- 2. SMART SEARCH LOGIC (ENGINE) ---
  const isTransactionMatch = (t: Transaction, rawTerm: string) => {
    let term = removeAccents(rawTerm.trim());
    if (!term) return true;

    // --- Time Parsing ---
    const now = new Date();
    // Month logic
    if (term.includes('thang truoc')) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (t.date.getMonth() !== lastMonth.getMonth() || t.date.getFullYear() !== lastMonth.getFullYear()) return false;
      term = term.replace('thang truoc', '').trim();
    } else if (term.includes('thang nay')) {
      if (t.date.getMonth() !== now.getMonth() || t.date.getFullYear() !== now.getFullYear()) return false;
      term = term.replace('thang nay', '').trim();
    }
    // Day logic
    else if (term.includes('hom nay')) {
      if (!isSameDay(t.date, now)) return false;
      term = term.replace('hom nay', '').trim();
    } else if (term.includes('hom qua')) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (!isSameDay(t.date, yesterday)) return false;
      term = term.replace('hom qua', '').trim();
    }

    // --- Source/Type Parsing ---
    if (term.includes('tien mat')) {
      if (t.source !== 'cash') return false;
      term = term.replace('tien mat', '').trim();
    } else if (term.includes('ngan hang')) {
      if (t.source !== 'bank') return false;
      term = term.replace('ngan hang', '').trim();
    } else if (term.includes('vi')) {
      if (t.source !== 'ewallet') return false;
      term = term.replace('vi', '').trim(); // Remove strictly 'vi'
    }

    if (term.includes('thu') || term.includes('luong')) {
       // Only strictly filter if user didn't mean "thu" as in "thu cưng" (pet). 
       // Logic: Check if it's income.
       if (t.type !== 'income' && (term === 'thu' || term === 'luong')) return false;
       // We don't remove 'thu'/'luong' because it might be part of the note like "Tiền lương".
    } else if (term.includes('chi') && t.type !== 'expense') {
        // Only if exact match or clear intent needed? keeping simple for now
        // if (t.type !== 'expense') return false; 
    }

    // --- Content Search (Remaining Term) ---
    if (!term) return true; // Matches criteria above only

    const note = removeAccents(t.note || '');
    const cat = removeAccents(t.category);
    const amountStr = t.amount.toString();
    // Allow "50k" -> search "50"
    const termClean = term.replace('k', '000'); 

    return note.includes(term) || cat.includes(term) || amountStr.includes(termClean);
  };

  // --- Data Processing ---
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();

    if (viewMode === 'month') {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayJS = new Date(currentYear, currentMonth, 1).getDay(); 
      const paddingDays = firstDayJS === 0 ? 6 : firstDayJS - 1;
      
      for (let i = paddingDays - 1; i >= 0; i--) days.push(new Date(currentYear, currentMonth, -i)); 
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentYear, currentMonth, i));
    } else {
      const currentDayJS = selectedDate.getDay(); 
      const diffToMon = currentDayJS === 0 ? 6 : currentDayJS - 1;
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - diffToMon);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
      }
    }
    return days;
  }, [selectedDate, viewMode]);

  const getDayStatus = (date: Date) => {
    const dailyTx = transactions.filter(t => isSameDay(t.date, date));
    if (dailyTx.length === 0) return null;
    return { 
      hasIncome: dailyTx.some(t => t.type === 'income'),
      hasExpense: dailyTx.some(t => t.type === 'expense')
    };
  };

  const dailyStats = useMemo(() => {
    const dailyTx = transactions.filter(t => isSameDay(t.date, selectedDate));
    const income = dailyTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dailyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [selectedDate, transactions]);

  // --- 3. FILTERED LIST LOGIC ---
  const displayedTransactions = useMemo(() => {
    // A. Start with all transactions
    let list = [...transactions];

    // B. Apply Tab Filter (Always applies)
    if (currentFilter !== 'all') {
      list = list.filter(t => t.type === currentFilter);
    }

    // C. Search Mode vs Calendar Mode
    if (searchTerm.trim()) {
      // SEARCH MODE: Ignore selectedDate, match search term
      list = list.filter(t => isTransactionMatch(t, searchTerm));
      // Sort: Newest first
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
    } else {
      // CALENDAR MODE: Filter by selectedDate
      list = list.filter(t => isSameDay(t.date, selectedDate));
      // Sort: Newest first (within day)
      list.sort((a, b) => b.date.getTime() - a.date.getTime()); 
    }
    
    return list; 
  }, [selectedDate, transactions, currentFilter, searchTerm]);

  // --- Handlers ---
  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
      newDate.setDate(1); 
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
      newDate.setDate(1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setSelectedDate(newDate);
  };

  const renderDailySummary = () => {
    const { income, expense, balance } = dailyStats;
    const weeklyLimit = budgetConfig.limit / 4;
    const expensePercent = weeklyLimit > 0 ? (expense / weeklyLimit) * 100 : 0;
    const dateStr = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;

    if (income === 0 && expense === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-full mb-1">
               <PartyPopper size={20} className="text-slate-400 dark:text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hôm nay không tốn đồng nào!</p>
        </div>
      );
    }

    if (income === 0 && expense > 0) {
       const isHighSpend = expensePercent > 15;
       return (
         <div className="flex flex-col items-start gap-1 py-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">
               Hôm nay {dateStr} bạn đã chi <span className="font-bold text-lg text-rose-500 dark:text-rose-400 ml-1">{formatCurrency(expense)}</span>
            </p>
            {isHighSpend ? (
              <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1 rounded-lg">
                 <AlertTriangle size={12} className="text-orange-600 dark:text-orange-400" />
                 <span className="text-xs font-bold text-orange-700 dark:text-orange-300">Chiếm {expensePercent.toFixed(0)}% ngân sách tuần</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg">
                 <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                 <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Tiết kiệm – Tốt</span>
              </div>
            )}
         </div>
       );
    }

    return (
        <div className="flex justify-between items-center text-center divide-x divide-slate-200 dark:divide-slate-700 w-full">
          <div className="flex-1 px-2">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Thu nhập</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">+{formatCurrency(income)}</p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase mb-1">Chi tiêu</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">-{formatCurrency(expense)}</p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Số dư</p>
            <p className={`text-sm font-bold truncate ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>
              {balance > 0 ? '+' : ''}{formatCurrency(balance)}
            </p>
          </div>
        </div>
    );
  };

  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* 1. Smart Calendar Section (Hidden when searching) */}
      {!isSearching && (
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/20 dark:border-white/5 p-6 rounded-[32px] shadow-lg transition-all duration-500 ease-in-out">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={18} className="text-slate-600 dark:text-slate-300" /></button>
              <div className="text-center min-w-[80px]">
                <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">Tháng {selectedDate.getMonth() + 1}</h2>
                {viewMode === 'week' && <p className="text-[10px] text-slate-500 font-medium leading-none">Tuần {Math.ceil(selectedDate.getDate()/7)}</p>}
              </div>
              <button onClick={handleNext} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={18} className="text-slate-600 dark:text-slate-300" /></button>
            </div>
            <button onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')} className="flex items-center gap-1 px-3 py-1.5 bg-white/50 dark:bg-slate-700/50 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-colors">
              {viewMode === 'month' ? 'Thu gọn' : 'Mở rộng'} {viewMode === 'month' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {calendarDays.map((date, index) => {
              const isDummy = viewMode === 'month' && date.getMonth() !== selectedDate.getMonth();
              if (isDummy) return <div key={index} />;
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const status = getDayStatus(date);
              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <button onClick={() => setSelectedDate(date)} className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110 z-10' : 'text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-700/40'} ${isToday && !isSelected ? 'border border-blue-400 text-blue-600 dark:text-blue-400' : ''}`}>
                    {date.getDate()}
                  </button>
                  <div className="flex gap-0.5 h-1.5">
                    {status?.hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                    {status?.hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SMART Daily Summary Card (Hidden when searching) */}
      {!isSearching && (
        <div className="bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-white/40 dark:border-white/5 p-5 rounded-3xl shadow-sm transition-all duration-300 min-h-[80px] flex flex-col justify-center">
          {renderDailySummary()}
        </div>
      )}

      {/* 3. Filters & Search & List */}
      <div>
        {/* Segmented Control */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl mb-4">
          {(['all', 'expense', 'income'] as const).map((type) => (
            <button key={type} onClick={() => onFilterChange(type)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-300 ${currentFilter === type ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {type === 'all' ? 'Tất cả' : type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
            </button>
          ))}
        </div>

        {/* 4. SMART SEARCH INPUT UI */}
        <div className="relative mb-4 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-blue-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Gõ 'cafe tháng trước', 'lương', '50k'..." 
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-white placeholder-slate-400 text-sm font-medium transition-all shadow-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Transaction List */}
        <div className="space-y-3 min-h-[200px]">
          {displayedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50 space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Search className="text-slate-400" size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {isSearching ? "Không tìm thấy giao dịch nào phù hợp" : "Chưa có giao dịch nào"}
              </p>
            </div>
          ) : (
            displayedTransactions.map(t => {
              const style = getCategoryStyle(t.category, t.type);
              return (
                <div key={t.id} className="group relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-3xl shadow-sm border border-white/40 dark:border-white/5 flex items-center justify-between transition-all hover:scale-[1.01] overflow-hidden">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${style.bg} transition-transform duration-300 group-hover:scale-110`}>
                      {style.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-base">{t.category}</h4>
                      <div className="flex flex-col">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[120px] font-medium">{t.note || t.source}</p>
                        {/* Show Date in Search Mode since it's mixed */}
                        {isSearching && <p className="text-[10px] text-slate-400">{t.date.toLocaleDateString('vi-VN')}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right relative z-10 group-hover:-translate-x-24 transition-transform duration-300">
                    <p className={`font-bold text-base ${t.type === 'expense' ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {/* Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                     <button type="button" onClick={(e) => { e.stopPropagation(); onEditTransaction(t); }} className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95"><Edit3 size={18} /></button>
                     <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }} className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95"><Trash2 size={18} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;