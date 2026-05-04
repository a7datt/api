import { Router } from 'express';
import { db } from '../lib/store.js';
import { authMiddleware } from '../middleware/auth.js';
import * as samapi from '../services/samapi.js';

const router = Router();

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const samSession = await samapi.createQRSession();

    const session = db.createSession({
      userId: req.user.id,
      samSessionId: samSession.id,
      qrPayload: samSession.qrPayload,
      status: samSession.status,
      expiresAt: new Date(samSession.expiresAt)
    });

    res.json({ success: true, session: {
      id: session.id,
      samSessionId: session.samSessionId,
      qrPayload: session.qrPayload,
      status: session.status,
      expiresAt: session.expiresAt
    }});
  } catch (error: any) {
    const isAuth = error.message === 'UNAUTHENTICATED' || error.response?.status === 401;
    const msg = error.response?.data?.message || error.message;
    console.error('Session create error:', msg);
    if (isAuth) return res.status(502).json({ success: false, error: 'SAM_AUTH_REQUIRED', message: `خطأ مصادقة مع المزود: ${msg}` });
    res.status(502).json({ success: false, error: 'SAM_API_ERROR', message: `خطأ من مزود الخدمة: ${msg}` });
  }
});

router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session || session.userId !== req.user.id)
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    if (session.status === 'linked') {
      const wallet = db.getWalletBySamId(session.samWalletId!);
      return res.json({ success: true, status: 'linked', walletId: wallet?.id });
    }

    const samStatus = await samapi.checkQRSession(session.samSessionId);
    db.updateSession(session.id, { status: samStatus.status, samWalletId: samStatus.walletAccountId });

    if (samStatus.status === 'linked' && samStatus.walletAccountId) {
      let wallet = db.getWalletBySamId(samStatus.walletAccountId);

      if (!wallet) {
        const balanceData = await samapi.getBalance(samStatus.walletAccountId);
        wallet = db.createWallet({
          userId: req.user.id,
          samWalletId: samStatus.walletAccountId,
          balance: balanceData.balance ?? 0,
          currency: balanceData.currency || 'SYP'
        });

        try {
          const txs = await samapi.getTransactions(samStatus.walletAccountId);
          if (Array.isArray(txs)) {
            db.addTransactions(wallet.id, txs.map((t: any) => ({
              type: t.type,
              amount: t.amount,
              currency: t.currency || 'SYP',
              description: t.description || '',
              date: new Date(t.date)
            })));
          }
        } catch (e) { console.error('Transactions fetch error:', e); }
      }

      return res.json({ success: true, status: 'linked', walletId: wallet.id });
    }

    res.json({ success: true, status: samStatus.status });
  } catch (error: any) {
    console.error('Session status error:', error);
    res.status(502).json({ success: false, error: 'SAM_API_ERROR' });
  }
});

export default router;
