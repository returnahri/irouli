import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, FileCheck, ChevronLeft, ChevronRight } from 'lucide-react';

const FUND_LABELS = { DEPOSIT: '입금전용계좌', EXPENSE: '지출전용계좌' };
const formatMoney = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

const ResolutionListPage = () => {
  const navigate = useNavigate();
  const [resolutions, setResolutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: '', fundType: '', categoryId: '', page: 1 });

  useEffect(() => { api.get('/budget/categories').then(res => setCategories(res.data)); }, []);
  useEffect(() => { fetchResolutions(); }, [filters]);

  const fetchResolutions = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.year) params.year = filters.year;
      if (filters.month) params.month = filters.month;
      if (filters.fundType) params.fundType = filters.fundType;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      const res = await api.get('/resolutions', { params });
      setResolutions(res.data.resolutions);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFilter = (field, value) => setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  const filteredCats = categories.filter(c => !filters.fundType || c.fundType === filters.fundType);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">결의서 목록</h2>
          <p className="text-sm text-gray-400 mt-1">총 {total}건</p>
        </div>
      </div>
      <div className="card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Search size={18} className="text-gray-400" />
          <select value={filters.year} onChange={e => handleFilter('year', e.target.value)} className="input-field w-28">
            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={filters.month} onChange={e => handleFilter('month', e.target.value)} className="input-field w-24">
            <option value="">전체 월</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
          </select>
          <select value={filters.fundType} onChange={e => handleFilter('fundType', e.target.value)} className="input-field w-36">
            <option value="">전체 재원</option>
            <option value="DEPOSIT">입금전용계좌</option>
            <option value="EXPENSE">지출전용계좌</option>
          </select>
          <select value={filters.categoryId} onChange={e => handleFilter('categoryId', e.target.value)} className="input-field w-36">
            <option value="">전체 항목</option>
            {filteredCats.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <button onClick={() => setFilters({ year: new Date().getFullYear(), month: '', fundType: '', categoryId: '', page: 1 })} className="text-sm text-gray-500 hover:text-gray-700">초기화</button>
        </div>
      </div>
      {loading ? <div className="text-center text-gray-400 py-10">로딩 중...</div> : resolutions.length === 0 ? (
        <div className="text-center py-20">
          <FileCheck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">등록된 결의서가 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">품의서 목록에서 결의서를 작성할 수 있습니다.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-gray-500">
              <th className="text-left py-3 px-4 font-medium">결의번호</th>
              <th className="text-left py-3 px-4 font-medium">품의번호</th>
              <th className="text-center py-3 px-4 font-medium">재원</th>
              <th className="text-left py-3 px-4 font-medium">제목</th>
              <th className="text-right py-3 px-4 font-medium">품의금액</th>
              <th className="text-right py-3 px-4 font-medium">실집행</th>
            </tr></thead>
            <tbody>
              {resolutions.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer" onClick={() => navigate(`/resolutions/${r.id}`)}>
                  <td className="py-3 px-4 font-mono text-primary-600 font-medium">{r.resNumber}</td>
                  <td className="py-3 px-4 font-mono text-gray-400 text-xs">{r.document?.docNumber}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.document?.category?.fundType === 'DEPOSIT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {FUND_LABELS[r.document?.category?.fundType]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-800 font-medium max-w-xs truncate">{r.document?.title}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{formatMoney(r.document?.amount)}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">{formatMoney(r.actualAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))} disabled={filters.page <= 1} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-sm text-gray-500">{filters.page} / {totalPages}</span>
              <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))} disabled={filters.page >= totalPages} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResolutionListPage;
