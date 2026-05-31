import React, { useState } from 'react';
import { supabase } from '../supabase';

interface LoginProps {
  onLoginSuccess: (token: string, email: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError || !session) {
        throw new Error(authError?.message ?? 'Giriş başarısız.');
      }

      // Verify if user is an admin by querying their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        // Sign out immediately if not authorized
        await supabase.auth.signOut();
        throw new Error('Yetkisiz erişim. Admin yetkiniz bulunmamaktadır.');
      }

      onLoginSuccess(session.access_token, session.user.email ?? '');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <p className="eyebrow">The Message Admin</p>
          <h1>Yönetim Paneli Girişi</h1>
        </div>

        {error && <p className="login-error">{error}</p>}

        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@themessage.com"
            disabled={loading}
            required
          />
        </label>

        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
