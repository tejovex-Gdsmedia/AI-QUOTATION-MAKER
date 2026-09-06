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
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  
  // Profile settings presence state
  const [profileExists, setProfileExists] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Dynamic CRM Profile States for setup card
  const [companyName, setCompanyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Collapsible section visibility state
  const [showOptional, setShowOptional] = useState(false);

  // Interactive tag inputs
  const [servicesOffered, setServicesOffered] = useState([]);
  const [newServiceInput, setNewServiceInput] = useState('');

  // Dynamic pricing package states (initially empty)
  const [pricingPackages, setPricingPackages] = useState([]);

  const [metrics, setMetrics] = useState({
    total: 0,
    accepted: 0,
    drafts: 0
  });

  useEffect(() => {
    if (user) {
      checkProfile();
    }
  }, [user]);

  const checkProfile = async () => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        setProfileExists(false);
        setEmail(user.email || '');
      } else if (data) {
        const apiRules = data.api_cost_rules || {};
        if (!data.company_name || !apiRules.company_description || !apiRules.services_offered) {
          setProfileExists(false);
          setCompanyName(data.company_name || '');
          setBrandName(data.brand_name || '');
          setEmail(data.email || user.email || '');
          setPhone(data.phone || '');
          setWebsite(data.website || '');
          setAddress(data.address || '');
          setCompanyDescription(apiRules.company_description || '');

          const servicesArr = (apiRules.services_offered || '')
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
        } else {
          setProfileExists(true);
          fetchDashboardData();
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

  // Add/Remove services tags with trimming and duplicate check
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

  // Dynamic pricing package inputs
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

  // Setup Form strict validation checks
  const validateProfileForm = () => {
    if (!companyName.trim()) return 'Company Name is required.';
    if (!email.trim()) return 'Sales Email is required.';
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';

    // Phone digits validation
    if (!phone.trim()) return 'Phone Number is required.';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) return 'Please enter a valid phone number (at least 7 digits).';

    if (!companyDescription.trim()) return 'About Company description is required.';
    if (servicesOffered.length === 0) return 'Configure at least one service offered tag.';

    // Packages validation checks
    if (pricingPackages.length === 0) return 'At least one pricing package is required.';
    
    const packageNames = new Set();
    for (const pkg of pricingPackages) {
      const name = pkg.name.trim();
      const price = pkg.price.trim();
      if (!name) return 'Package level names cannot be empty.';
      if (!price) return 'Package prices cannot be empty.';
      
      const lowerName = name.toLowerCase();
      if (packageNames.has(lowerName)) {
        return `Duplicate package name detected: "${name}". Package names must be unique.`;
      }
      packageNames.add(lowerName);
    }

    return null;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    const validationError = validateProfileForm();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        user_id: user.id,
        company_name: companyName.trim(),
        brand_name: brandName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
        logo_url: '',
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
      
      showToast('success', 'Profile saved successfully!');
      setProfileExists(true);
      fetchDashboardData();
    } catch (err) {
      console.error('Profile save error:', err.message);
      showToast('error', 'Failed to save company profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--primary-color)' }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontWeight: 6 }}>Verifying profile setup...</p>
      </div>
    );
  }

  // Setup screen
  if (!profileExists) {
    return (
      <div className="main-content" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        
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

        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: 'var(--shadow-lg)', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Building size={24} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Company Profile</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>
              Set up your company profile once. These details will automatically be used in every quotation.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Required Primary Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Company Name *</label>
                <input
                  type="text"
                  placeholder="E.g. GDS Media"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Sales Email *</label>
                  <input
                    type="email"
                    placeholder="E.g. sales@aiworksforyou.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Phone Number *</label>
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

            {/* Collapsible More Details drawer */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
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
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>More Details (Optional)</span>
                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 600 }}>{showOptional ? 'Hide Details' : 'Show Details'}</span>
              </button>

              {showOptional && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '12px' }}>Brand Name</label>
                      <input
                        type="text"
                        placeholder="E.g. AI WorksForYou"
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '12px' }}>Website Link</label>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '12px' }}>Corporate Address</label>
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

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '13px' }}>About Company (Description) *</label>
              <textarea
                rows={2}
                placeholder="E.g. We are an AI agency specialized in streamlining retail checkout and email marketing automations."
                value={companyDescription}
                onChange={e => setCompanyDescription(e.target.value)}
                required
              />
            </div>

            {/* Services Offered Tag Input */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '13px' }}>Services Offered *</label>
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
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    <span>{service}</span>
                    <button type="button" onClick={() => handleRemoveService(index)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary-color)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder={servicesOffered.length === 0 ? "Type service and press Enter" : "Add service..."}
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
                  style={{ border: 'none', outline: 'none', padding: '4px 0', flexGrow: 1, minWidth: '150px', backgroundColor: 'transparent', boxShadow: 'none', fontSize: '13px' }}
                />
              </div>
              <button type="button" onClick={() => handleAddService()} className="btn btn-secondary" style={{ float: 'right', padding: '4px 8px', fontSize: '11px' }}>
                + Add tag
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

            {/* Dynamic Packages setup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--primary-color)' }}>Pricing Packages</h3>
              <button type="button" onClick={handleAddPackage} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                + Add Package
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pricingPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No pricing packages added yet.
                </div>
              ) : (
                pricingPackages.map((pkg, index) => (
                  <div key={index} style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                      <button type="button" onClick={() => handleMovePackage(index, 'up')} className="btn btn-secondary" style={{ padding: '3px' }} disabled={index === 0}><ArrowUp size={11} /></button>
                      <button type="button" onClick={() => handleMovePackage(index, 'down')} className="btn btn-secondary" style={{ padding: '3px' }} disabled={index === pricingPackages.length - 1}><ArrowDown size={11} /></button>
                      <button type="button" onClick={() => handleRemovePackage(index)} className="btn btn-secondary" style={{ padding: '3px', color: '#ef4444' }}><Trash2 size={11} /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginRight: '80px', alignItems: 'end' }}>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, marginTop: '10px' }} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="spin" size={18} /> : 'Save Company Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Listing
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Quotation Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '4px 0 0 0' }}>Track and manage all generated automation quotations</p>
        </div>
        <Link to="/quotation/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
          <Plus size={16} /> Generate Quotation
        </Link>
      </div>

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
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 6, textTransform: 'uppercase' }}>Total Quotations</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.total}</h3>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 6, textTransform: 'uppercase' }}>Accepted Quotations</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.accepted}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
                <Clock size={20} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 6, textTransform: 'uppercase' }}>Pending / Drafts</span>
                <h3 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 800 }}>{metrics.drafts}</h3>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0px', overflow: 'hidden', borderRadius: '12px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Quotation History Log</h3>
            </div>
            
            {quotations.length === 0 ? (
              <div style={{ textColor: 'var(--text-secondary)', textAlign: 'center', padding: '60px 20px' }}>
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
