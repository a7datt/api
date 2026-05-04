import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/store.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'بيانات ناقصة' });

    if (db.getUserByEmail(email))
      return res.status(400).json({ success: false, error: 'EMAIL_EXISTS', message: 'الحساب موجود مسبقاً' });

    const hashed = await bcrypt.hash(password, 10);
    const user = db.createUser({ email, password: hashed });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, user: { id: user.id, email: user.email, apiKey: user.apiKey } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.getUserByEmail(email);
    if (!user) return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'بيانات الدخول غير صحيحة' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'بيانات الدخول غير صحيحة' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, apiKey: user.apiKey } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  const walletsCount = db.getWalletsByUser(user.id).length;
  res.json({ success: true, user: { id: user.id, email: user.email, apiKey: user.apiKey, walletsCount } });
});

export default router;
