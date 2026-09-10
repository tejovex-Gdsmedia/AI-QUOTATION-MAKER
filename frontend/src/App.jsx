import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, LogOut, Sun, Moon, Building } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Import Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import QuotationForm from './pages/QuotationForm';
import { isSupabaseConfigured } from './supabaseClient';


function LayoutShell({ children }) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'New Quotation', path: '/quotation/new', icon: <FileText size={18} /> },
    { label: 'Clients CRM', path: '/clients', icon: <Users size={18} /> },
    { label: 'Company Profile', path: '/settings', icon: <Building size={18} /> }
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === '/dashboard' || itemPath === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (itemPath === '/quotation/new') {
      return location.pathname.startsWith('/quotation');
    }
    return location.pathname === itemPath || location.pathname.startsWith(itemPath + '/');
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    const meta = user.user_metadata || user.raw_user_meta_data || {};
    if (meta.name && String(meta.name).trim()) return String(meta.name).trim();
    if (meta.full_name && String(meta.full_name).trim()) return String(meta.full_name).trim();
    if (meta.display_name && String(meta.display_name).trim()) return String(meta.display_name).trim();

    const identityData = user.identities?.[0]?.identity_data;
    if (identityData?.name && String(identityData.name).trim()) return String(identityData.name).trim();
    if (identityData?.full_name && String(identityData.full_name).trim()) return String(identityData.full_name).trim();

    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      const cleaned = emailPrefix
        .replace(/[._-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (cleaned) return cleaned;
      return user.email;
    }
    return 'Sales Manager';
  };

  const displayName = getUserDisplayName();
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 8 }}>
            Q
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 8, letterSpacing: '-0.5px' }}>QuoteSaaS</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          {/* User info stub */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 6 }}>
              {avatarInitial}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 6 }}>{displayName}</p>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sales Manager</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '8px'
              }}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={signOut}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 6
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Pages Render */}
      <div style={{ flex: 1, paddingBottom: '70px' }}>
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav-bar">
        {menuItems.map((item) => {
          const isActive = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading SaaS platform...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <LayoutShell>{children}</LayoutShell>;
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 8, color: '#fff', marginBottom: '24px' }}>
            Q
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', letterSpacing: '-0.5px' }}>Configuration Required</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
            The frontend application is missing valid Supabase environment variables. Please set them up in your environment to unlock authentication and database features.
          </p>
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px', textAlign: 'left' }}>
            <p style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Quick Setup Instructions:</p>
            <ol style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, paddingLeft: '18px', margin: 0 }}>
              <li style={{ marginBottom: '6px' }}>Copy <b>frontend/.env.example</b> to <b>frontend/.env</b>.</li>
              <li style={{ marginBottom: '6px' }}>Input your actual <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>.</li>
              <li>Restart your local Vite server to load the new environment variables.</li>
            </ol>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
            Direct database operations and profile preferences rely on standard connection parameters. Need help? View the README.md setup guide.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth Route */}
            <Route path="/auth" element={<Auth />} />

            {/* Protected SaaS App Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/quotation/new" element={<ProtectedRoute><QuotationForm /></ProtectedRoute>} />
            <Route path="/quotation/:id" element={<ProtectedRoute><QuotationForm /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
