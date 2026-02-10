import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './components/Auth/LoginPage.jsx';
import AppLayout from './components/Layout/AppLayout.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-discord-dark">
        <div className="text-discord-lightest text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/login" />} />
    </Routes>
  );
}
