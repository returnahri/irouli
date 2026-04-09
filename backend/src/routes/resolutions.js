const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { documentId, actualAmount, remark } = req.body;
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { resolution: true, category: true }
    });
    if (!document) return res.status(404).json({ error: '품의서를 찾을 수 없습니다.' });
    if (document.resolution) return res.status(400).json({ error: '이미 결의서가 작성된 품의서입니다.' });

    const resNumber = document.docNumber.replace('품의-', '결의-');
    const resolution = await prisma.resolution.create({
      data: {
        documentId, resNumber,
        actualAmount: BigInt(actualAmount),
        remark: remark || null,
        author: req.user.name,
        categoryId: document.categoryId
      },
      include: { document: { include: { category: true } }, category: true }
    });
    res.json({ ...resolution, actualAmount: Number(resolution.actualAmount), document: { ...resolution.document, amount: Number(resolution.document.amount) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year, month, fundType, categoryId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (year || month || fundType || categoryId) {
      where.document = {};
      if (year) where.document.year = parseInt(year);
      if (month) where.document.month = parseInt(month);
      if (fundType) where.document.category = { fundType };
      if (categoryId) where.document.categoryId = parseInt(categoryId);
    }
    const [resolutions, total] = await Promise.all([
      prisma.resolution.findMany({
        where,
        include: {
          document: { include: { category: true } },
          category: true,
          approvals: { include: { user: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.resolution.count({ where })
    ]);
    res.json({
      resolutions: resolutions.map(r => ({
        ...r, actualAmount: Number(r.actualAmount),
        document: { ...r.document, amount: Number(r.document.amount) }
      })),
      total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const resolution = await prisma.resolution.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        document: { include: { category: true, approvals: { include: { user: { select: { id: true, name: true } } } } } },
        category: true,
        approvals: { include: { user: { select: { id: true, name: true } } } }
      }
    });
    if (!resolution) return res.status(404).json({ error: '결의서를 찾을 수 없습니다.' });
    res.json({
      ...resolution, actualAmount: Number(resolution.actualAmount),
      document: { ...resolution.document, amount: Number(resolution.document.amount) }
    });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { actualAmount, remark } = req.body;
    const resolution = await prisma.resolution.update({
      where: { id: parseInt(req.params.id) },
      data: { actualAmount: BigInt(actualAmount), remark: remark || null },
      include: { document: { include: { category: true } }, category: true }
    });
    res.json({ ...resolution, actualAmount: Number(resolution.actualAmount), document: { ...resolution.document, amount: Number(resolution.document.amount) } });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.resolutionApproval.deleteMany({ where: { resolutionId: id } });
    await prisma.resolution.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { role, signature } = req.body;
    const resolutionId = parseInt(req.params.id);
    const existing = await prisma.resolutionApproval.findFirst({ where: { resolutionId, role } });
    if (existing) {
      const updated = await prisma.resolutionApproval.update({
        where: { id: existing.id },
        data: { userId: req.user.id, signature, signedAt: new Date() },
        include: { user: { select: { name: true } } }
      });
      return res.json(updated);
    }
    const approval = await prisma.resolutionApproval.create({
      data: { resolutionId, userId: req.user.id, role, signature, signedAt: new Date() },
      include: { user: { select: { name: true } } }
    });
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
