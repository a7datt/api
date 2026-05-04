import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  password: string;
  apiKey: string;
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  samWalletId: string;
  provider: string;
  balance: number;
  currency: string;
  linkedAt: Date;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  createdAt: Date;
}

export interface QRSession {
  id: string;
  userId: string;
  samSessionId: string;
  qrPayload: string;
  status: string;
  samWalletId?: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory store
export const db = {
  users: new Map<string, User>(),
  wallets: new Map<string, Wallet>(),
  transactions: new Map<string, Transaction>(),
  sessions: new Map<string, QRSession>(),

  // Users
  createUser(data: { email: string; password: string }): User {
    const user: User = {
      id: randomUUID(),
      email: data.email,
      password: data.password,
      apiKey: randomUUID(),
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  },

  getUserById(id: string) {
    return this.users.get(id) ?? null;
  },

  getUserByEmail(email: string) {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  },

  getUserByApiKey(apiKey: string) {
    for (const u of this.users.values()) {
      if (u.apiKey === apiKey) return u;
    }
    return null;
  },

  // Wallets
  createWallet(data: { userId: string; samWalletId: string; balance: number; currency: string }): Wallet {
    const wallet: Wallet = {
      id: randomUUID(),
      userId: data.userId,
      samWalletId: data.samWalletId,
      provider: 'shamcash',
      balance: data.balance,
      currency: data.currency,
      linkedAt: new Date(),
      isActive: true
    };
    this.wallets.set(wallet.id, wallet);
    return wallet;
  },

  getWalletById(id: string) {
    return this.wallets.get(id) ?? null;
  },

  getWalletBySamId(samWalletId: string) {
    for (const w of this.wallets.values()) {
      if (w.samWalletId === samWalletId) return w;
    }
    return null;
  },

  getWalletsByUser(userId: string) {
    return [...this.wallets.values()]
      .filter(w => w.userId === userId)
      .sort((a, b) => b.linkedAt.getTime() - a.linkedAt.getTime());
  },

  updateWallet(id: string, data: Partial<Wallet>) {
    const wallet = this.wallets.get(id);
    if (!wallet) return null;
    Object.assign(wallet, data);
    return wallet;
  },

  // Transactions
  addTransactions(walletId: string, txs: Omit<Transaction, 'id' | 'walletId' | 'createdAt'>[]) {
    for (const t of txs) {
      const tx: Transaction = { id: randomUUID(), walletId, createdAt: new Date(), ...t };
      this.transactions.set(tx.id, tx);
    }
  },

  getTransactionsByWallet(walletId: string) {
    return [...this.transactions.values()]
      .filter(t => t.walletId === walletId)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 50);
  },

  // QR Sessions
  createSession(data: { userId: string; samSessionId: string; qrPayload: string; status: string; expiresAt: Date }): QRSession {
    const session: QRSession = { id: randomUUID(), createdAt: new Date(), ...data };
    this.sessions.set(session.id, session);
    return session;
  },

  getSessionById(id: string) {
    return this.sessions.get(id) ?? null;
  },

  updateSession(id: string, data: Partial<QRSession>) {
    const session = this.sessions.get(id);
    if (!session) return null;
    Object.assign(session, data);
    return session;
  }
};
