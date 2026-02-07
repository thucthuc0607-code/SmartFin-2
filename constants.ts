import { Transaction, Wallet } from './types';

export const INITIAL_WALLETS: Wallet[] = [
  { id: 'cash', name: 'Tiền mặt', balance: 1500000, icon: 'Wallet', color: 'bg-emerald-500' },
  { id: 'bank', name: 'Ngân hàng', balance: 12500000, icon: 'CreditCard', color: 'bg-blue-600' },
  { id: 'ewallet', name: 'Ví điện tử', balance: 450000, icon: 'Smartphone', color: 'bg-pink-500' },
];

// Generate some dates for the current month
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: 55000, category: 'Ăn uống', source: 'cash', date: today, note: 'Phở bò sáng', type: 'expense' },
  { id: '2', amount: 30000, category: 'Di chuyển', source: 'ewallet', date: today, note: 'Grab đi làm', type: 'expense' },
  { id: '3', amount: 5000000, category: 'Lương', source: 'bank', date: yesterday, note: 'Tạm ứng lương', type: 'income' },
  { id: '4', amount: 120000, category: 'Mua sắm', source: 'bank', date: yesterday, note: 'Sách Tiki', type: 'expense' },
  { id: '5', amount: 45000, category: 'Ăn uống', source: 'cash', date: twoDaysAgo, note: 'Cà phê', type: 'expense' },
  { id: '6', amount: 200000, category: 'Giải trí', source: 'ewallet', date: lastWeek, note: 'Vé xem phim', type: 'expense' },
  { id: '7', amount: 15000, category: 'Ăn uống', source: 'cash', date: lastWeek, note: 'Nước mía', type: 'expense' },
];

export const EXPENSE_CATEGORIES = [
  'Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Hóa đơn', 'Sức khỏe', 'Giáo dục', 'Khác'
];

export const INCOME_CATEGORIES = [
  'Lương', 'Thưởng', 'Bán đồ', 'Lãi tiết kiệm', 'Được tặng', 'Khác'
];

export const NOTE_SUGGESTIONS: Record<string, string[]> = {
  // Only keep suggestions for Expense categories
  'Ăn uống': ['Ăn sáng', 'Ăn trưa', 'Ăn tối', 'Cafe', 'Nhậu', 'Trà sữa'],
  'Di chuyển': ['Xăng xe', 'Grab/Be', 'Gửi xe', 'Vé xe', 'Sửa xe'],
  'Mua sắm': ['Quần áo', 'Mỹ phẩm', 'Đồ gia dụng', 'Siêu thị', 'Tiki/Shopee'],
  'Giải trí': ['Xem phim', 'Netflix', 'Game', 'Du lịch'],
  'Hóa đơn': ['Tiền điện', 'Tiền nước', 'Internet', 'Điện thoại'],
  'Sức khỏe': ['Thuốc', 'Khám bệnh', 'Gym', 'Yoga'],
  // Cleaned up Income suggestions as requested
  'Lương': [],
  'Thưởng': [],
  'Bán đồ': [],
  'Khác': [] 
};

export const CATEGORIES = EXPENSE_CATEGORIES; // Keep for backward compatibility if needed