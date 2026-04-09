import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import SignaturePad from '../components/SignaturePad';
import { Printer, Edit, Trash2, ArrowLeft, PenTool } from 'lucide-react';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
const approvalRoles = ['담당', '이사', '대표'];

const DocumentDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingRole, setSigningRole] = useState(null);

  const fetchDoc = async () => {
    try { const res = await api.get(`/documents/${id}`); setDoc(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDoc(); }, [id]);

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try { await api.delete(`/documents/${id}`); alert('삭제되었습니다.'); navigate('/documents'); }
    catch (err) { alert('삭제에 실패했습니다.'); }
  };

  const handleSign = async (signatureData, targetRole) => {
    try {
      const roleToSign = targetRole || signingRole;
      await api.post(`/documents/${id}/sign`, { role: roleToSign, signature: signatureData });
      setSigningRole(null);
      fetchDoc();
    } catch (err) { alert('서명에 실패했습니다.'); }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write([
      '<html><head><title>' + doc.docNumber + '</title>',
      '<style>',
      '@page { size: A4 portrait; margin: 14.1mm 14.1mm 15mm 14.1mm; }',
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      'body { font-family: "HCR Batang", Batang, serif; color: #000; }',
      'table { border-collapse: collapse; width: 100%; }',
      'td, th { border: 1px solid #000; vertical-align: middle; }',
      '</style></head><body>',
      content.innerHTML,
      '</body></html>'
    ].join('\n'));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;
  if (!doc) return <div className="text-center text-gray-400 py-20">품의서를 찾을 수 없습니다.</div>;

  const getApproval = (role) => doc.approvals?.find(a => a.role === role);
  const docDateStr = doc.year + '.' + String(doc.month).padStart(2, '0') + '.';
  const fundTypeLabel = FUND_LABELS[doc.fundType] || doc.fundType;
  const F = '"HCR Batang", "함초롱바탕", Batang, "바탕", serif';
  const B = '1px solid #000';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/documents')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700"><ArrowLeft size={18} /> 목록으로</button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={16} /> PDF/인쇄</button>
          <button onClick={() => navigate(`/documents/${id}/edit`)} className="btn-secondary flex items-center gap-2"><Edit size={16} /> 수정</button>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2"><Trash2 size={16} /> 삭제</button>
        </div>
      </div>

      {/* 전자서명 영역 */}
      <div className="card mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><PenTool size={16} /> 전자서명</h3>
        <div className="flex gap-6">
          {approvalRoles.map(role => {
            const approval = getApproval(role);
            const canSign = user?.signRole === role || user?.role === 'ADMIN';
            return (
              <div key={role} className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-2">{role}</p>
                <div className="h-24 flex items-center justify-center">
                  {approval?.signature ? (
                    <div className="border rounded-lg p-2 bg-gray-50 w-full h-full flex flex-col items-center justify-center">
                      <img src={approval.signature} alt={role + ' 서명'} className="max-h-12 mx-auto" />
                      <p className="text-xs text-gray-400 mt-1">{approval.user?.name}</p>
                    </div>
                  ) : signingRole === role ? (
                    <SignaturePad onSave={handleSign} onCancel={() => setSigningRole(null)} />
                  ) : canSign ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <button onClick={() => setSigningRole(role)} className="w-full py-2 border-2 border-dashed border-green-300 rounded-lg text-green-500 hover:border-green-500 hover:bg-green-50 transition-colors text-sm font-medium">직접 서명</button>
                      {user?.stampImage && <button onClick={() => handleSign(user.stampImage, role)} className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium">도장 사용</button>}
                    </div>
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-lg text-gray-300 flex items-center justify-center text-sm">{role} 전용</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="card p-0 overflow-hidden" ref={printRef}>
        <div style={{ padding: '14mm', fontFamily: F, color: '#000' }}>
          <div style={{ textAlign: 'center', fontSize: '26pt', fontWeight: 'bold', letterSpacing: '24px', paddingLeft: '24px', marginBottom: '5mm', fontFamily: F }}>품 의 서</div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: F, tableLayout: 'fixed' }}>
            <colgroup><col style={{ width: '20%' }} /><col style={{ width: '17%' }} /><col style={{ width: '8%' }} /><col style={{ width: '18.3%' }} /><col style={{ width: '18.3%' }} /><col style={{ width: '18.3%' }} /></colgroup>
            <tbody>
              <tr style={{ height: '13mm' }}><td colSpan={6} style={{ border: B, padding: '6px 8px', fontSize: '10pt' }}>문서번호 :&nbsp;&nbsp;{doc.docNumber}</td></tr>
              <tr style={{ height: '12mm' }}>
                <td style={{ border: B, textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>품 의 일 자</td>
                <td style={{ border: B, textAlign: 'center', fontSize: '11pt' }}>{docDateStr}</td>
                <td rowSpan={2} style={{ border: B, textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', padding: '4px 2px' }}>결<br/><br/>재</td>
                {approvalRoles.map(r => <td key={r} style={{ border: B, textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', letterSpacing: '6px' }}>{r}</td>)}
              </tr>
              <tr style={{ height: '25mm' }}>
                <td style={{ border: B, textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>작 성 자</td>
                <td style={{ border: B, textAlign: 'center', fontSize: '11pt' }}>{doc.author}</td>
                {approvalRoles.map(r => <td key={r} style={{ border: B, textAlign: 'center', verticalAlign: 'middle', padding: '3mm' }}>{getApproval(r)?.signature && <img src={getApproval(r).signature} style={{ maxWidth: '80%', maxHeight: '16mm', objectFit: 'contain', display: 'block', margin: '0 auto' }} />}</td>)}
              </tr>
              <tr style={{ height: '14mm' }}>
                <td style={{ border: B, textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>재 원 구 분</td>
                <td colSpan={2} style={{ border: B, textAlign: 'center', fontSize: '11pt' }}>{fundTypeLabel}</td>
                <td style={{ border: B, textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>항 목</td>
                <td colSpan={2} style={{ border: B, textAlign: 'center', fontSize: '11pt' }}>{doc.category?.name}</td>
              </tr>
              <tr style={{ height: '16mm' }}><td colSpan={6} style={{ border: B, padding: '10px 12px', textAlign: 'center', fontSize: '11pt' }}>제목 : {doc.title}</td></tr>
              <tr><td colSpan={6} style={{ border: B, padding: '20px 12px', fontSize: '12pt', lineHeight: '160%', verticalAlign: 'top' }}>
                {doc.content && (
                  <div style={{ lineHeight: '200%', whiteSpace: 'pre-wrap', minHeight: '150px' }}>{doc.content}</div>
                )}
                <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '20px', fontSize: '12pt', letterSpacing: '8px', fontWeight: 'bold' }}>- 아&nbsp;&nbsp;래 -</div>
                <div style={{ lineHeight: '200%' }}>
                  1. 지 출 명 : {doc.expenseName}<br/>
                  2. 지 출 금 액 : {formatMoney(doc.amount)}
                  {doc.remark && <><br/>3. 비 고 : {doc.remark}</>}
                </div>
                <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '20px' }}>위와 같이 품의하오니 재가하여 주시기 바랍니다.</div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', marginTop: '30px' }}>이로울리</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
