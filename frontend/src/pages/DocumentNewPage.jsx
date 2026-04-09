import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const DocumentNewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextAutoSeq, setNextAutoSeq] = useState(null);
  const [usedSeqs, setUsedSeqs] = useState([]);

  const [form, setForm] = useState({
    fundType: '',
    categoryId: '',
    title: '',
    content: '',
    expenseName: '',
    amount: '',
    remark: '',
    docDate: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    author: user?.name || '',
    startSeq: ''
  });

  useEffect(() => { api.get('/budget/categories').then(res => setCategories(res.data)); }, []);

  useEffect(() => {
    if (!form.docDate) return;
    const [year, month] = form.docDate.split('-');
    api.get(`/documents/used-seqs?year=${year}&month=${month}`).then(res => {
      setNextAutoSeq(res.data.nextAutoSeq);
      setUsedSeqs(res.data.usedSeqs);
    }).catch(() => { setNextAutoSeq(null); setUsedSeqs([]); });
  }, [form.docDate]);

  useEffect(() => {
    if (!form.categoryId || !form.docDate) return;
    const year = parseInt(form.docDate.split('-')[0]);
    api.get(`/budget/summary/${year}`).then(res => {
      const cat = res.data.categories.find(c => c.id === parseInt(form.categoryId));
      setBudgetInfo(cat);
    });
  }, [form.categoryId, form.docDate]);

  const filteredCategories = categories.filter(c => !form.fundType || c.fundType === form.fundType);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'fundType') { setForm(prev => ({ ...prev, fundType: value, categoryId: '' })); setBudgetInfo(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!form.categoryId) throw new Error('사업비 항목을 선택해주세요.');
      if (!form.amount || parseInt(form.amount) <= 0) throw new Error('금액을 입력해주세요.');
      const res = await api.post('/documents', {
        categoryId: parseInt(form.categoryId),
        title: form.title,
        content: form.content || null,
        expenseName: form.expenseName,
        amount: parseInt(form.amount),
        remark: form.remark || null,
        docDate: form.docDate,
        author: form.author,
        startSeq: form.startSeq ? parseInt(form.startSeq) : null
      });
      alert(`품의서가 작성되었습니다.\n문서번호: ${res.data.docNumber}`);
      navigate(`/documents/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">품의서 작성</h2>
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-4">{error}</div>}
      {budgetInfo && (
        <div className={`p-4 rounded-lg mb-6 ${budgetInfo.remaining <= 0 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{FUND_LABELS[budgetInfo.fundType]} &gt; {budgetInfo.name}</span>
            <span className={`font-bold ${budgetInfo.remaining <= 0 ? 'text-red-600' : 'text-blue-700'}`}>잔액: {formatMoney(budgetInfo.remaining)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>예산: {formatMoney(budgetInfo.budgetAmount)}</span><span>집행: {formatMoney(budgetInfo.spent)}</span>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">재원 구분 *</label>
            <select value={form.fundType} onChange={e => handleChange('fundType', e.target.value)} className="input-field" required>
              <option value="">선택하세요</option>
              <option value="DEPOSIT">입금전용계좌</option>
              <option value="EXPENSE">지출전용계좌</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">사업비 항목 *</label>
            <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className="input-field" required>
              <option value="">선택하세요</option>
              {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">품의일자 (시행월) *</label>
            <input type="month" value={form.docDate} onChange={e => handleChange('docDate', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">작성자</label>
            <input type="text" value={form.author} onChange={e => handleChange('author', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">문서번호 시작번호</label>
            <input type="number" value={form.startSeq} onChange={e => handleChange('startSeq', e.target.value)} className="input-field" placeholder="자동" min="1" />
            {form.docDate && (
              <p className="text-xs text-gray-500 mt-1">
                {form.startSeq
                  ? `문서번호: 품의-${form.docDate.replace('-', '').slice(2)}-${String(form.startSeq).padStart(3, '0')}`
                  : nextAutoSeq
                    ? `다음 문서번호: 품의-${form.docDate.replace('-', '').slice(2)}-${String(nextAutoSeq).padStart(3, '0')}`
                    : ''
                }
                {form.startSeq && usedSeqs.includes(parseInt(form.startSeq)) && (
                  <span className="text-red-500 ml-2">이미 사용된 번호입니다</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">제목 *</label>
          <input type="text" value={form.title} onChange={e => handleChange('title', e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">품의 내용</label>
          <textarea value={form.content} onChange={e => handleChange('content', e.target.value)} className="input-field h-24" placeholder="품의 본문 내용을 입력하세요 (선택)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">지출명 *</label>
            <input type="text" value={form.expenseName} onChange={e => handleChange('expenseName', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">지출금액 (원) *</label>
            <input type="number" value={form.amount} onChange={e => handleChange('amount', e.target.value)} className="input-field" placeholder="0" min="1" required />
            {form.amount && <p className="text-xs text-primary-600 mt-1">{formatMoney(parseInt(form.amount) || 0)}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
          <textarea value={form.remark} onChange={e => handleChange('remark', e.target.value)} className="input-field h-20" placeholder="비고 사항 (선택)" />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">{loading ? '저장 중...' : '품의서 저장'}</button>
          <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">취소</button>
        </div>
      </form>
    </div>
  );
};

export default DocumentNewPage;
