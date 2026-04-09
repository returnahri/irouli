const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('dlfhdnffl', 10);
  await prisma.user.upsert({
    where: { username: 'carewithyou' },
    update: {},
    create: {
      name: '관리자',
      username: 'carewithyou',
      password: hashedPassword,
      role: 'ADMIN',
      signRole: '대표'
    }
  });

  const depositCategories = [
    { fundType: 'DEPOSIT', name: '인건비', sortOrder: 1 },
    { fundType: 'DEPOSIT', name: '일반수용비', sortOrder: 2 },
    { fundType: 'DEPOSIT', name: '사업추진비', sortOrder: 3 },
    { fundType: 'DEPOSIT', name: '특근외식비', sortOrder: 4 },
    { fundType: 'DEPOSIT', name: '통신비', sortOrder: 5 },
    { fundType: 'DEPOSIT', name: '업무출장비', sortOrder: 6 },
    { fundType: 'DEPOSIT', name: '고용부담금', sortOrder: 7 },
  ];

  const expenseCategories = [
    { fundType: 'EXPENSE', name: '인건비', sortOrder: 1 },
    { fundType: 'EXPENSE', name: '일반수용비', sortOrder: 2 },
    { fundType: 'EXPENSE', name: '임차료', sortOrder: 3 },
    { fundType: 'EXPENSE', name: '홍보비', sortOrder: 4 },
    { fundType: 'EXPENSE', name: '참여수당', sortOrder: 5 },
    { fundType: 'EXPENSE', name: '인센티브', sortOrder: 6 },
  ];

  const allCategories = [...depositCategories, ...expenseCategories];

  for (const cat of allCategories) {
    const existing = await prisma.budgetCategory.findFirst({
      where: { fundType: cat.fundType, name: cat.name }
    });
    if (!existing) {
      await prisma.budgetCategory.create({ data: cat });
    }
  }

  console.log('시드 데이터가 생성되었습니다.');
  console.log('관리자 계정: carewithyou / dlfhdnffl');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
