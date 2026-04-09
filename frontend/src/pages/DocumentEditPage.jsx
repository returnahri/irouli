import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const DocumentEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', content: '', expenseName: '', amount: '', remark: '', author: '' });
  const [docNumber, setDocNumber] = useState('');

  useEffect(() => {
    api.get(`/documents/${id}`).then(res => {
      const doc = res.data;
      setForm({ title: doc.title, content: doc.content || '', expenseName: doc.expenseName, amount: String(doc.amount), remark: doc.remark || '', author: doc.author });
      setDocNumber(doc.docNumber);
      setLoading(false);
    });
  }, [id]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/documents/${id}`, { ...form, amount: parseInt(form.amount), content: form.content || null, remark: form.remark || null });
      alert('수정되었습니다.');
      navigate(`/documents/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || '수정에 실패했습니다.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">품의서 수정</h2>
      <p className="text-sm text-gray-400 mb-6">{docNumber}</p>
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">제목</label>
          <input type="text" value={form.title} onChange={e => handleChange('title', e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">품의 내용</label>
          <textarea value={form.content} onChange={e => handleChange('content', e.target.value)} className="input-field h-24" placeholder="품의 본문 내용 (선택)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">지출명</label>
            <input type="text" value={form.expenseName} onChange={e => handleChange('expenseName', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">지출금액 (원)</label>
            <input type="number" value={form.amount} onChange={e => handleChange('amount', e.target.value)} className="input-field" min="1" required />
            {form.amount && <p className="text-xs text-primary-600 mt-1">{formatMoney(parseInt(form.amount) || 0)}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
          <textarea value={form.remark} onChange={e => handleChange('remark', e.target.value)} className="input-field h-20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">작성자</label>
          <input type="text" value={form.author} onChange={e => handleChange('author', e.target.value)} className="input-field" />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">{saving ? '저장 중...' : '수정 완료'}</button>
          <button type="button" onClick={() => navigate(`/documents/${id}`)} className="btn-secondary">취소</button>
        </div>
      </form>
    </div>
  );
};

export default DocumentEditPage;
