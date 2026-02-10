import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      }
    } catch {
      // Not logged in
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  async function verifyAge() {
    const res = await fetch('/api/auth/age-verify', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      setUser(prev => prev ? { ...prev, ageVerified: true } : null);
      return true;
    }
    return false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, verifyAge, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
