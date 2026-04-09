const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { isActive: true };
    const categories = await prisma.budgetCategory.findMany({
      where,
      orderBy: [{ fundType: 'asc' }, { sortOrder: 'asc' }]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/categories', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: '관리자만 항목을 추가할 수 있습니다.' });
    const { fundType, name } = req.body;
    if (!fundType || !name) return res.status(400).json({ error: '재원구분과 항목명을 입력해주세요.' });
    const existing = await prisma.budgetCategory.findFirst({ where: { fundType, name } });
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.budgetCategory.update({ where: { id: existing.id }, data: { isActive: true } });
        return res.json({ ...reactivated, reactivated: true });
      }
      return res.status(400).json({ error: '이미 존재하는 항목입니다.' });
    }
    const lastCategory = await prisma.budgetCategory.findFirst({ where: { fundType }, orderBy: { sortOrder: 'desc' } });
    const sortOrder = (lastCategory?.sortOrder ?? 0) + 1;
    const category = await prisma.budgetCategory.create({ data: { fundType, name, sortOrder, isActive: true } });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/categories/:id/toggle', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: '관리자만 항목을 수정할 수 있습니다.' });
    const id = parseInt(req.params.id);
    const category = await prisma.budgetCategory.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    const updated = await prisma.budgetCategory.update({ where: { id }, data: { isActive: !category.isActive } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: '관리자만 항목을 삭제할 수 있습니다.' });
    const id = parseInt(req.params.id);
    const [docCount, preCount] = await Promise.all([
      prisma.document.count({ where: { categoryId: id } }),
      prisma.preExpense.count({ where: { categoryId: id } })
    ]);
    if (docCount + preCount > 0) return res.status(400).json({ error: '이 항목으로 작성된 품의서 또는 기집행이 있어 삭제할 수 없습니다.' });
    await prisma.budget.deleteMany({ where: { categoryId: id } });
    await prisma.budgetCategory.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/summary/:year', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const categories = await prisma.budgetCategory.findMany({
      orderBy: [{ fundType: 'asc' }, { sortOrder: 'asc' }],
      include: {
        budgets: { where: { year } },
        documents: { where: { year }, select: { amount: true } },
        preExpenses: { where: { year }, select: { amount: true } }
      }
    });
    const summary = categories.map(cat => {
      const budgetAmount = cat.budgets[0] ? Number(cat.budgets[0].amount) : 0;
      const docSpent = cat.documents.reduce((sum, doc) => sum + Number(doc.amount), 0);
      const preSpent = cat.preExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const spent = docSpent + preSpent;
      return { id: cat.id, fundType: cat.fundType, name: cat.name, sortOrder: cat.sortOrder, isActive: cat.isActive, budgetAmount, spent, remaining: budgetAmount - spent, docCount: cat.documents.length };
    });
    const depositSummary = summary.filter(s => s.fundType === 'DEPOSIT');
    const expenseSummary = summary.filter(s => s.fundType === 'EXPENSE');
    const calcTotal = (items) => ({
      budgetAmount: items.reduce((s, i) => s + i.budgetAmount, 0),
      spent: items.reduce((s, i) => s + i.spent, 0),
      remaining: items.reduce((s, i) => s + i.remaining, 0),
      docCount: items.reduce((s, i) => s + i.docCount, 0)
    });
    res.json({ year, categories: summary, depositTotal: calcTotal(depositSummary), expenseTotal: calcTotal(expenseSummary), grandTotal: calcTotal(summary) });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.put('/:categoryId/:year', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const year = parseInt(req.params.year);
    const { amount } = req.body;
    const existing = await prisma.budget.findUnique({ where: { year_categoryId: { categoryId, year } } });
    if (existing) {
      await prisma.budgetHistory.create({
        data: { categoryId, year, oldAmount: existing.amount, newAmount: BigInt(amount), changedBy: req.user.name }
      });
    }
    const budget = await prisma.budget.upsert({
      where: { year_categoryId: { categoryId, year } },
      update: { amount: BigInt(amount) },
      create: { categoryId, year, amount: BigInt(amount) }
    });
    res.json({ ...budget, amount: Number(budget.amount) });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/history/:categoryId/:year', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const year = parseInt(req.params.year);
    const history = await prisma.budgetHistory.findMany({ where: { categoryId, year }, orderBy: { changedAt: 'desc' } });
    res.json(history.map(h => ({ ...h, oldAmount: Number(h.oldAmount), newAmount: Number(h.newAmount) })));
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/pre-expense', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { categoryId, year, month, amount, memo } = req.body;
    const expense = await prisma.preExpense.create({
      data: { categoryId: parseInt(categoryId), year: parseInt(year), month: parseInt(month), amount: BigInt(amount), memo: memo || '' }
    });
    res.json({ ...expense, amount: Number(expense.amount) });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/pre-expense/:year', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const expenses = await prisma.preExpense.findMany({
      where: { year },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses.map(e => ({ ...e, amount: Number(e.amount) })));
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/pre-expense/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.preExpense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
