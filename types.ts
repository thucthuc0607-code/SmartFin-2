export type WalletType = 'cash' | 'bank' | 'ewallet';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  source: WalletType;
  date: Date;
  note: string;
  type: 'expense' | 'income';
}

export interface Wallet {
  id: WalletType;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

export interface Goal {
  name: string;
  targetAmount: number;
  savedAmount: number;
}