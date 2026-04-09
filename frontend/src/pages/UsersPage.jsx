import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { UserPlus, Shield, User, Upload } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'USER', signRole: '담당' });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);

  const fetchUsers = () => { api.get('/auth/users').then(res => setUsers(res.data)); };
  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(name + ' 계정을 삭제하시겠습니까?')) return;
    try { await api.delete('/auth/users/' + id); fetchUsers(); } catch (err) { alert(err.response?.data?.error || '삭제에 실패했습니다.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try { await api.post('/auth/register', form); setForm({ name: '', username: '', password: '', role: 'USER', signRole: '담당' }); setShowForm(false); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || '등록에 실패했습니다.'); }
  };

  const handleStampUpload = async (userId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try { await api.put('/auth/stamp', { stampImage: reader.result, userId }); fetchUsers(); alert('도장이 등록되었습니다.'); } catch (err) { alert('도장 등록에 실패했습니다.'); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">사용자 관리</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><UserPlus size={18} /> 사용자 추가</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">새 사용자 등록</h3>
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="이름" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" required />
              <input type="text" placeholder="아이디" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="input-field" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="password" placeholder="비밀번호" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input-field" required />
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                <option value="USER">일반 사용자</option><option value="ADMIN">관리자</option>
              </select>
              <select value={form.signRole} onChange={e => setForm(p => ({ ...p, signRole: e.target.value }))} className="input-field">
                <option value="담당">담당</option><option value="이사">이사</option><option value="대표">대표</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">등록</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">취소</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b text-gray-500">
            <th className="text-left py-3 px-4 font-medium">이름</th><th className="text-left py-3 px-4 font-medium">아이디</th>
            <th className="text-center py-3 px-4 font-medium">권한</th><th className="text-center py-3 px-4 font-medium">서명 역할</th>
            <th className="text-center py-3 px-4 font-medium">도장</th><th className="text-center py-3 px-4 font-medium"></th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="py-3 px-4 font-medium text-gray-700">{u.name}</td>
                <td className="py-3 px-4 text-gray-500">{u.username}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'ADMIN' ? <Shield size={12} /> : <User size={12} />}{u.role === 'ADMIN' ? '관리자' : '사용자'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center"><span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{u.signRole || '미지정'}</span></td>
                <td className="py-3 px-4 text-center">
                  {u.stampImage ? (
                    <div className="flex items-center justify-center gap-2">
                      <img src={u.stampImage} className="h-8" alt="도장" />
                      <button onClick={() => { setUploadingId(u.id); fileInputRef.current?.click(); }} className="text-xs text-primary-500 hover:text-primary-700">변경</button>
                      <button onClick={async () => { if (!confirm(u.name + '의 도장을 삭제하시겠습니까?')) return; try { await api.put('/auth/stamp', { stampImage: null, userId: u.id }); fetchUsers(); } catch (err) { alert('삭제에 실패했습니다.'); } }} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </div>
                  ) : (
                    <button onClick={() => { setUploadingId(u.id); fileInputRef.current?.click(); }} className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1 mx-auto"><Upload size={12} /> 등록</button>
                  )}
                </td>
                <td className="py-3 px-4 text-center"><button onClick={() => handleDelete(u.id, u.name)} className="text-xs text-red-400 hover:text-red-600">삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (uploadingId) handleStampUpload(uploadingId, e); }} />
      </div>
    </div>
  );
};

export default UsersPage;
