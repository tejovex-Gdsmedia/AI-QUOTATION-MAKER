import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound, Mail, User, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to Dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await signUp(email, password, name);
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          setInfo('Registration successful! Please check your email inbox to confirm your account, or try signing in.');
          setIsSignUp(false);
        }
      } else {
        const { data, error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message);
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
            color: 'var(--primary-color)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <KeyRound size={24} />
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
            {isSignUp ? 'Create SaaS Account' : 'Sign In to SaaS Platform'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            AI-Powered Proposal & Quotations Generator
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ef444415',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {info && (
          <div style={{
            backgroundColor: '#10b98115',
            color: '#10b981',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {info}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="sales@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '8px' }} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" /> Processing...
              </>
            ) : (
              isSignUp ? 'Get Started' : 'Sign In'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setInfo('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontWeight: 6,
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Sign In' : 'Create One'}
          </button>
        </div>
      </div>
    </div>
  );
}
