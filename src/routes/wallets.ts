import { Router } from 'express';
import { db } from '../lib/store.js';
import { authMiddleware } from '../middleware/auth.js';
import * as samapi from '../services/samapi.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const wallets = db.getWalletsByUser(req.user.id);
  res.json({ success: true, wallets });
});

router.get('/:id/balance', authMiddleware, async (req, res) => {
  try {
    const wallet = db.getWalletById(req.params.id);
    if (!wallet || wallet.userId !== req.user.id)
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'المحفظة غير موجودة' });

    const data = await samapi.getBalance(wallet.samWalletId);
    db.updateWallet(wallet.id, { balance: data.balance, currency: data.currency || 'SYP' });

    res.json({ success: true, balance: data.balance, currency: data.currency || 'SYP' });
  } catch (e) {
    console.error('Balance error:', e);
    res.status(502).json({ success: false, error: 'SAM_API_ERROR' });
  }
});

router.get('/:id/transactions', authMiddleware, async (req, res) => {
  try {
    const wallet = db.getWalletById(req.params.id);
    if (!wallet || wallet.userId !== req.user.id)
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    try {
      const txs = await samapi.getTransactions(wallet.samWalletId);
      if (Array.isArray(txs)) {
        db.addTransactions(wallet.id, txs.map((t: any) => ({
          type: t.type, amount: t.amount,
          currency: t.currency || 'SYP',
          description: t.description || '',
          date: new Date(t.date)
        })));
      }
    } catch (e) { console.error('Transactions API error:', e); }

    const transactions = db.getTransactionsByWallet(wallet.id);
    res.json({ success: true, transactions });
  } catch (e) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
