const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role, signRole: user.signRole, stampImage: user.stampImage }
    });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, username, password, role, signRole } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: '이미 등록된 아이디입니다.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, username, password: hashedPassword, role: role || 'USER', signRole: signRole || null }
    });
    res.json({ id: user.id, name: user.name, username: user.username, role: user.role, signRole: user.signRole });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, username: req.user.username, role: req.user.role, signRole: req.user.signRole, stampImage: req.user.stampImage });
});

router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, role: true, signRole: true, stampImage: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다.' });
    await prisma.approval.deleteMany({ where: { userId: id } });
    await prisma.resolutionApproval.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.put('/stamp', authenticateToken, async (req, res) => {
  try {
    const { stampImage, userId } = req.body;
    const targetId = (req.user.role === 'ADMIN' && userId) ? userId : req.user.id;
    const user = await prisma.user.update({ where: { id: targetId }, data: { stampImage } });
    res.json({ message: '도장이 등록되었습니다.', stampImage: user.stampImage });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
