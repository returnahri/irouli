import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Save, History, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const BudgetPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState({});
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preExpenses, setPreExpenses] = useState([]);
  const [preFilter, setPreFilter] = useState({ month: '', categoryId: '' });
  const [allCategories, setAllCategories] = useState([]);
  const [newCat, setNewCat] = useState({ fundType: 'DEPOSIT', name: '' });
  const [catError, setCatError] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  const fetchSummary = async () => { setLoading(true); try { const res = await api.get(`/budget/summary/${year}`); setSummary(res.data); } catch (err) { console.error(err); } finally { setLoading(false); } };
  const fetchPreExpenses = async () => { try { const res = await api.get(`/budget/pre-expense/${year}`); setPreExpenses(res.data); } catch (err) { console.error(err); } };
  const fetchAllCategories = async () => { try { const res = await api.get('/budget/categories?all=true'); setAllCategories(res.data); } catch (err) { console.error(err); } };

  useEffect(() => { fetchSummary(); fetchPreExpenses(); if (isAdmin) fetchAllCategories(); }, [year]);

  const handleSave = async (categoryId) => {
    const amount = editing[categoryId];
    if (amount === undefined || amount === '') return;
    try { await api.put(`/budget/${categoryId}/${year}`, { amount: parseInt(amount) }); setEditing(prev => { const n = { ...prev }; delete n[categoryId]; return n; }); fetchSummary(); } catch (err) { alert('저장에 실패했습니다.'); }
  };

  const showHistory = async (categoryId, catName) => {
    try { const res = await api.get(`/budget/history/${categoryId}/${year}`); setHistory({ catName, items: res.data }); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">로딩 중...</div>;
  if (!summary) return null;

  const renderTable = (title, cats, borderColor) => (
    <div className="card">
      <h3 className={`text-lg font-bold mb-4 pb-2 border-b-2 ${borderColor}`}>{title}</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-gray-500 border-b">
          <th className="text-left py-2 font-medium">항목</th><th className="text-right py-2 font-medium">예산액</th>
          <th className="text-right py-2 font-medium">집행액</th><th className="text-right py-2 font-medium">잔액</th>
          {isAdmin && <th className="text-center py-2 font-medium w-48 pl-6">예산 수정</th>}<th className="w-10"></th>
        </tr></thead>
        <tbody>{cats.map(cat => (
          <tr key={cat.id} className="border-b border-gray-50">
            <td className="py-3 font-medium text-gray-700">{cat.name}</td>
            <td className="py-3 text-right text-gray-800 font-medium">{formatMoney(cat.budgetAmount)}</td>
            <td className="py-3 text-right text-blue-600">{formatMoney(cat.spent)}</td>
            <td className={`py-3 text-right font-medium ${cat.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(cat.remaining)}</td>
            {isAdmin && (<td className="py-3 text-center pl-6"><div className="flex items-center gap-1">
              <input type="number" value={editing[cat.id] !== undefined ? editing[cat.id] : ''} onChange={e => setEditing(prev => ({ ...prev, [cat.id]: e.target.value }))} placeholder={cat.budgetAmount || '예산액 입력'} className="input-field text-sm w-28 text-right" />
              <button onClick={() => handleSave(cat.id)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"><Save size={16} /></button>
            </div></td>)}
            <td className="py-3"><button onClick={() => showHistory(cat.id, cat.name)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><History size={16} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  const depositCats = summary.categories.filter(c => c.fundType === 'DEPOSIT');
  const expenseCats = summary.categories.filter(c => c.fundType === 'EXPENSE');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">예산 배정</h2>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-32">
          {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>
      {!isAdmin && <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg mb-4">예산 배정은 관리자만 가능합니다.</div>}
      <div className="space-y-6">
        {renderTable('입금전용계좌', depositCats, 'border-blue-500')}
        {renderTable('지출전용계좌', expenseCats, 'border-green-500')}
      </div>

      {isAdmin && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-4 pb-2 border-b-2 border-orange-400">기집행 등록</h3>
          <div className="flex gap-3 items-end flex-wrap mb-4">
            <div><label className="block text-xs text-gray-500 mb-1">항목</label>
              <select id="preCategory" className="input-field text-sm w-40">
                <optgroup label="입금전용계좌">{summary.categories.filter(c => c.fundType === 'DEPOSIT').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="지출전용계좌">{summary.categories.filter(c => c.fundType === 'EXPENSE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">월</label><select id="preMonth" className="input-field text-sm w-20">{Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">금액</label><input type="number" id="preAmount" className="input-field text-sm w-36 text-right" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">메모</label><input type="text" id="preMemo" className="input-field text-sm w-48" /></div>
            <button onClick={async () => {
              const categoryId = document.getElementById('preCategory').value;
              const month = document.getElementById('preMonth').value;
              const amount = document.getElementById('preAmount').value;
              const memo = document.getElementById('preMemo').value;
              if (!amount || parseInt(amount) <= 0) { alert('금액을 입력하세요.'); return; }
              try { await api.post('/budget/pre-expense', { categoryId, year, month, amount: parseInt(amount), memo }); document.getElementById('preAmount').value = ''; document.getElementById('preMemo').value = ''; fetchSummary(); fetchPreExpenses(); } catch (err) { alert('등록에 실패했습니다.'); }
            }} className="btn-primary text-sm">등록</button>
          </div>
          {preExpenses.length > 0 && (
            <>
              <div className="flex gap-3 mb-3">
                <select value={preFilter.categoryId} onChange={e => setPreFilter(p => ({...p, categoryId: e.target.value}))} className="input-field text-sm w-32"><option value="">전체 항목</option>{summary.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <select value={preFilter.month} onChange={e => setPreFilter(p => ({...p, month: e.target.value}))} className="input-field text-sm w-24"><option value="">전체 월</option>{Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}</select>
                <button onClick={() => setPreFilter({ month: '', categoryId: '' })} className="text-sm text-gray-500 hover:text-gray-700">초기화</button>
              </div>
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup><col style={{ width: '20%' }} /><col style={{ width: '10%' }} /><col style={{ width: '25%' }} /><col style={{ width: '35%' }} /><col style={{ width: '10%' }} /></colgroup>
                <thead><tr className="text-gray-500 border-b"><th className="text-left py-3 px-3 font-medium">항목</th><th className="text-center py-3 px-3 font-medium">월</th><th className="text-right py-3 px-3 font-medium">금액</th><th className="text-left py-3 px-3 font-medium">메모</th><th className="text-center py-3 px-3 font-medium"></th></tr></thead>
                <tbody>{preExpenses.filter(e => { if (preFilter.month && e.month !== parseInt(preFilter.month)) return false; if (preFilter.categoryId && e.categoryId !== parseInt(preFilter.categoryId)) return false; return true; }).map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-700 font-medium">{e.category?.name}</td><td className="py-3 px-3 text-center text-gray-500">{e.month}월</td>
                    <td className="py-3 px-3 text-right text-blue-600 font-medium">{formatMoney(e.amount)}</td><td className="py-3 px-3 text-gray-400">{e.memo}</td>
                    <td className="py-3 px-3 text-center"><button onClick={async () => { if (!confirm('삭제하시겠습니까?')) return; try { await api.delete('/budget/pre-expense/' + e.id); fetchSummary(); fetchPreExpenses(); } catch (err) { alert('삭제에 실패했습니다.'); } }} className="text-xs text-red-400 hover:text-red-600">삭제</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-4 pb-2 border-b-2 border-purple-400">예산 항목 관리</h3>
          <div className="flex gap-3 items-end mb-6">
            <div><label className="block text-xs text-gray-500 mb-1">재원구분</label><select value={newCat.fundType} onChange={e => setNewCat(p => ({ ...p, fundType: e.target.value }))} className="input-field text-sm w-36"><option value="DEPOSIT">입금전용계좌</option><option value="EXPENSE">지출전용계좌</option></select></div>
            <div><label className="block text-xs text-gray-500 mb-1">항목명</label><input type="text" value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} className="input-field text-sm w-48" /></div>
            <button onClick={async () => {
              setCatError('');
              if (!newCat.name.trim()) { setCatError('항목명을 입력해주세요.'); return; }
              try { const res = await api.post('/budget/categories', newCat); if (res.data.reactivated) alert('기존에 숨긴 항목이 다시 활성화되었습니다.'); setNewCat(p => ({ ...p, name: '' })); fetchAllCategories(); fetchSummary(); } catch (err) { setCatError(err.response?.data?.error || '추가에 실패했습니다.'); }
            }} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> 추가</button>
          </div>
          {catError && <p className="text-red-500 text-sm mb-4">{catError}</p>}
          <div className="grid grid-cols-2 gap-6">
            {[{ type: 'DEPOSIT', label: '입금전용계좌' }, { type: 'EXPENSE', label: '지출전용계좌' }].map(({ type, label }) => (
              <div key={type}>
                <h4 className="text-sm font-bold text-gray-600 mb-2">{label} 항목</h4>
                <div className="space-y-1">
                  {allCategories.filter(c => c.fundType === type).map(cat => (
                    <div key={cat.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                      <span className={cat.isActive ? 'text-gray-700' : 'text-gray-400 line-through'}>{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={async () => { if (cat.isActive && !confirm('이 항목을 숨기시겠습니까?')) return; try { await api.patch(`/budget/categories/${cat.id}/toggle`); fetchAllCategories(); fetchSummary(); } catch (err) { alert('변경에 실패했습니다.'); } }} className={cat.isActive ? 'text-xs text-red-500 hover:text-red-700 flex items-center gap-1' : 'text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1'}>
                          {cat.isActive ? <><EyeOff size={12} /> 숨기기</> : <><Eye size={12} /> 활성화</>}
                        </button>
                        <button onClick={async () => { if (!confirm('완전히 삭제하시겠습니까?')) return; try { await api.delete(`/budget/categories/${cat.id}`); fetchAllCategories(); fetchSummary(); } catch (err) { alert(err.response?.data?.error || '삭제에 실패했습니다.'); } }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> 삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setHistory(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-96 overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">예산 변경 이력 — {history.catName}</h3>
            {history.items.length === 0 ? <p className="text-gray-400 text-sm">변경 이력이 없습니다.</p> : (
              <div className="space-y-2">{history.items.map((h, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{new Date(h.changedAt).toLocaleString('ko-KR')}</span><span className="text-gray-500">{h.changedBy}</span></div>
                  <div className="mt-1"><span className="text-red-500 line-through">{formatMoney(h.oldAmount)}</span><span className="mx-2">→</span><span className="text-green-600 font-bold">{formatMoney(h.newAmount)}</span></div>
                </div>
              ))}</div>
            )}
            <button onClick={() => setHistory(null)} className="btn-secondary w-full mt-4">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;
