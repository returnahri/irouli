import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const ResolutionNewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId');
  const [doc, setDoc] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (documentId) {
      api.get(`/documents/${documentId}`).then(res => {
        setDoc(res.data);
        setActualAmount(String(res.data.amount));
      }).catch(() => setError('품의서를 찾을 수 없습니다.')).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [documentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actualAmount || parseInt(actualAmount) <= 0) { setError('실집행 금액을 입력하세요.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/resolutions', { documentId: parseInt(documentId), actualAmount: parseInt(actualAmount), remark: remark || null });
      alert(`결의서가 작성되었습니다.\n결의번호: ${res.data.resNumber}`);
      navigate(`/resolutions/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || '저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;
  if (!documentId) return <div className="text-center text-gray-400 py-20">품의서 목록에서 결의서 작성 버튼을 사용해주세요.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">결의서 작성</h2>
      {doc && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-blue-700 mb-3">연동 품의서 정보</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-blue-500">품의번호:</span> <span className="font-medium text-blue-800">{doc.docNumber}</span></div>
            <div><span className="text-blue-500">결의번호:</span> <span className="font-medium text-blue-800">{doc.docNumber.replace('품의-', '결의-')}</span></div>
            <div><span className="text-blue-500">재원:</span> {FUND_LABELS[doc.fundType]}</div>
            <div><span className="text-blue-500">항목:</span> {doc.category?.name}</div>
            <div><span className="text-blue-500">제목:</span> {doc.title}</div>
            <div><span className="text-blue-500">품의금액:</span> <span className="font-bold">{formatMoney(doc.amount)}</span></div>
          </div>
        </div>
      )}
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">품의 금액</label>
          <div className="input-field bg-gray-50 text-gray-500">{doc ? formatMoney(doc.amount) : '-'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">실집행 금액 (원) *</label>
          <input type="number" value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} className="input-field" placeholder="0" min="1" required />
          {actualAmount && <p className="text-xs text-primary-600 mt-1">{formatMoney(parseInt(actualAmount) || 0)}</p>}
          {doc && actualAmount && parseInt(actualAmount) !== doc.amount && (
            <p className="text-xs text-yellow-600 mt-1">품의 금액과 {parseInt(actualAmount) > doc.amount ? '초과' : '미달'}: 차액 {formatMoney(Math.abs(parseInt(actualAmount) - doc.amount))}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className="input-field h-20" placeholder="비고 사항 (선택)" />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">{saving ? '저장 중...' : '결의서 작성'}</button>
          <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">취소</button>
        </div>
      </form>
    </div>
  );
};

export default ResolutionNewPage;
