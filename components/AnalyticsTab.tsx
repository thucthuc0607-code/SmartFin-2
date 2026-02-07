import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, CartesianGrid, YAxis } from 'recharts';
import { 
  TrendingUp, TrendingDown, ShieldCheck, PieChart as PieChartIcon, 
  Loader2, BarChart3, ChevronUp, ChevronDown, 
  Zap, Trophy, AlertTriangle, CalendarClock, Target
} from 'lucide-react';

interface AnalyticsTabProps {
  transactions: Transaction[];
  budgetConfig: { limit: number };
}

// --- CONSTANTS ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];
type ViewMode = 'week' | 'month';

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount.toString();
};

const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const formatYAxis = (num: number) => {
  if (num === 0) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toString();
};

const formatCompactMoney = (number: number) => {
  if (number >= 1000000000) return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (number >= 1000) return (number / 1000).toFixed(0) + 'k';
  if (number === 0) return '0';
  return new Intl.NumberFormat('vi-VN').format(number);
};

// Date Helpers
const normalizeDate = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getStartOfWeek = (date: Date) => {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; 
  d.setDate(d.getDate() - diff);
  return d;
};

const getEndOfWeek = (date: Date) => {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getStartOfMonth = (date: Date) => {
  const d = normalizeDate(date);
  d.setDate(1);
  return d;
};

const getEndOfMonth = (date: Date) => {
  const d = getStartOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

// --- COMPONENT ---
const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ transactions, budgetConfig }) => {
  // 1. STATE
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isPieExpanded, setIsPieExpanded] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // 2. EFFECTS
  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActiveIndex(null); 
  }, [viewMode]);

  // 3. ADVANCED DATA LOGIC (ENGINE)
  const insights = useMemo(() => {
    const now = new Date();
    
    // A. Define Time Boundaries
    let startOfPeriod: Date, endOfPeriod: Date;
    let startOfLastPeriod: Date, endOfLastPeriod: Date;
    
    // Time Progress Vars
    let daysPassed = 0;
    let totalDays = 0;

    if (viewMode === 'week') {
      startOfPeriod = getStartOfWeek(now);
      endOfPeriod = getEndOfWeek(now);
      
      // Calc Previous Week
      startOfLastPeriod = new Date(startOfPeriod);
      startOfLastPeriod.setDate(startOfLastPeriod.getDate() - 7);
      endOfLastPeriod = new Date(endOfPeriod);
      endOfLastPeriod.setDate(endOfLastPeriod.getDate() - 7);

      totalDays = 7;
      daysPassed = now.getDay() === 0 ? 7 : now.getDay(); // 1 (Mon) -> 7 (Sun)
    } else {
      startOfPeriod = getStartOfMonth(now);
      endOfPeriod = getEndOfMonth(now);
      
      // Calc Previous Month
      startOfLastPeriod = new Date(startOfPeriod);
      startOfLastPeriod.setMonth(startOfLastPeriod.getMonth() - 1);
      endOfLastPeriod = getEndOfMonth(startOfLastPeriod);

      totalDays = endOfPeriod.getDate();
      daysPassed = now.getDate();
    }
    
    const daysRemaining = Math.max(0, totalDays - daysPassed);

    // B. Get Transactions & Filter
    // IMPORTANT: 'Week' filters out 'Hóa đơn'. 'Month' keeps it.
    const filterFn = (t: Transaction, start: Date, end: Date) => {
        const inDate = t.type === 'expense' && t.date >= start && t.date <= end;
        if (!inDate) return false;
        if (viewMode === 'week' && t.category === 'Hóa đơn') return false;
        return true;
    };

    const currentTxs = transactions.filter(t => filterFn(t, startOfPeriod, endOfPeriod));
    const lastTxs = transactions.filter(t => filterFn(t, startOfLastPeriod, endOfLastPeriod));

    // C. Calculate Totals & Diff (Comparison Card)
    const currentTotal = currentTxs.reduce((sum, t) => sum + t.amount, 0);
    const lastTotal = lastTxs.reduce((sum, t) => sum + t.amount, 0);
    const diffAmount = currentTotal - lastTotal;
    const isIncrease = diffAmount > 0;
    
    let percentChange = 0;
    if (lastTotal > 0) percentChange = Math.round((Math.abs(diffAmount) / lastTotal) * 100);
    else if (currentTotal > 0) percentChange = 100;

    // D. Find Top Category (The Reason)
    const catMap: Record<string, number> = {};
    currentTxs.forEach(t => catMap[t.category] = (catMap[t.category] || 0) + t.amount);
    
    const pieDataClean = Object.entries(catMap)
      .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    const topCategoryName = pieDataClean[0]?.name || 'N/A';

    // E. Budget & Progress Logic
    const budgetLimit = viewMode === 'week' ? budgetConfig.limit / 4 : budgetConfig.limit;
    const usagePercent = budgetLimit > 0 ? (currentTotal / budgetLimit) * 100 : 0;
    const remainingBudget = budgetLimit - currentTotal;
    
    // F. SMART FORECAST ENGINE (NEW LOGIC)
    let forecast = {
       title: "Dự báo chi tiêu",
       message: "Đang tính toán...",
       status: "neutral" as 'warning' | 'good' | 'neutral',
       icon: CalendarClock
    };

    // Calculate Burn Rate
    const timePercent = (daysPassed / totalDays) * 100;
    const burnRateRatio = timePercent > 0 ? usagePercent / timePercent : 0; 
    // Ratio > 1 means spending faster than time passes.

    if (usagePercent >= 100) {
       forecast = {
          title: "Vượt ngân sách!",
          message: `Bạn đã lố ${formatCompactMoney(Math.abs(remainingBudget))}. Hãy dừng mọi khoản chi không cần thiết ngay lập tức!`,
          status: 'warning',
          icon: AlertTriangle
       };
    } else if (burnRateRatio > 1.3 && remainingBudget > 0) {
       // Scenario 1: Burning too fast (High Burn Rate)
       const estimatedRunoutDay = Math.floor(100 / (usagePercent / daysPassed));
       const dayName = viewMode === 'week' ? `thứ ${estimatedRunoutDay + 1}` : `ngày ${estimatedRunoutDay}`;
       
       forecast = {
          title: "Cảnh báo tốc độ!",
          message: `Bạn đang chi gấp ${burnRateRatio.toFixed(1)}x mức cho phép. Nếu giữ đà này, bạn sẽ "cháy túi" vào ${dayName}.`,
          status: 'warning',
          icon: Zap
       };
    } else if (viewMode === 'week' && (now.getDay() === 5 || now.getDay() === 6) && usagePercent > 70) {
       // Scenario 2: Weekend Warning (Friday/Saturday)
       forecast = {
          title: "Cẩn thận cuối tuần!",
          message: `Cuối tuần thường chi nhiều. Hãy giữ lại ít nhất ${formatCompactMoney(remainingBudget * 0.4)} cho việc ăn uống nhé.`,
          status: 'neutral',
          icon: CalendarClock
       };
    } else if (burnRateRatio < 0.85 && usagePercent < 50) {
       // Scenario 3: Saving Mode (Good)
       const dailyAvg = currentTotal / daysPassed;
       const projectedTotal = dailyAvg * totalDays;
       const projectedSurplus = budgetLimit - projectedTotal;

       forecast = {
          title: "Kiểm soát rất tốt!",
          message: `Bạn đang tiết kiệm. Cứ đà này cuối ${viewMode === 'week' ? 'tuần' : 'tháng'} sẽ dư ra khoảng ${formatCompactMoney(projectedSurplus)}.`,
          status: 'good',
          icon: Trophy
       };
    } else {
       // Scenario 4: Actionable Daily Cap (Default)
       const safeDaily = Math.max(0, remainingBudget / daysRemaining);
       forecast = {
          title: "Mục tiêu hàng ngày",
          message: `Để an toàn, trong ${daysRemaining} ngày tới, mỗi ngày chỉ nên tiêu tối đa ${formatCompactMoney(safeDaily)}.`,
          status: 'neutral',
          icon: Target
       };
    }

    // G. Construct Bar Data
    let barDataClean: { name: string; amount: number }[] = [];
    if (viewMode === 'week') {
      const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const dailyMap = days.map(d => ({ name: d, amount: 0 }));
      currentTxs.forEach(t => {
           const dayIndex = t.date.getDay() === 0 ? 6 : t.date.getDay() - 1;
           if (dailyMap[dayIndex]) dailyMap[dayIndex].amount += t.amount;
      });
      barDataClean = dailyMap;
    } else {
      const daysInMonth = endOfPeriod.getDate();
      const dailyMap = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i+1}`, amount: 0 }));
      currentTxs.forEach(t => {
        const dayIndex = t.date.getDate() - 1;
        if(dailyMap[dayIndex]) dailyMap[dayIndex].amount += t.amount;
      });
      barDataClean = dailyMap;
    }

    return {
      pieData: pieDataClean,
      barData: barDataClean,
      totalExpense: currentTotal,
      comparison: {
        isIncrease,
        percent: percentChange,
        diffAmount: Math.abs(diffAmount),
        reason: topCategoryName !== 'N/A' ? `Do ${topCategoryName}` : 'Chưa có dữ liệu'
      },
      budget: {
        usagePercent: Math.round(usagePercent),
        // Simplistic text for the budget card, detailed logic in forecast card
        statusText: usagePercent > 100 ? "Vượt mức" : `${Math.round(usagePercent)}%`
      },
      forecast
    };
  }, [transactions, viewMode, budgetConfig]); 

  // Calculate Max Bar Value for Smart Highlighting
  const maxBarValue = useMemo(() => {
    if (!insights.barData.length) return 0;
    return Math.max(...insights.barData.map(d => d.amount));
  }, [insights.barData]);

  // --- RENDER ---
  return (
    <div className="space-y-5 pb-24 animate-slide-up">
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-layer, .recharts-cartesian-grid, path, rect, g {
            outline: none !important; border: none !important;
        }
      `}</style>
      
      {/* 1. HEADER (VIEW MODE SWITCHER) */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl mx-4">
        <button
            onClick={() => setViewMode('week')}
            className={`
              flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300
              ${viewMode === 'week' 
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-[1.02]' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }
            `}
        >
            Tuần
        </button>
        <button
            onClick={() => setViewMode('month')}
            className={`
              flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300
              ${viewMode === 'month' 
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-[1.02]' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }
            `}
        >
            Tháng
        </button>
      </div>

      {/* 2. SUMMARY GRID */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {/* CARD 1: COMPARISON (Preserved Logic) */}
        <div className={`
            backdrop-blur-xl border p-4 rounded-3xl flex flex-col justify-between h-[120px] shadow-sm relative overflow-hidden group
            ${insights.comparison.isIncrease 
                ? 'bg-rose-50/70 dark:bg-rose-900/10 border-rose-200/50' 
                : 'bg-emerald-50/70 dark:bg-emerald-900/10 border-emerald-200/50'
            }
        `}>
            <div className={`flex items-center gap-1.5 ${insights.comparison.isIncrease ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {insights.comparison.isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    Vs {viewMode === 'week' ? 'Tuần trước' : 'Tháng trước'}
                </span>
            </div>
            <div className="flex flex-col">
               <span className={`text-xl font-black tracking-tight ${insights.comparison.isIncrease ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                   {insights.comparison.isIncrease ? 'Tăng' : 'Giảm'} {insights.comparison.percent}%
               </span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                <span className={`font-bold ${insights.comparison.isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>
                   {insights.comparison.isIncrease ? '+' : '-'}{formatCompactMoney(insights.comparison.diffAmount)}
                </span>
                <span className="mx-1">•</span>
                <span>{insights.comparison.reason}</span>
            </div>
        </div>

        {/* CARD 2: BUDGET STATUS (Simplified) */}
        <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-white/5 p-4 rounded-3xl flex flex-col justify-between h-[120px] shadow-sm relative">
            <div className="flex items-center gap-1.5 text-blue-500">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Đã sử dụng</span>
            </div>
            <div className="flex flex-col">
               <span className={`text-2xl font-black tracking-tight ${insights.budget.usagePercent > 100 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                   {insights.budget.statusText}
               </span>
            </div>
             <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                   <div 
                     className={`h-full rounded-full ${insights.budget.usagePercent > 85 ? 'bg-red-500' : 'bg-blue-500'}`} 
                     style={{ width: `${Math.min(insights.budget.usagePercent, 100)}%` }}
                   ></div>
            </div>
        </div>
      </div>

      {/* 3. PIE CHART SECTION */}
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-5 rounded-[32px] shadow-xl shadow-indigo-500/5">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Cơ cấu chi tiêu</h3>
            <PieChartIcon size={16} className="text-purple-500" />
        </div>
        
        {/* FIX WIDTH -1 */}
        <div className="w-full h-[200px] min-h-[200px] relative block">
          {isChartReady ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    cornerRadius={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {insights.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrencyFull(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'white', fontSize: '12px', padding: '8px 12px' }}
                    itemStyle={{ color: 'white', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Tổng chi</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                  {formatCurrency(insights.totalExpense)}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse">
               <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {/* PIE LIST TOGGLE */}
        {insights.pieData.length > 0 && (
          <div className="mt-1 flex flex-col items-center">
             <button 
               onClick={() => setIsPieExpanded(!isPieExpanded)}
               className="px-4 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-all active:scale-95 flex items-center gap-1"
             >
               {isPieExpanded ? <>Thu gọn</> : <>Chi tiết ({insights.pieData.length})</>}
               {isPieExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
             </button>
             
             <div className={`w-full transition-all duration-500 ease-in-out overflow-hidden ${isPieExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="space-y-1.5">
                  {insights.pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between p-2 hover:bg-white/30 dark:hover:bg-slate-700/30 rounded-xl transition-colors cursor-default border border-transparent hover:border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{formatCurrency(entry.value)}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md min-w-[30px] text-center">
                            {insights.totalExpense > 0 ? ((entry.value / insights.totalExpense) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* 4. BAR CHART SECTION (UPDATED UI WITH SMART HIGHLIGHTING) */}
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-5 rounded-[32px] shadow-xl shadow-indigo-500/5 min-h-[280px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">
             Biểu đồ {viewMode === 'week' ? 'tuần' : 'tháng'}
          </h3>
          <div className="p-1.5 bg-white/50 dark:bg-slate-700/50 rounded-lg">
             <BarChart3 size={14} className="text-blue-500" />
          </div>
        </div>

        {/* FIX WIDTH -1 */}
        <div className="w-full h-[220px] min-h-[220px] relative block">
           {isChartReady && insights.barData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={insights.barData} 
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                    <defs>
                        {/* Highlights Gradient: Pink -> Orange */}
                        <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                        </linearGradient>

                        {/* Soft Sky Gradient: Sky-300 -> Blue-400 */}
                        <linearGradient id="softSkyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7DD3FC" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={1}/>
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dy={10}
                        interval={viewMode === 'month' ? 4 : 0}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tickMargin={0} 
                        width={65}
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        tickFormatter={formatYAxis} 
                    />
                    <Tooltip 
                        trigger="click" 
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const value = payload[0].value as number;
                                if (value === 0) return null;
                                return (
                                    <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl shadow-xl border border-white/10 min-w-[60px] text-center animate-fade-in">
                                        <p className="text-xs font-bold">{formatCurrency(value)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    {/* SMART BAR FILL LOGIC */}
                    <Bar 
                        dataKey="amount" 
                        radius={viewMode === 'week' ? [8, 8, 0, 0] : [4, 4, 0, 0]} 
                        barSize={viewMode === 'month' ? 6 : 24}
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-out"
                        onClick={(_, index) => setActiveIndex(prev => (prev === index ? null : index))}
                    >
                        {insights.barData.map((entry, index) => (
                          <Cell 
                             key={`cell-${index}`} 
                             // Logic: If current value is Max value -> Highlight, else -> Soft Sky Gradient
                             fill={entry.amount === maxBarValue && maxBarValue > 0 ? "url(#highlightGradient)" : "url(#softSkyGradient)"}
                             fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                             cursor="pointer"
                             className="transition-all duration-300"
                          />
                        ))}
                    </Bar>
                </BarChart>
             </ResponsiveContainer>
           ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                  {!isChartReady ? <Loader2 size={24} className="animate-spin text-blue-500" /> : "Chưa có dữ liệu"}
              </div>
           )}
        </div>
      </div>

      {/* 5. SMART FORECAST CARD (NEW UPGRADE) */}
      <div className={`
         relative overflow-hidden rounded-[32px] p-6 shadow-xl transition-all duration-500
         ${insights.forecast.status === 'warning' 
            ? 'bg-gradient-to-br from-rose-500 to-orange-600 shadow-rose-500/30' 
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-indigo-500/30'}
      `}>
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                      <insights.forecast.icon size={20} className="text-white drop-shadow-md" />
                  </div>
                  <h4 className="font-bold text-lg text-white tracking-tight leading-none">
                      {insights.forecast.title}
                  </h4>
              </div>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                  {insights.forecast.message}
              </p>
          </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;