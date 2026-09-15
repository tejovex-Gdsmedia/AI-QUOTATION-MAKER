import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  FileText,
  Plus,
  Loader2,
  Trash2,
  FileEdit,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  
  // Profile settings presence state
  const [profileExists, setProfileExists] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [metrics, setMetrics] = useState({
    total: 0,
    accepted: 0,
    drafts: 0
  });

  useEffect(() => {
    if (user) {
      checkProfile();
      fetchDashboardData();
    }
  }, [user]);

  const checkProfile = async () => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, api_cost_rules')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        setProfileExists(false);
      } else if (data) {
        const apiRules = data.api_cost_rules || {};
        if (!data.company_name || !apiRules.company_description || !apiRules.services_offered) {
          setProfileExists(false);
        } else {
          setProfileExists(true);
        }
      } else {
        setProfileExists(false);
      }
    } catch (err) {
      console.error('Error checking company profile settings:', err.message);
      setProfileExists(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*, clients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotations(data || []);

      const total = data.length;
      const accepted = data.filter(q => q.status === 'Accepted').length;
      const drafts = data.filter(q => q.status === 'Draft' || q.status === 'Generated').length;

      setMetrics({ total, accepted, drafts });
    } catch (err) {
      console.error('Error fetching dashboard pipeline data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 6000);
  };

  const handleDeleteQuotation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation? This action is permanent.')) return;
    
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setQuotations(prev => prev.filter(q => q.id !== id));
      setMetrics(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
      showToast('success', 'Quotation deleted successfully.');
    } catch (err) {
      console.error('Error deleting quotation:', err.message);
      showToast('error', 'Failed to delete quotation: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="main-content" style={{ padding: '24px' }}>
      
      {/* Toast Notification */}
      {message.text && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Quotation Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '4px 0 0 0' }}>Track and manage all generated automation quotations</p>
        </div>
        <Link to="/quotation/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
          <Plus size={16} /> Generate Quotation
        </Link>
      </div>

      {/* Non-intrusive Profile Setup Banner */}
      {!profileLoading && !profileExists && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '10px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building size={20} style={{ color: 'var(--primary-color)' }} />
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Set up your Company Profile</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Add your brand details and pricing packages in Settings to personalize your quotes.</p>
            </div>
          </div>
          <Link to="/settings" className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }}>
            Configure Profile
          </Link>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <Loader2 className="spin" size={32} style={{ color: 'var(--primary-color)' }} />
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Loading pipeline history...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3" style={{ gap: '20px', marginBottom: '32px' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)' }}>
                <FileText size={20} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Quotations</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.total}</h3>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Accepted Quotations</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.accepted}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
                <Clock size={20} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending / Drafts</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.drafts}</h3>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0px', overflow: 'hidden', borderRadius: '12px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Quotation History Log</h3>
            </div>
            
            {quotations.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 20px' }}>
                <FileText size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)', display: 'block' }} />
                <p style={{ fontSize: '15px', fontWeight: 700 }}>No quotations generated yet</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Click "Generate Quotation" to launch the step-by-step AI composer.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', fontSize: '12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '14px 24px' }}>Quote ID</th>
                      <th style={{ padding: '14px 24px' }}>Client Business</th>
                      <th style={{ padding: '14px 24px' }}>Quotation Title</th>
                      <th style={{ padding: '14px 24px' }}>Industry</th>
                      <th style={{ padding: '14px 24px' }}>Status</th>
                      <th style={{ padding: '14px 24px' }}>Created Date</th>
                      <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '13.5px' }}>
                    {quotations.map((q) => (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 24px', fontWeight: 700 }}>{q.quotation_number}</td>
                        <td style={{ padding: '14px 24px', fontWeight: 600 }}>{q.clients?.company_name || 'Unlinked Business'}</td>
                        <td style={{ padding: '14px 24px' }}>{q.proposal_title}</td>
                        <td style={{ padding: '14px 24px', color: 'var(--text-secondary)' }}>{q.industry || 'General'}</td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 
                              q.status === 'Accepted' ? '#10b98112' : 
                              q.status === 'Draft' || q.status === 'Generated' ? '#6b728012' : '#3b82f612',
                            color: 
                              q.status === 'Accepted' ? '#10b981' : 
                              q.status === 'Draft' || q.status === 'Generated' ? '#6b7280' : '#3b82f6'
                          }}>
                            {q.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px', color: 'var(--text-muted)' }}>
                          {new Date(q.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Link to={`/quotation/${q.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                              <FileEdit size={13} /> Edit
                            </Link>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '12.5px', color: '#ef4444' }}
                              onClick={() => handleDeleteQuotation(q.id)}
                              disabled={deletingId === q.id}
                            >
                              {deletingId === q.id ? <Loader2 className="spin" size={13} /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
