import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const ResolutionEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [res, setRes] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/resolutions/${id}`).then(r => {
      setRes(r.data);
      setActualAmount(String(r.data.actualAmount));
      setRemark(r.data.remark || '');
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/resolutions/${id}`, { actualAmount: parseInt(actualAmount), remark: remark || null });
      alert('수정되었습니다.');
      navigate(`/resolutions/${id}`);
    } catch (err) { setError(err.response?.data?.error || '수정에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;
  if (!res) return <div className="text-center text-gray-400 py-20">결의서를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">결의서 수정</h2>
      <p className="text-sm text-gray-400 mb-6">{res.resNumber}</p>
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">품의 금액</label>
          <div className="input-field bg-gray-50 text-gray-500">{formatMoney(res.document?.amount)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">실집행 금액 (원)</label>
          <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} className="input-field" min="1" required />
          {actualAmount && <p className="text-xs text-primary-600 mt-1">{formatMoney(parseInt(actualAmount) || 0)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
          <textarea value={remark} onChange={e => setRemark(e.target.value)} className="input-field h-20" />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">{saving ? '저장 중...' : '수정 완료'}</button>
          <button type="button" onClick={() => navigate(`/resolutions/${id}`)} className="btn-secondary">취소</button>
        </div>
      </form>
    </div>
  );
};

export default ResolutionEditPage;
