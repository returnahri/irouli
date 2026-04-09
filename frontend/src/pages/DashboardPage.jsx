import { useState, useEffect } from 'react';
import api from '../api';
import { AlertTriangle } from 'lucide-react';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const ProgressBar = ({ spent, budget }) => {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/budget/summary/${year}`).then(res => setSummary(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;
  if (!summary) return <div className="text-center text-gray-400 py-20">데이터를 불러올 수 없습니다.</div>;

  const { depositTotal, expenseTotal, grandTotal, categories } = summary;
  const depositCats = categories.filter(c => c.fundType === 'DEPOSIT');
  const expenseCats = categories.filter(c => c.fundType === 'EXPENSE');

  const SummaryCard = ({ title, data, color }) => (
    <div className={`card border-l-4 ${color}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-3">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between"><span className="text-gray-500 text-sm">예산</span><span className="font-bold text-gray-800">{formatMoney(data.budgetAmount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500 text-sm">집행</span><span className="font-bold text-blue-600">{formatMoney(data.spent)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500 text-sm">잔액</span><span className={`font-bold ${data.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(data.remaining)}</span></div>
        <ProgressBar spent={data.spent} budget={data.budgetAmount} />
      </div>
      <div className="mt-3 text-xs text-gray-400">품의서 {data.docCount}건</div>
    </div>
  );

  const CategoryTable = ({ title, cats, borderColor }) => (
    <div className="card">
      <h3 className={`text-lg font-bold mb-4 pb-2 border-b-2 ${borderColor}`}>{title}</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-gray-500 border-b">
          <th className="text-left py-2 font-medium">항목</th><th className="text-right py-2 font-medium">예산</th>
          <th className="text-right py-2 font-medium">집행</th><th className="text-right py-2 font-medium">잔액</th>
          <th className="text-right py-2 font-medium">집행률</th><th className="text-right py-2 font-medium">건수</th>
        </tr></thead>
        <tbody>{cats.map(cat => {
          const pct = cat.budgetAmount > 0 ? ((cat.spent / cat.budgetAmount) * 100).toFixed(1) : '0.0';
          const isWarning = parseFloat(pct) >= 90;
          return (
            <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 font-medium text-gray-700">{isWarning && <AlertTriangle size={14} className="inline text-red-500 mr-1" />}{cat.name}</td>
              <td className="text-right text-gray-600">{formatMoney(cat.budgetAmount)}</td>
              <td className="text-right text-blue-600 font-medium">{formatMoney(cat.spent)}</td>
              <td className={`text-right font-medium ${cat.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(cat.remaining)}</td>
              <td className={`text-right ${isWarning ? 'text-red-600 font-bold' : 'text-gray-600'}`}>{pct}%</td>
              <td className="text-right text-gray-500">{cat.docCount}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">예산 현황</h2>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input-field w-32">
          {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard title="입금전용계좌 합계" data={depositTotal} color="border-blue-500" />
        <SummaryCard title="지출전용계좌 합계" data={expenseTotal} color="border-green-500" />
        <SummaryCard title="전체 합계" data={grandTotal} color="border-purple-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTable title="입금전용계좌" cats={depositCats} borderColor="border-blue-500" />
        <CategoryTable title="지출전용계좌" cats={expenseCats} borderColor="border-green-500" />
      </div>
    </div>
  );
};

export default DashboardPage;
