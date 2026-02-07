import React, { useState, useMemo } from 'react';
import { Transaction, Wallet, WalletType } from '../types';
import { 
  Plus, ArrowUpRight, ArrowDownLeft, Trash2, 
  Wallet as WalletIcon, CreditCard, Smartphone,
  Utensils, Bus, ShoppingBag, Gamepad2, Receipt, HeartPulse, GraduationCap, MoreHorizontal,
  Banknote, Gift, Coins, TrendingUp, HandCoins, ChevronRight, Calendar, Calculator, ChevronDown, ChevronUp,
  Edit2, Edit3, Settings, Activity
} from 'lucide-react';

interface HomeTabProps {
  wallets: Wallet[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void;
  transactions: Transaction[];
  budgetConfig: { limit: number };
  onViewAll: () => void;
  onViewIncome: () => void;
  onViewExpense: () => void;
  onNavigateToAnalytics: () => void;
  onOpenTransactionModal: () => void;
  onOpenBalanceModal: () => void; 
  onOpenBudgetModal: () => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ 
  wallets, 
  onDeleteTransaction, 
  onEditTransaction,
  transactions, 
  budgetConfig, 
  onViewAll,
  onViewIncome,
  onViewExpense,
  onNavigateToAnalytics,
  onOpenTransactionModal,
  onOpenBalanceModal,
  onOpenBudgetModal
}) => {
  const [showBalanceDetails, setShowBalanceDetails] = useState(false); 
  
  // 1. Time Context
  const now = new Date();
  const currentMonthStr = `${now.getMonth() + 1}, ${now.getFullYear()}`;

  // 2. Data Calculations
  const walletBreakdown = useMemo(() => {
    return {
      cash: wallets.filter(w => w.id === 'cash').reduce((acc, w) => acc + w.balance, 0),
      bank: wallets.filter(w => w.id === 'bank').reduce((acc, w) => acc + w.balance, 0),
      ewallet: wallets.filter(w => w.id === 'ewallet').reduce((acc, w) => acc + w.balance, 0),
    };
  }, [wallets]);

  const totalBalance = walletBreakdown.cash + walletBreakdown.bank + walletBreakdown.ewallet;

  // Monthly Stats
  const monthlyTransactions = transactions.filter(t => 
    t.date.getMonth() === now.getMonth() && 
    t.date.getFullYear() === now.getFullYear()
  );

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // --- Double Decker Budget Logic ---
  const budgetStats = useMemo(() => {
    // 1. Month Logic (Include Bills)
    const monthSpent = monthlyExpense;
    const monthLimit = budgetConfig.limit;
    const monthPercent = Math.min((monthSpent / monthLimit) * 100, 100);

    // 2. Week Logic (EXCLUDE BILLS 'Hóa đơn')
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMon = currentDay === 0 ? 6 : currentDay - 1; 
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekSpent = transactions
        .filter(t => 
          t.type === 'expense' && 
          t.date >= startOfWeek && 
          t.category !== 'Hóa đơn' // <-- QUAN TRỌNG: Loại bỏ Hóa đơn khỏi ngân sách tuần
        )
        .reduce((acc, t) => acc + t.amount, 0);
        
    const weekLimit = monthLimit / 4;
    const weekPercent = Math.min((weekSpent / weekLimit) * 100, 100);

    return {
        month: { spent: monthSpent, limit: monthLimit, percent: monthPercent },
        week: { spent: weekSpent, limit: weekLimit, percent: weekPercent }
    };
  }, [transactions, budgetConfig, monthlyExpense]);

  const getProgressColor = (percent: number, type: 'month' | 'week') => {
      if (percent >= 100) return 'bg-red-500 shadow-red-500/50';
      if (type === 'month') return 'bg-amber-400 shadow-amber-400/50';
      return 'bg-purple-500 shadow-purple-500/50';
  };

  const monthColor = getProgressColor(budgetStats.month.percent, 'month');
  const weekColor = getProgressColor(budgetStats.week.percent, 'week');

  // --- Formatting Logic ---
  const formatFullMoney = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const formatCompactMoney = (number: number) => {
    if (number >= 1000000000) return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'tr';
    if (number >= 1000) return (number / 1000).toFixed(0) + 'k';
    if (number === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(number);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // --- Category Icon & Style Mapper ---
  const getCategoryStyle = (category: string, type: 'income' | 'expense') => {
    const iconProps = { size: 24, className: 'text-white' };

    if (type === 'income') {
      return { 
        icon: <Banknote {...iconProps} />, 
        bg: 'bg-emerald-500 shadow-emerald-500/40' 
      };
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

  return (
    <div className="space-y-6 pb-24 animate-fade-in relative z-10">
      
      {/* 1. SMART SUMMARY DASHBOARD */}
      <section className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/20 dark:border-white/5 p-6 rounded-[32px] shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <button 
                onClick={() => setShowBalanceDetails(!showBalanceDetails)}
                className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group/label cursor-pointer"
              >
                <WalletIcon size={14} /> 
                Tổng số dư
                <span className="bg-white/50 dark:bg-slate-700 rounded-full p-0.5 group-hover/label:bg-white dark:group-hover/label:bg-slate-600 transition-colors">
                  {showBalanceDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              <div className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">
                {formatFullMoney(totalBalance)}
                <span className="text-xl font-medium text-slate-400 ml-1 align-top">đ</span>
              </div>
            </div>
            <div className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar size={12} className="text-blue-500" />
                {currentMonthStr}
              </span>
            </div>
          </div>

          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${showBalanceDetails ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {['cash', 'bank', 'ewallet'].map(type => {
                  const balance = walletBreakdown[type as keyof typeof walletBreakdown];
                  let Icon = WalletIcon;
                  
                  // Label & Icon Colors
                  let colorClass = "text-emerald-600 dark:text-emerald-400";
                  // Balance Text Colors (Customized for high visibility)
                  let balanceClass = "text-emerald-700 dark:text-emerald-50";

                  let bgClass = "bg-emerald-100 dark:bg-emerald-900/50";
                  let borderClass = "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-200/50 dark:border-emerald-500/30";
                  let label = "Tiền mặt";

                  if (type === 'bank') {
                      Icon = CreditCard;
                      colorClass = "text-blue-600 dark:text-blue-400";
                      balanceClass = "text-blue-700 dark:text-blue-50";
                      bgClass = "bg-blue-100 dark:bg-blue-900/50";
                      borderClass = "bg-blue-500/10 dark:bg-blue-500/20 border-blue-200/50 dark:border-blue-500/30";
                      label = "Ngân hàng";
                  } else if (type === 'ewallet') {
                      Icon = Smartphone;
                      colorClass = "text-pink-600 dark:text-pink-400";
                      balanceClass = "text-rose-700 dark:text-rose-50";
                      bgClass = "bg-pink-100 dark:bg-pink-900/50";
                      borderClass = "bg-pink-500/10 dark:bg-pink-500/20 border-pink-200/50 dark:border-pink-500/30";
                      label = "Ví điện tử";
                  }

                  return (
                    <button 
                        key={type}
                        onClick={onOpenBalanceModal}
                        className={`
                        flex items-center gap-2 px-3 py-2 rounded-2xl border shrink-0 cursor-pointer transition-all active:scale-95 text-left
                        ${borderClass} hover:bg-opacity-50
                        ${balance === 0 ? 'opacity-40 grayscale' : ''}
                        `}
                    >
                        <div className={`w-6 h-6 rounded-full ${bgClass} flex items-center justify-center ${colorClass}`}>
                        <Icon size={12} />
                        </div>
                        <div className="flex flex-col leading-none">
                        <span className={`text-[10px] ${colorClass} opacity-70 font-bold uppercase mb-0.5`}>
                            {label}
                        </span>
                        <span className={`text-xs font-bold ${balanceClass}`}>
                            {formatCompactMoney(balance)}
                        </span>
                        </div>
                    </button>
                  );
              })}
            </div>
          </div>
          
          <div className="w-full bg-white/30 dark:bg-slate-700/30 rounded-2xl p-4 mt-6 mb-4 border border-white/10 flex flex-col gap-3 transition-transform duration-300">
             <div className="flex items-center gap-1.5 w-fit">
                <Activity size={14} className="text-slate-400 dark:text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Dòng tiền
                </span>
             </div>
             <div className="flex justify-between items-center relative">
                <div onClick={onViewIncome} className="flex flex-col flex-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-0.5">
                    <ArrowDownLeft size={14} /> Thu nhập
                  </span>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    {formatCompactMoney(monthlyIncome)}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-4"></div>
                <div onClick={onViewExpense} className="flex flex-col items-end flex-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all">
                  <span className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 font-bold mb-0.5">
                    Chi tiêu <ArrowUpRight size={14} />
                  </span>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    {formatCompactMoney(monthlyExpense)}
                  </span>
                </div>
             </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <div className="space-y-1.5">
                 <div className="flex justify-between items-end text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200">Tháng</span>
                    <span className={`${budgetStats.month.percent >= 100 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formatCompactMoney(budgetStats.month.spent)} / {formatCompactMoney(budgetStats.month.limit)}
                    </span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden relative">
                   <div 
                      className={`h-full rounded-full ${monthColor} shadow-lg relative overflow-hidden transition-all duration-1000 ease-out`}
                      style={{ width: `${budgetStats.month.percent}%` }}
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer w-full h-full" />
                   </div>
                 </div>
            </div>

            <div className="space-y-1.5">
                 <div className="flex justify-between items-end text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Tuần</span>
                    <span className={`${budgetStats.week.percent >= 100 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {formatCompactMoney(budgetStats.week.spent)} / {formatCompactMoney(budgetStats.week.limit)}
                    </span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden relative">
                   <div 
                      className={`h-full rounded-full ${weekColor} shadow-sm relative overflow-hidden transition-all duration-1000 ease-out`}
                      style={{ width: `${budgetStats.week.percent}%` }}
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer w-full h-full" />
                   </div>
                 </div>
            </div>
            
            <div className="w-full flex justify-start mt-2">
               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBudgetModal();
                  }}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
               >
                  <Edit2 size={14} />
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Recent Transactions List */}
      <section className="px-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Gần đây</h2>
          <div className="flex items-center gap-3 relative z-20">
            <button 
              type="button"
              onClick={onViewAll}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              Xem tất cả <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {transactions.slice(0, 3).map(t => {
            const style = getCategoryStyle(t.category, t.type);

            return (
              <div key={t.id} className="group relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-3xl shadow-sm border border-white/40 dark:border-white/5 flex items-center justify-between transition-all hover:scale-[1.01] overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${style.bg} transition-transform duration-300 group-hover:scale-110`}>
                    {style.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-base">{t.category}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.note || t.source}</p>
                  </div>
                </div>

                <div className="text-right relative z-10 group-hover:-translate-x-24 transition-transform duration-300">
                  <p className={`font-bold text-base ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400">{t.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction(t);
                        }} 
                        className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTransaction(t.id);
                        }} 
                        className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <button 
        type="button"
        onClick={() => onOpenTransactionModal()}
        className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl shadow-slate-900/30 flex items-center justify-center z-[80] active:scale-90 transition-transform cursor-pointer"
      >
        <Plus size={28} />
      </button>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
      `}</style>

    </div>
  );
};

export default HomeTab;