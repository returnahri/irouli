import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentNewPage from './pages/DocumentNewPage';
import DocumentListPage from './pages/DocumentListPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import DocumentEditPage from './pages/DocumentEditPage';
import ResolutionNewPage from './pages/ResolutionNewPage';
import ResolutionListPage from './pages/ResolutionListPage';
import ResolutionDetailPage from './pages/ResolutionDetailPage';
import ResolutionEditPage from './pages/ResolutionEditPage';
import BudgetPage from './pages/BudgetPage';
import UsersPage from './pages/UsersPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentListPage /></ProtectedRoute>} />
          <Route path="/documents/new" element={<ProtectedRoute><DocumentNewPage /></ProtectedRoute>} />
          <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />
          <Route path="/documents/:id/edit" element={<ProtectedRoute><DocumentEditPage /></ProtectedRoute>} />
          <Route path="/resolutions" element={<ProtectedRoute><ResolutionListPage /></ProtectedRoute>} />
          <Route path="/resolutions/new" element={<ProtectedRoute><ResolutionNewPage /></ProtectedRoute>} />
          <Route path="/resolutions/:id" element={<ProtectedRoute><ResolutionDetailPage /></ProtectedRoute>} />
          <Route path="/resolutions/:id/edit" element={<ProtectedRoute><ResolutionEditPage /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
