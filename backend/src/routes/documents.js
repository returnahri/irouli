const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const generateDocNumber = async (year, month, startSeq = null) => {
  const lastDoc = await prisma.document.findFirst({
    where: { year, month },
    orderBy: { monthSeq: 'desc' }
  });
  let seq;
  if (lastDoc) {
    seq = lastDoc.monthSeq + 1;
  } else {
    seq = startSeq || 1;
  }
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  const seqStr = String(seq).padStart(3, '0');
  return { docNumber: `품의-${yy}${mm}-${seqStr}`, monthSeq: seq };
};

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { categoryId, title, content, expenseName, amount, remark, docDate, author } = req.body;
    const parts = docDate.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parts[2] ? parseInt(parts[2]) : null;

    const category = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
      include: { budgets: { where: { year } }, documents: { where: { year }, select: { amount: true } } }
    });
    if (!category) return res.status(404).json({ error: '사업비 항목을 찾을 수 없습니다.' });

    const budgetAmount = category.budgets[0] ? Number(category.budgets[0].amount) : 0;
    const currentSpent = category.documents.reduce((sum, doc) => sum + Number(doc.amount), 0);
    const remaining = budgetAmount - currentSpent;
    if (budgetAmount > 0 && amount > remaining) {
      return res.status(400).json({ error: '예산 초과', message: `잔액 ${remaining.toLocaleString()}원을 초과합니다.`, remaining });
    }

    const startSeq = req.body.startSeq ? parseInt(req.body.startSeq) : null;
    const { docNumber, monthSeq } = await generateDocNumber(year, month, startSeq);

    const document = await prisma.document.create({
      data: {
        docNumber, year, month, day, monthSeq,
        fundType: category.fundType, categoryId,
        title, content: content || null, expenseName, amount: BigInt(amount),
        remark: remark || null,
        author: author || req.user.name
      },
      include: { category: true }
    });

    res.json({ ...document, amount: Number(document.amount) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/used-seqs', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: '필수 파라미터가 없습니다.' });
    const docs = await prisma.document.findMany({
      where: { year: parseInt(year), month: parseInt(month) },
      select: { monthSeq: true }
    });
    const usedSeqs = docs.map(d => d.monthSeq);
    const maxSeq = usedSeqs.length > 0 ? Math.max(...usedSeqs) : 0;
    res.json({ usedSeqs, nextAutoSeq: maxSeq + 1 });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year, month, categoryId, fundType, page = 1, limit = 20 } = req.query;
    const where = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (fundType) where.category = { fundType };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          category: true,
          approvals: { include: { user: { select: { name: true } } } },
          resolution: { select: { id: true, resNumber: true } }
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { monthSeq: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      documents: documents.map(doc => ({ ...doc, amount: Number(doc.amount) })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        category: true,
        approvals: { include: { user: { select: { id: true, name: true } } } },
        resolution: { select: { id: true, resNumber: true } }
      }
    });
    if (!document) return res.status(404).json({ error: '품의서를 찾을 수 없습니다.' });
    res.json({ ...document, amount: Number(document.amount) });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, expenseName, amount, remark, author } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (expenseName !== undefined) updateData.expenseName = expenseName;
    if (amount !== undefined) updateData.amount = BigInt(amount);
    if (remark !== undefined) updateData.remark = remark;
    if (author !== undefined) updateData.author = author;

    const document = await prisma.document.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { category: true }
    });
    res.json({ ...document, amount: Number(document.amount) });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.approval.deleteMany({ where: { documentId: id } });
    await prisma.document.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { role, signature } = req.body;
    const documentId = parseInt(req.params.id);

    const existing = await prisma.approval.findFirst({ where: { documentId, role } });
    if (existing) {
      const updated = await prisma.approval.update({
        where: { id: existing.id },
        data: { userId: req.user.id, signature, signedAt: new Date() },
        include: { user: { select: { name: true } } }
      });
      return res.json(updated);
    }
    const approval = await prisma.approval.create({
      data: { documentId, userId: req.user.id, role, signature, signedAt: new Date() },
      include: { user: { select: { name: true } } }
    });
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
