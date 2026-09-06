import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Plus, Search, Mail, Phone, Building, Trash2, Edit3, Loader2, Sparkles, AlertCircle, X } from 'lucide-react';

export default function Clients() {
  const { user } = useAuth();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClientId, setCurrentClientId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    industry: 'AI Automation'
  });

  // Fetch clients on mount
  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err.message);
      setMessage({ type: 'error', text: `Failed to load clients: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({ name: '', company_name: '', email: '', phone: '', address: '', industry: 'AI Automation' });
    setIsEditing(false);
    setCurrentClientId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (client) => {
    setFormData({
      name: client.name,
      company_name: client.company_name,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      industry: client.industry || 'AI Automation'
    });
    setIsEditing(true);
    setCurrentClientId(client.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    // Basic Validation
    if (!formData.name.trim() || !formData.company_name.trim() || !formData.email.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Name, Company, Email).' });
      setSaving(false);
      return;
    }

    try {
      if (isEditing) {
        // Update client
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            company_name: formData.company_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            industry: formData.industry,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentClientId)
          .eq('user_id', user.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Client contact details updated successfully!' });
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: formData.name,
            company_name: formData.company_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            industry: formData.industry
          });

        if (error) throw error;
        setMessage({ type: 'success', text: 'New client registered successfully!' });
      }

      setShowModal(false);
      fetchClients();
    } catch (err) {
      console.error('Error saving client:', err.message);
      setMessage({ type: 'error', text: `Failed to save client details: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This action will unlink associated quotation records.')) {
      return;
    }

    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setClients(clients.filter(c => c.id !== clientId));
      setMessage({ type: 'success', text: 'Client deleted successfully!' });
    } catch (err) {
      console.error('Error deleting client:', err.message);
      setMessage({ type: 'error', text: `Failed to delete client: ${err.message}` });
    }
  };

  // Filter client cards based on search query
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Client Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Register and manage your accounts directory</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={16} /> Add New Client
        </button>
      </div>

      {message.text && (
        <div style={{
          backgroundColor: message.type === 'success' ? '#10b98115' : '#ef444415',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          padding: '16px 24px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px',
          fontWeight: 6,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'success' ? <Sparkles size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Search Input Card */}
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 24px' }}>
        <Search size={20} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter by contact name, company domain, email, or vertical..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ border: 'none', background: 'transparent', padding: '0px', flex: 1 }}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="spin" size={32} style={{ color: 'var(--primary-color)' }} />
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Querying clients catalog...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <Building size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)', display: 'block' }} />
          <p style={{ fontSize: '16px', fontWeight: 6 }}>No client records found</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {searchQuery ? 'Adjust your search parameters' : 'Register your first client to start creating quotations'}
          </p>
        </div>
      ) : (
        /* Clients Grid Layout */
        <div className="grid grid-cols-2">
          {filteredClients.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 7 }}>{c.name}</h3>
                  <p style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 6, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Building size={14} /> {c.company_name}
                  </p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 6, textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {c.industry || 'General'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)', minWidth: '16px' }} /> {c.email}
                </div>
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)', minWidth: '16px' }} /> {c.phone}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '13px' }} 
                  onClick={() => handleOpenEditModal(c)}
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '13px', color: '#ef4444' }} 
                  onClick={() => handleDeleteClient(c.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1001 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>{isEditing ? 'Modify Client Contact' : 'Register Client Profile'}</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Contact Full Name *</label>
                <input 
                  type="text" 
                  placeholder="E.g. John Doe" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Client Company Name *</label>
                <input 
                  type="text" 
                  placeholder="E.g. Acme Corp" 
                  value={formData.company_name} 
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Primary Email Address *</label>
                <input 
                  type="email" 
                  placeholder="E.g. manager@acme.com" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Contact Phone Number</label>
                <input 
                  type="text" 
                  placeholder="E.g. +91 98765 43210" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label>Industry Verticals / Categories</label>
                <input 
                  type="text" 
                  placeholder="E.g. Healthcare, Real Estate, E-commerce" 
                  value={formData.industry} 
                  onChange={e => setFormData({ ...formData, industry: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label>Company Corporate Address</label>
                <textarea 
                  rows={2} 
                  placeholder="Office address info" 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="spin" size={14} /> Saving...
                    </>
                  ) : (
                    'Save Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
