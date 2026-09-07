import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  Save,
  Loader2,
  AlertCircle,
  Building2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // CRM Profile States
  const [companyName, setCompanyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Collapsible section visibility state
  const [showOptional, setShowOptional] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Interactive Tags for Services Offered
  const [servicesOffered, setServicesOffered] = useState([]);
  const [newServiceInput, setNewServiceInput] = useState('');

  // Dynamic pricing packages array (initially empty)
  const [pricingPackages, setPricingPackages] = useState([]);

  // Pull settings from Supabase on mount
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setCompanyName(data.company_name || '');
          setBrandName(data.brand_name || '');
          setEmail(data.email || user.email || '');
          setPhone(data.phone || '');
          setWebsite(data.website || '');
          setAddress(data.address || '');

          const apiRules = data.api_cost_rules || {};
          setCompanyDescription(apiRules.company_description || '');

          const rawServices = apiRules.services_offered || '';
          const servicesArr = rawServices
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          setServicesOffered(servicesArr);

          const rawPackages = data.default_packages;
          if (Array.isArray(rawPackages)) {
            setPricingPackages(rawPackages);
          } else if (rawPackages && typeof rawPackages === 'object') {
            const legacyPackages = Object.entries(rawPackages).map(([name, val]) => ({
              name: name,
              price: val?.price || '',
              description: val?.description || val?.features?.join(', ') || ''
            }));
            setPricingPackages(legacyPackages);
          }

          const primary = data.brand_colors?.primary || '#2563eb';
          document.documentElement.style.setProperty('--primary-color', primary);
        } else {
          setEmail(user.email || '');
        }
      } catch (err) {
        console.error(err.message);
        showToast('error', `Failed to load settings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 6000);
  };

  // Add Service with uniqueness and trim check
  const handleAddService = (e) => {
    if (e) e.preventDefault();
    const cleanTag = newServiceInput.trim();
    if (!cleanTag) return;

    if (servicesOffered.some(s => s.toLowerCase() === cleanTag.toLowerCase())) {
      showToast('error', `Service tag "${cleanTag}" already exists.`);
      return;
    }

    setServicesOffered([...servicesOffered, cleanTag]);
    setNewServiceInput('');
  };

  const handleRemoveService = (indexToRemove) => {
    setServicesOffered(servicesOffered.filter((_, idx) => idx !== indexToRemove));
  };

  // Dynamic Packages Handlers
  const handleAddPackage = () => {
    setPricingPackages([...pricingPackages, { name: '', price: '', description: '' }]);
  };

  const handleRemovePackage = (indexToRemove) => {
    setPricingPackages(pricingPackages.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePackageChange = (index, field, value) => {
    const updated = pricingPackages.map((pkg, idx) => {
      if (idx === index) {
        return { ...pkg, [field]: value };
      }
      return pkg;
    });
    setPricingPackages(updated);
  };

  const handleMovePackage = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pricingPackages.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...pricingPackages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPricingPackages(updated);
  };

  // STRICT VALIDATION
  const validateForm = () => {
    if (!companyName.trim()) return 'Company Name is required.';
    if (!email.trim()) return 'Business Email is required.';
    
    // Email regex format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';

    // Phone format (at least 7 digits)
    if (!phone.trim()) return 'Business Phone Number is required.';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) return 'Please enter a valid phone number (at least 7 digits).';

    if (!companyDescription.trim()) return 'About Company description is required.';
    if (servicesOffered.length === 0) return 'Please configure at least one service offered tag.';

    // Packages validations
    if (pricingPackages.length === 0) return 'Configure at least one pricing package.';

    // Check duplicate names & blank prices
    const packageNames = new Set();
    for (const pkg of pricingPackages) {
      const name = pkg.name.trim();
      const price = pkg.price.trim();
      if (!name) return 'Package names cannot be empty.';
      if (!price) return 'Package prices cannot be empty.';
      
      const lowerName = name.toLowerCase();
      if (packageNames.has(lowerName)) {
        return `Duplicate package name detected: "${name}". Package names must be unique.`;
      }
      packageNames.add(lowerName);
    }

    return null;
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('error', 'Session expired. Please sign in again.');
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

      const response = await fetch(`${apiBaseUrl}/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          access_token: session.access_token
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account.');
      }

      // Sign out locally after successful deletion
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (err) {
      console.error('Account deletion error:', err.message);
      showToast('error', err.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const validationError = validateForm();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        company_name: companyName.trim(),
        brand_name: brandName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
        brand_colors: { primary: '#2563eb', secondary: '#0f172a' },
        api_cost_rules: {
          company_description: companyDescription.trim(),
          services_offered: servicesOffered.join(', ')
        },
        default_packages: pricingPackages.map(p => ({
          name: p.name.trim(),
          price: p.price.trim(),
          description: p.description.trim()
        })),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('company_settings')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      showToast('success', 'Company Profile updated successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err.message);
      showToast('error', `Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--primary-color)' }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      
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

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)' }}>
          <Building2 size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Company Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Set up your company profile once. These details will automatically be used in every quotation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Required Corporate Details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', borderRadius: '12px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Company Information
          </h3>
          <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Company Legal Name *</label>
              <input
                type="text"
                placeholder="E.g. GDS Media"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Sales Email *</label>
              <input
                type="email"
                placeholder="E.g. sales@aiworksforyou.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                placeholder="E.g. +91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Collapsible More Details Accordion */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              outline: 'none',
              textAlign: 'left'
            }}
          >
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              More Details (Optional)
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--primary-color)', fontWeight: 600 }}>
              {showOptional ? 'Hide Details' : 'Show Details'}
            </span>
          </button>

          {showOptional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    placeholder="E.g. AI WorksForYou"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Website URL</label>
                  <input
                    type="url"
                    placeholder="E.g. https://aiworksforyou.com"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Corporate Address</label>
                <textarea
                  rows={2}
                  placeholder="Enter physical corporate address..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Services & Description */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', borderRadius: '12px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Services & Description
          </h3>
          <div className="form-group">
            <label>About Company (Business Description) *</label>
            <textarea
              rows={3}
              placeholder="Describe your company background in simple English..."
              value={companyDescription}
              onChange={e => setCompanyDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Services Offered *</label>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              minHeight: '44px',
              backgroundColor: 'var(--bg-primary)',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              {servicesOffered.map((service, index) => (
                <div key={index} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}>
                  <span>{service}</span>
                  <button type="button" onClick={() => handleRemoveService(index)} style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder={servicesOffered.length === 0 ? "Type a service (e.g. WhatsApp Automation) and press Enter" : "Add more..."}
                value={newServiceInput}
                onChange={e => setNewServiceInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddService();
                  } else if (e.key === 'Backspace' && newServiceInput === '' && servicesOffered.length > 0) {
                    setServicesOffered(servicesOffered.slice(0, -1));
                  }
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '4px 0',
                  flexGrow: 1,
                  minWidth: '180px',
                  boxShadow: 'none',
                  fontSize: '13px',
                  backgroundColor: 'transparent'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Press Enter or click Add to save tag. Services will be whitelisted for Gemini.
              </span>
              <button type="button" onClick={() => handleAddService()} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                + Add tag
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Packages Settings */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Pricing Packages
            </h3>
            <button type="button" onClick={handleAddPackage} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <Plus size={14} /> Add Package
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pricingPackages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No pricing packages added yet.
              </div>
            ) : (
              pricingPackages.map((pkg, index) => (
                <div key={index} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  position: 'relative'
                }}>
                  {/* Actions Toolbar */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => handleMovePackage(index, 'up')} className="btn btn-secondary" style={{ padding: '4px' }} disabled={index === 0} title="Move Up">
                      <ArrowUp size={12} />
                    </button>
                    <button type="button" onClick={() => handleMovePackage(index, 'down')} className="btn btn-secondary" style={{ padding: '4px' }} disabled={index === pricingPackages.length - 1} title="Move Down">
                      <ArrowDown size={12} />
                    </button>
                    <button type="button" onClick={() => handleRemovePackage(index)} className="btn btn-secondary" style={{ padding: '4px', color: '#ef4444' }} title="Delete Package">
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginRight: '110px', alignItems: 'end' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Package Name *</label>
                      <input
                        type="text"
                        placeholder="Example: Basic Plan"
                        value={pkg.name}
                        onChange={e => handlePackageChange(index, 'name', e.target.value)}
                        required
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Price *</label>
                      <input
                        type="text"
                        placeholder="Example: ₹15,000/month"
                        value={pkg.price}
                        onChange={e => handlePackageChange(index, 'price', e.target.value)}
                        required
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Description (Optional)</label>
                      <input
                        type="text"
                        placeholder="Example: WhatsApp Automation + CRM Integration"
                        value={pkg.description}
                        onChange={e => handlePackageChange(index, 'description', e.target.value)}
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="submit" className="btn btn-primary" style={{ minWidth: '180px', padding: '12px' }} disabled={saving}>
            {saving ? <Loader2 className="spin" size={16} /> : <><Save size={16} /> Save Company Profile</>}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div style={{
        marginTop: '32px',
        border: '1px solid #fca5a5',
        borderRadius: '12px',
        padding: '24px',
        backgroundColor: '#fff5f5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldAlert size={20} style={{ color: '#ef4444' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '16px', lineHeight: 1.5 }}>
          Permanently delete your account and all associated data — company profile, clients, quotations, and version history.
          This action <strong>cannot be undone</strong>.
        </p>
        <button
          type="button"
          onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ef4444',
            backgroundColor: 'transparent',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Delete My Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ef4444', margin: 0 }}>Delete Account</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              This will permanently delete your account and <strong>all data</strong> including clients, quotations, and your company profile. There is no recovery.
            </p>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                style={{ marginTop: '6px' }}
                autoComplete="off"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: deleteConfirmText === 'DELETE' ? '#ef4444' : '#fca5a5',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {deleting ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
