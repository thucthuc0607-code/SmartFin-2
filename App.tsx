import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, History, PieChart as PieChartIcon, Moon, Sun, 
  Plus, X, ArrowUpRight, ArrowDownLeft, Trash2, 
  Wallet as WalletIcon, CreditCard, Smartphone,
  Utensils, Bus, ShoppingBag, Gamepad2, Receipt, HeartPulse, GraduationCap, MoreHorizontal,
  Banknote, Gift, Coins, TrendingUp, HandCoins,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit2,
  Lightbulb, Target, AlertTriangle, Clock, TrendingUp as TrendingUpIcon, Save, Settings, Calendar as CalendarIcon,
  Mic, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Transaction, Wallet, WalletType } from './types';
import { INITIAL_WALLETS, MOCK_TRANSACTIONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import AnalyticsTab from './components/AnalyticsTab';
import VoiceInput, { VoiceInputHandle } from './components/VoiceInput';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyB379E6FeFdVchfVZOOg67zXpfHA2NFo-4",
  authDomain: "smartfin-24c3d.firebaseapp.com",
  projectId: "smartfin-24c3d",
  storageBucket: "smartfin-24c3d.firebasestorage.app",
  messagingSenderId: "599729173786",
  appId: "1:599729173786:web:b386a533d5c3df7cc528a3",
  measurementId: "G-SB8SVRHMQ2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_ID = "user_default";

// --- HELPERS ---
const formatCurrency = (amount: number, short = false) => {
  if (short && amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (short && amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

// Return YYYY-MM-DD string
const getDateString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const getCategoryIcon = (catName: string, isSelected: boolean = false) => {
  const props = { size: 24, className: '' };
  switch (catName) {
    case 'Ăn uống': return <Utensils {...props} />;
    case 'Di chuyển': return <Bus {...props} />;
    case 'Mua sắm': return <ShoppingBag {...props} />;
    case 'Giải trí': return <Gamepad2 {...props} />;
    case 'Hóa đơn': return <Receipt {...props} />;
    case 'Sức khỏe': return <HeartPulse {...props} />;
    case 'Giáo dục': return <GraduationCap {...props} />;
    case 'Lương': return <Banknote {...props} />;
    case 'Thưởng': return <Gift {...props} />;
    case 'Bán đồ': return <Coins {...props} />;
    case 'Lãi tiết kiệm': return <TrendingUp {...props} />;
    case 'Được tặng': return <HandCoins {...props} />;
    default: return <MoreHorizontal {...props} />;
  }
};

const getWalletIcon = (type: WalletType) => {
  switch (type) {
    case 'cash': return <WalletIcon size={18} />;
    case 'bank': return <CreditCard size={18} />;
    case 'ewallet': return <Smartphone size={18} />;
  }
};

const getWalletTheme = (id: string) => {
  switch (id) {
    case 'cash': return { active: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30', inactive: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' };
    case 'bank': return { active: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/30', inactive: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' };
    case 'ewallet': return { active: 'bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-fuchsia-500/30', inactive: 'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400' };
    default: return { active: 'bg-slate-800 text-white', inactive: 'bg-slate-100 text-slate-600' };
  }
};

const getCategoryTheme = (cat: string) => {
  switch (cat) {
    case 'Ăn uống': return { bgLight: 'bg-orange-100 dark:bg-orange-900/20', textDark: 'text-orange-600 dark:text-orange-400', active: 'bg-gradient-to-br from-orange-400 to-orange-600', shadow: 'shadow-lg shadow-orange-500/30' };
    case 'Di chuyển': return { bgLight: 'bg-blue-100 dark:bg-blue-900/20', textDark: 'text-blue-600 dark:text-blue-400', active: 'bg-gradient-to-br from-blue-400 to-blue-600', shadow: 'shadow-lg shadow-blue-500/30' };
    case 'Mua sắm': return { bgLight: 'bg-indigo-100 dark:bg-indigo-900/20', textDark: 'text-indigo-600 dark:text-indigo-400', active: 'bg-gradient-to-br from-indigo-400 to-indigo-600', shadow: 'shadow-lg shadow-indigo-500/30' };
    case 'Giải trí': return { bgLight: 'bg-violet-100 dark:bg-violet-900/20', textDark: 'text-violet-600 dark:text-violet-400', active: 'bg-gradient-to-br from-violet-400 to-violet-600', shadow: 'shadow-lg shadow-violet-500/30' };
    case 'Hóa đơn': return { bgLight: 'bg-emerald-100 dark:bg-emerald-900/20', textDark: 'text-emerald-600 dark:text-emerald-400', active: 'bg-gradient-to-br from-emerald-400 to-emerald-600', shadow: 'shadow-lg shadow-emerald-500/30' };
    case 'Sức khỏe': return { bgLight: 'bg-rose-100 dark:bg-rose-900/20', textDark: 'text-rose-600 dark:text-rose-400', active: 'bg-gradient-to-br from-rose-400 to-rose-600', shadow: 'shadow-lg shadow-rose-500/30' };
    case 'Giáo dục': return { bgLight: 'bg-sky-100 dark:bg-sky-900/20', textDark: 'text-sky-600 dark:text-sky-400', active: 'bg-gradient-to-br from-sky-400 to-sky-600', shadow: 'shadow-lg shadow-sky-500/30' };
    case 'Lương': case 'Thưởng': case 'Bán đồ': case 'Lãi tiết kiệm': case 'Được tặng': return { bgLight: 'bg-emerald-100 dark:bg-emerald-900/20', textDark: 'text-emerald-600 dark:text-emerald-400', active: 'bg-gradient-to-br from-emerald-400 to-emerald-600', shadow: 'shadow-lg shadow-emerald-500/30' };
    default: return { bgLight: 'bg-slate-100 dark:bg-slate-800', textDark: 'text-slate-600 dark:text-slate-400', active: 'bg-slate-600', shadow: 'shadow-lg shadow-slate-500/30' };
  }
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================
export const App: React.FC = () => {
  // --- UPDATED: LAZY INITIALIZATION FOR DARK MODE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('smartfin_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'analytics'>('home');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'expense' | 'income'>('all');

  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS);
  const [budgetConfig, setBudgetConfig] = useState<{ limit: number }>({ limit: 5000000 });
  const [isLoaded, setIsLoaded] = useState(false); 

  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  
  // Transaction Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [source, setSource] = useState<WalletType>('cash');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  
  // --- CALENDAR STATES ---
  const [selectedDateStr, setSelectedDateStr] = useState(''); 
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const inputRef = useRef<HTMLInputElement>(null);
  
  // Success State for Save Button
  const [isSuccess, setIsSuccess] = useState(false);

  // Local Modal Inputs
  const [tempBalances, setTempBalances] = useState({ cash: '', bank: '', ewallet: '' });
  const [tempBudgetInput, setTempBudgetInput] = useState('');

  // Voice Ref
  const voiceInputRef = useRef<VoiceInputHandle>(null);

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // --- 1. FIREBASE LOAD DATA ---
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "users", USER_ID), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const txs = (data.transactions || []).map((t: any) => ({
          ...t,
          date: t.date?.toDate ? t.date.toDate() : new Date(t.date)
        }));
        setTransactions(txs);
        setWallets(data.wallets || INITIAL_WALLETS);
        setBudgetConfig(data.budgetConfig || { limit: 5000000 });
        if (data.darkMode !== undefined) {
           setDarkMode(data.darkMode);
        }
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. FIREBASE AUTO-SAVE ---
  useEffect(() => {
    if (!isLoaded) return;
    const syncToFirebase = async () => {
      try {
        await setDoc(doc(db, "users", USER_ID), {
          transactions,
          wallets,
          budgetConfig,
          darkMode
        }, { merge: true });
      } catch (error) {
        console.error("Firebase Sync Error:", error);
      }
    };
    const timeoutId = setTimeout(syncToFirebase, 1500);
    return () => clearTimeout(timeoutId);
  }, [transactions, wallets, budgetConfig, darkMode, isLoaded]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartfin_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartfin_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!currentCategories.includes(category)) {
       setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    }
  }, [type]);

  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isBalanceModalOpen) {
      setTempBalances({
        cash: wallets.find(w => w.id === 'cash')?.balance.toString() || '0',
        bank: wallets.find(w => w.id === 'bank')?.balance.toString() || '0',
        ewallet: wallets.find(w => w.id === 'ewallet')?.balance.toString() || '0'
      });
    }
  }, [isBalanceModalOpen, wallets]);

  useEffect(() => {
    if (isBudgetModalOpen) {
      setTempBudgetInput(budgetConfig.limit.toString());
    }
  }, [isBudgetModalOpen, budgetConfig]);

  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const padding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < padding; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [calendarViewDate]);

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDateStr(getDateString(date));
    setIsCalendarOpen(false);
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = { ...newTx, id: Math.random().toString(36).substr(2, 9) };
    setTransactions([transaction, ...transactions]);
    setWallets(prev => prev.map(w => w.id === newTx.source ? { ...w, balance: newTx.type === 'expense' ? w.balance - newTx.amount : w.balance + newTx.amount } : w));
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setTransactions(transactions.filter(t => t.id !== id));
    setWallets(prev => prev.map(w => w.id === tx.source ? { ...w, balance: tx.type === 'expense' ? w.balance + tx.amount : w.balance - tx.amount } : w));
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingId(t.id);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setSource(t.source);
    setNote(t.note);
    setType(t.type);
    setSelectedDateStr(getDateString(t.date));
    setCalendarViewDate(t.date);
    setIsModalOpen(true);
  };

  const handleUpdateBalances = () => {
    const newCash = parseFloat(tempBalances.cash.replace(/\D/g, '')) || 0;
    const newBank = parseFloat(tempBalances.bank.replace(/\D/g, '')) || 0;
    const newEwallet = parseFloat(tempBalances.ewallet.replace(/\D/g, '')) || 0;
    setWallets(prev => prev.map(w => {
      if (w.id === 'cash') return { ...w, balance: newCash };
      if (w.id === 'bank') return { ...w, balance: newBank };
      if (w.id === 'ewallet') return { ...w, balance: newEwallet };
      return w;
    }));
    setIsBalanceModalOpen(false);
  };

  const handleUpdateBudget = () => {
    const limit = parseFloat(tempBudgetInput.replace(/\D/g, '')) || 0;
    setBudgetConfig({ limit });
    setIsBudgetModalOpen(false);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setAmount('');
    setNote('');
    const today = new Date();
    setSelectedDateStr(getDateString(today));
    setCalendarViewDate(today);
    setIsModalOpen(true);
  };

  const handleVoiceSuccess = (data: { amount: number; category: string; note: string; type: 'expense' | 'income'; walletType: string }) => {
    setAmount(data.amount > 0 ? data.amount.toString() : '');
    setType(data.type);
    let targetSource: WalletType = 'cash';
    if (data.walletType === 'bank') targetSource = 'bank';
    if (data.walletType === 'ewallet') targetSource = 'ewallet';
    setSource(targetSource);
    const validCategories = data.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (validCategories.includes(data.category)) {
      setCategory(data.category);
    } else {
      setCategory('Khác'); 
    }
    setNote(data.note);
  };

  const handleVoiceError = (message: string) => {
    alert(message);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalAmount = parseFloat(amount);
    if (!finalAmount || finalAmount === 0) return;

    const now = new Date();
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const txnDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes());

    if (editingId) {
      const oldTx = transactions.find(t => t.id === editingId);
      if (oldTx) {
        let revertWallets = wallets.map(w => {
           if (w.id === oldTx.source) {
              return { 
                ...w, 
                balance: oldTx.type === 'expense' ? w.balance + oldTx.amount : w.balance - oldTx.amount 
              };
           }
           return w;
        });
        const updatedWallets = revertWallets.map(w => {
           if (w.id === source) {
              return { 
                 ...w, 
                 balance: type === 'expense' ? w.balance - finalAmount : w.balance + finalAmount 
              };
           }
           return w;
        });
        setWallets(updatedWallets);
        setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, amount: finalAmount, category, source, note, type, date: txnDate } : t));
      }
      setEditingId(null);
    } else {
      handleAddTransaction({ amount: finalAmount, category, source, note, type, date: txnDate });
    }

    if (navigator.vibrate) navigator.vibrate(50);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setAmount('');
      setNote('');
      setIsModalOpen(false);
    }, 500);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.toLowerCase().includes('k')) value = value.replace(/k/i, '000');
    const numericValue = value.replace(/\D/g, '');
    setAmount(numericValue);
  };

  const handleBalanceInputChange = (type: 'cash' | 'bank' | 'ewallet', value: string) => {
     let raw = value;
     if (raw.toLowerCase().includes('k')) raw = raw.replace(/k/i, '000');
     const numeric = raw.replace(/\D/g, '');
     setTempBalances(prev => ({ ...prev, [type]: numeric }));
  };

  const handleBudgetInputChange = (value: string) => {
    let raw = value;
    if (raw.toLowerCase().includes('k')) raw = raw.replace(/k/i, '000');
    const numeric = raw.replace(/\D/g, '');
    setTempBudgetInput(numeric);
  };

  const formatInputDisplay = (val: string) => {
    if (!val) return '';
    const num = parseInt(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  };
  
  const budgetValue = parseFloat(tempBudgetInput.replace(/\D/g, '')) || 0;
  const weeklyHint = budgetValue > 0 ? budgetValue / 4 : 0;

  const handleViewAll = () => { setHistoryFilter('all'); setActiveTab('history'); };
  const handleViewIncome = () => { setHistoryFilter('income'); setActiveTab('history'); };
  const handleViewExpense = () => { setHistoryFilter('expense'); setActiveTab('history'); };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 font-sans selection:bg-blue-500/30">
      {/* BACKGROUND BLOBS */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* --- APPLE-STYLE TYPOGRAPHY HEADER --- */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center relative z-20">
          <div className="flex items-center">
            <span className="text-3xl font-black tracking-wide text-slate-800 dark:text-white">Smart</span>
            <span className="text-3xl font-black tracking-wide bg-gradient-to-r from-indigo-500 to-blue-400 bg-clip-text text-transparent">Fin</span>
          </div>
          
          <button 
            type="button" 
            onClick={() => setDarkMode(!darkMode)} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-white active:scale-95"
          >
            {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-slate-600" />}
          </button>
        </header>

        <main className="flex-1 px-4 overflow-y-auto no-scrollbar relative z-10">
          {activeTab === 'home' && (
            <HomeTab 
              wallets={wallets} 
              transactions={transactions} 
              onDeleteTransaction={handleDeleteTransaction} 
              onEditTransaction={handleEditTransaction}
              budgetConfig={budgetConfig} 
              onViewAll={handleViewAll} 
              onViewIncome={handleViewIncome} 
              onViewExpense={handleViewExpense} 
              onNavigateToAnalytics={() => setActiveTab('analytics')}
              onOpenTransactionModal={handleOpenModal} 
              onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab 
              transactions={transactions} 
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
              currentFilter={historyFilter} 
              onFilterChange={setHistoryFilter}
              budgetConfig={budgetConfig} 
            />
          )}
          {activeTab === 'analytics' && <AnalyticsTab transactions={transactions} budgetConfig={budgetConfig} />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[60] p-4">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[32px] h-20 shadow-2xl flex items-center justify-around px-2 relative">
            <button type="button" onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'home' ? 'bg-blue-600 text-white -translate-y-6 shadow-lg shadow-blue-600/40' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              <Home size={24} /><span className="text-[10px] mt-1 font-medium">{activeTab === 'home' ? '' : 'Tổng quan'}</span>
            </button>
            <button type="button" onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'history' ? 'bg-blue-600 text-white -translate-y-6 shadow-lg shadow-blue-600/40' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              <History size={24} /><span className="text-[10px] mt-1 font-medium">{activeTab === 'history' ? '' : 'Lịch sử'}</span>
            </button>
            <button type="button" onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'analytics' ? 'bg-blue-600 text-white -translate-y-6 shadow-lg shadow-blue-600/40' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              <PieChartIcon size={24} /><span className="text-[10px] mt-1 font-medium">{activeTab === 'analytics' ? '' : 'Phân tích'}</span>
            </button>
          </div>
        </nav>

        {/* MODALS */}
        {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-100 dark:bg-slate-900 flex flex-col animate-slide-up">
            <div className="flex justify-between items-center p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingId ? 'Chỉnh sửa giao dịch' : 'Giao dịch mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors cursor-pointer">
                <X size={20} className="text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                  <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-700 shadow-md text-red-500' : 'text-slate-500'}`}>Chi tiêu</button>
                  <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'income' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-500' : 'text-slate-500'}`}>Thu nhập</button>
                  <button type="button" onClick={() => voiceInputRef.current?.start()} className="w-14 flex items-center justify-center rounded-xl text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"><Mic size={20} /></button>
                </div>
                <div>
                  <div className="relative">
                    <input ref={inputRef} type="text" inputMode="text" value={formatInputDisplay(amount)} onChange={handleAmountChange} placeholder="0" className="w-full text-5xl font-bold bg-transparent py-4 text-center focus:outline-none text-slate-800 dark:text-white caret-blue-500 placeholder-slate-300 dark:placeholder-slate-700" />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 font-bold text-lg">VNĐ</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Danh mục</label>
                  <div className="grid grid-cols-4 gap-3">
                    {currentCategories.map(c => {
                      const isSelected = category === c;
                      const theme = getCategoryTheme(c);
                      return (
                        <button 
                          key={c} 
                          onClick={() => setCategory(c)} 
                          className={`
                            flex flex-col items-center justify-center aspect-square rounded-2xl transition-all duration-300 border
                            ${isSelected 
                                ? `${theme.active} ${theme.shadow} border-transparent text-white scale-105 shadow-xl` 
                                : `bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700`
                            }
                          `}
                        >
                          <div className={`mb-1 ${isSelected ? 'scale-110' : ''}`}>
                             {getCategoryIcon(c, isSelected)}
                          </div>
                          <span className="text-[10px] font-semibold text-center leading-tight">
                             {c}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Nguồn tiền</label>
                  <div className="grid grid-cols-3 gap-3">
                    {wallets.map(w => {
                      const theme = getWalletTheme(w.id);
                      const isSelected = source === w.id;
                      return (
                        <button 
                          key={w.id} 
                          onClick={() => setSource(w.id)} 
                          className={`
                            flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 
                            ${isSelected 
                                ? `${theme.active} border-transparent scale-[1.02] shadow-lg` 
                                : `bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700`
                            }
                          `}
                        >
                          <div className={`mb-1 ${isSelected ? 'scale-110' : ''}`}>
                             {getWalletIcon(w.id)}
                          </div>
                          <span className="text-xs font-medium text-center">{w.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ghi chú</label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'income' ? 'Ví dụ: Lương tháng 2' : 'Chi tiêu cho việc gì?'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Thời gian</label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                               <CalendarIcon size={18} />
                            </div>
                            <span className="font-bold text-base">
                               {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Hôm nay'}
                            </span>
                         </div>
                         <div className={`transition-transform duration-300 ${isCalendarOpen ? 'rotate-180' : ''}`}>
                            <ChevronDown size={20} className="text-slate-400" />
                         </div>
                      </button>
                      {isCalendarOpen && (
                        <div className="mt-2 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[24px] p-4 shadow-xl animate-slide-down overflow-hidden">
                           <div className="flex items-center justify-between mb-4">
                              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                 <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
                              </button>
                              <span className="font-bold text-slate-800 dark:text-white capitalize">
                                 Tháng {calendarViewDate.getMonth() + 1}, {calendarViewDate.getFullYear()}
                              </span>
                              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                 <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
                              </button>
                           </div>
                           <div className="grid grid-cols-7 mb-2 text-center">
                              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                              ))}
                           </div>
                           <div className="grid grid-cols-7 gap-1">
                              {calendarDays.map((date, idx) => {
                                 if (!date) return <div key={idx} className="h-10" />;
                                 const isSelected = getDateString(date) === selectedDateStr;
                                 const isToday = getDateString(date) === getDateString(new Date());
                                 return (
                                   <button 
                                      key={idx}
                                      onClick={() => handleSelectDate(date)}
                                      className={`
                                        h-10 rounded-2xl text-sm font-semibold flex flex-col items-center justify-center transition-all duration-200
                                        ${isSelected 
                                          ? 'bg-gradient-to-tr from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                        }
                                        ${isToday && !isSelected ? 'text-blue-500 dark:text-blue-400 font-bold' : ''}
                                      `}
                                   >
                                      {date.getDate()}
                                      {isToday && !isSelected && <div className="w-1 h-1 bg-current rounded-full mt-0.5" />}
                                   </button>
                                 );
                              })}
                           </div>
                        </div>
                      )}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-6 left-4 right-4 z-50">
              <button 
                onClick={(e) => handleSubmit(e)} 
                disabled={!amount || parseFloat(amount) === 0 || isSuccess}
                className={`
                  w-full h-14 rounded-2xl font-bold text-lg text-white shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer z-50 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isSuccess 
                    ? 'bg-emerald-500 shadow-emerald-500/40 scale-105' 
                    : (type === 'expense' ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/30' : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30')
                  }
                `}
              >
                {isSuccess ? (
                  <><Check size={24} className="animate-bounce" /><span>Đã lưu</span></>
                ) : (
                  editingId ? 'Cập Nhật Giao Dịch' : (type === 'expense' ? 'Lưu Chi Tiêu' : 'Lưu Thu Nhập')
                )}
              </button>
            </div>
        </div>
      )}

      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6 border border-white/20 dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Edit2 size={20} className="text-blue-500" />Điều chỉnh số dư</h3>
              <button onClick={() => setIsBalanceModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><WalletIcon size={12} /> Tiền mặt</label>
                <input type="text" inputMode="numeric" value={formatInputDisplay(tempBalances.cash)} onChange={(e) => handleBalanceInputChange('cash', e.target.value)} className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 text-lg font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1"><CreditCard size={12} /> Ngân hàng</label>
                <input type="text" inputMode="numeric" value={formatInputDisplay(tempBalances.bank)} onChange={(e) => handleBalanceInputChange('bank', e.target.value)} className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 text-lg font-bold text-blue-800 dark:text-blue-300 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Smartphone size={12} /> Ví điện tử</label>
                <input type="text" inputMode="numeric" value={formatInputDisplay(tempBalances.ewallet)} onChange={(e) => handleBalanceInputChange('ewallet', e.target.value)} className="w-full bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-2xl px-4 py-3 text-lg font-bold text-pink-800 dark:text-pink-300 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleUpdateBalances} className="w-full h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"><Save size={18} /> Lưu thay đổi</button>
          </div>
        </div>
      )}

      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6 border border-white/20 dark:border-white/10">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Target size={20} className="text-blue-500" />Cài đặt Ngân sách</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="space-y-8 mb-8">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ngân sách Tháng {new Date().getMonth() + 1}</label>
                <input type="text" inputMode="numeric" value={formatInputDisplay(tempBudgetInput)} onChange={(e) => handleBudgetInputChange(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl px-4 py-4 text-2xl font-bold text-slate-800 dark:text-white text-center" placeholder="0" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tháng</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(budgetValue, true)}</span>
                </div>
                <div className="text-slate-300 dark:text-slate-600 font-light text-xl flex items-center justify-center">÷ 4</div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase mb-1">Tuần</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrencyFull(weeklyHint)}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleUpdateBudget} 
              className="w-full h-12 bg-gradient-to-r from-teal-400 to-blue-500 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <Save size={18} /> Lưu cài đặt
            </button>
           </div>
        </div>
      )}

      <button type="button" onClick={() => handleOpenModal()} className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl flex items-center justify-center z-[80] active:scale-90 transition-transform cursor-pointer"><Plus size={24} /></button>
      <VoiceInput ref={voiceInputRef} onSuccess={handleVoiceSuccess} onError={handleVoiceError} />

      <style>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: top center; }
        @keyframes slideDown { from { transform: scaleY(0.95); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
      `}</style>
      </div>
    </div>
  );
}
export default App;
