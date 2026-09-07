import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { normalizeQuotation } from '../utils/normalizeQuotation';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileDown,
  Building,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  Share2,
  Mail,
  MessageSquare,
  Link2,
  Printer
} from 'lucide-react';

const DEFAULT_COMPANY_SETTINGS = {
  company_name: 'GDS MEDIA',
  brand_name: 'AI WORKSFORYOU',
  email: 'info@provider.com',
  phone: '+1234567890',
  website: '',
  address: '',
  brand_colors: { primary: '#2563eb', secondary: '#0f172a' },
  api_cost_rules: {
    company_description: 'We build simple automation systems for local businesses.',
    services_offered: 'WhatsApp Automation, Lead Qualification, CRM Sync, Appointment Booking, Email Automation'
  },
  default_packages: []
};

export default function QuotationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Database IDs
  const [quotationId, setQuotationId] = useState(id || null);
  const [quotationNumber, setQuotationNumber] = useState('');

  // Company Settings
  const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);

  // Simplified Form Inputs
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Retail');
  const [requirement, setRequirement] = useState('');
  const [clientEmail, setClientEmail] = useState(''); // Optional
  const [clientPhone, setClientPhone] = useState(''); // Optional

  // Structured AI Proposal Data
  const [proposalData, setProposalData] = useState(null);

  // Inline Section Editing States
  const [editingSection, setEditingSection] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef(null);

  // PDF Storage sharing
  const [pdfUrl, setPdfUrl] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  // Tracks any in-flight upload so share handlers can await the same promise
  const pdfUploadPromiseRef = useRef(null);

  // Close dropdown on Escape key and outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowShareDropdown(false);
      }
    };

    const handleClickOutside = (event) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target)) {
        setShowShareDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      try {
        setLoading(true);

        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        let activeSettings = DEFAULT_COMPANY_SETTINGS;

        if (settingsData) {
          activeSettings = {
            ...DEFAULT_COMPANY_SETTINGS,
            ...settingsData,
            api_cost_rules: {
              ...DEFAULT_COMPANY_SETTINGS.api_cost_rules,
              ...(settingsData.api_cost_rules || {})
            },
            default_packages: settingsData.default_packages || DEFAULT_COMPANY_SETTINGS.default_packages
          };
          setCompanySettings(activeSettings);
        }

        const primary = activeSettings.brand_colors?.primary || '#2563eb';
        document.documentElement.style.setProperty('--primary-color', primary);

        if (isEditMode) {
          const { data: quote, error: quoteError } = await supabase
            .from('quotations')
            .select('*, clients(*)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

          if (quoteError) throw quoteError;

          setQuotationId(quote.id);
          setQuotationNumber(quote.quotation_number);
          setIndustry(quote.industry || 'Retail');
          setRequirement(quote.requirements || '');

          if (quote.clients) {
            setClientName(quote.clients.name || '');
            setCompanyName(quote.clients.company_name || '');
            setClientEmail(quote.clients.email || '');
            setClientPhone(quote.clients.phone || '');
          }

          const { data: qVersions, error: verError } = await supabase
            .from('quotation_versions')
            .select('*')
            .eq('quotation_id', id)
            .order('version_number', { ascending: false });

          if (verError) throw verError;

          if (qVersions && qVersions.length > 0) {
            const normalized = normalizeQuotation(qVersions[0].proposal_data, quote, activeSettings);
            setProposalData(normalized);
          }
        } else {
          setQuotationNumber(`QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } catch (err) {
        console.error('Error loading page details:', err.message);
        showToast('error', `Failed to load details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id, user]);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 6000);
  };

  // Centralized normalization is now handled by normalizeQuotation import.

  // CLIENT FORM STRICT VALIDATIONS
  const validateClientInputs = () => {
    if (!clientName.trim()) return 'Client Contact Name is required.';
    if (!companyName.trim()) return 'Client Business Name is required.';
    if (!requirement.trim()) return 'Client Requirement description is required.';
    if (requirement.trim().length < 10) return 'Client Requirement description must be at least 10 characters long.';

    if (clientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail.trim())) {
        return 'Please enter a valid client email address.';
      }
    }

    if (clientPhone.trim()) {
      const phoneDigits = clientPhone.replace(/\D/g, '');
      if (phoneDigits.length < 7) {
        return 'Please enter a valid client phone number (at least 7 digits).';
      }
    }

    return null;
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();

    const validationError = validateClientInputs();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    // Verify company profile has settings
    if (!companySettings.company_name) {
      showToast('error', 'Your Company Profile settings are empty. Please fill in Settings first.');
      return;
    }

    setGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

      const response = await fetch(`${apiBaseUrl}/generate-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({

          company_settings: companySettings,
          client_details: {
            name: clientName.trim(),
            company_name: companyName.trim(),
            industry: industry,
            email: clientEmail.trim(),
            phone: clientPhone.trim()
          },
          prompt_template: industry,
          requirements: requirement.trim(),
          pain_points: '',
          roi_input: {}
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error generating quotation');
      }

      const generatedQuotation = await response.json();
      const normalized = normalizeQuotation(generatedQuotation, {}, companySettings, {
        clientName: clientName.trim(),
        companyName: companyName.trim(),
        industry: industry,
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        requirement: requirement.trim(),
        quotationNumber: quotationNumber
      });
      setProposalData(normalized);
      setPdfUrl(null); // clear any previous PDF URL for this session

      showToast('success', 'AI Quotation generated successfully!');
      const savedId = await handleSaveQuotation(normalized);

      // Auto-upload PDF to Supabase Storage in the background so it's ready
      // before the user clicks Share. Errors are handled silently here — the
      // share handlers will retry and surface a clear toast if needed.
      generateAndUploadPdf(normalized, savedId).catch(() => {});
    } catch (err) {
      console.error('Proposal generation error:', err.message);
      showToast('error', `Generation failed: ${err.message}. Please verify backend server and Gemini API Key connection and retry.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveQuotation = async (dataToSave) => {
    try {
      setSaving(true);
      let activeClientId = null;
      
      const clientNameVal = dataToSave.clientContactName || clientName.trim();
      const companyNameVal = dataToSave.clientBusinessName || companyName.trim();
      const clientEmailVal = dataToSave.email || clientEmail.trim();
      const clientPhoneVal = dataToSave.phone || clientPhone.trim();
      const industryVal = dataToSave.industry || industry;

      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_name', companyNameVal)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        activeClientId = existingClients[0].id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: clientNameVal,
            company_name: companyNameVal,
            email: clientEmailVal || 'no-email@provided.com',
            phone: clientPhoneVal || '',
            industry: industryVal
          })
          .select('id')
          .single();
        
        if (clientErr) throw clientErr;
        activeClientId = newClient.id;
      }

      let activeQuoteId = quotationId;
      const title = dataToSave.proposalTitle || `AI Automation Quotation for ${companyNameVal}`;
      const quoteNum = dataToSave.quotationNumber || quotationNumber;
      const req = dataToSave.requirement || requirement.trim();

      if (!activeQuoteId) {
        const { data: newQuote, error: qError } = await supabase
          .from('quotations')
          .insert({
            user_id: user.id,
            client_id: activeClientId,
            quotation_number: quoteNum,
            proposal_title: title,
            industry: industryVal,
            requirements: req,
            pain_points: '',
            prompt_template: 'AI Automation',
            status: 'Generated'
          })
          .select('id')
          .single();

        if (qError) throw qError;
        activeQuoteId = newQuote.id;
        setQuotationId(activeQuoteId);
      } else {
        const { error: qError } = await supabase
          .from('quotations')
          .update({
            client_id: activeClientId,
            proposal_title: title,
            industry: industryVal,
            requirements: req,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeQuoteId)
          .eq('user_id', user.id);

        if (qError) throw qError;
      }

      const { error: verErr } = await supabase
        .from('quotation_versions')
        .insert({
          quotation_id: activeQuoteId,
          version_number: 1,
          proposal_data: dataToSave,
          created_by: user.id
        });

      if (verErr) throw verErr;

      await supabase.from('activities').insert({
        user_id: user.id,
        quotation_id: activeQuoteId,
        action: isEditMode ? 'updated' : 'created',
        details: `Saved AI quotation version for client "${companyName.trim()}"`
      });

    } catch (err) {
      console.error('Error auto-saving quotation history:', err.message);
      return null;
    } finally {
      setSaving(false);
    }

    return activeQuoteId;
  };

  const handleStartEdit = (section, initialVal) => {
    setEditingSection(section);
    if (Array.isArray(initialVal)) {
      setEditValue(initialVal.join('\n'));
    } else {
      setEditValue(initialVal || '');
    }
  };

  const handleSaveSectionEdit = async (section) => {
    let updatedProposal = { ...proposalData };

    if (section === 'aboutCompany') {
      updatedProposal.aboutCompany = editValue;
    } else if (section === 'understanding') {
      updatedProposal.understanding = editValue;
    } else if (section === 'proposedSolution') {
      updatedProposal.proposedSolution = editValue;
    } else if (section === 'servicesIncluded') {
      updatedProposal.servicesIncluded = editValue.split('\n').map(x => x.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (section === 'businessBenefits') {
      updatedProposal.businessBenefits = editValue.split('\n').map(x => x.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (section === 'whyUs') {
      updatedProposal.whyUs = editValue;
    } else if (section === 'cta') {
      updatedProposal.cta = editValue;
    }

    setProposalData(updatedProposal);
    setEditingSection(null);
    // Invalidate the cached PDF URL — contents changed, so a fresh upload is needed
    setPdfUrl(null);

    await handleSaveQuotation(updatedProposal);
    showToast('success', 'Section saved and quotation updated successfully!');
    // Re-upload the updated PDF in the background
    generateAndUploadPdf(updatedProposal).catch(() => {});
  };

  const handleTriggerPDFExport = async () => {
    if (!proposalData) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

      const response = await fetch(`${apiBaseUrl}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          proposal_data: proposalData,
          company_settings: companySettings
        })
      });


      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to generate PDF on server');
      }

      // Clone the response before consuming it so we can use the blob for both
      // the local download AND the storage upload in one request.
      const blob = await response.blob();

      // ── Local download (existing behaviour) ───────────────────────────────
      const localUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `Quotation_${companyName.replace(/\s+/g, '_')}_${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(localUrl);
      document.body.removeChild(a);

      showToast('success', 'Quotation PDF downloaded successfully!');

      // ── Upload to Supabase Storage if not already done ────────────────────
      // Re-uses the already-generated blob so no second backend call is needed.
      if (!pdfUrl && !pdfUploadPromiseRef.current) {
        const safeName = (companyName || 'quotation').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${quotationId || quotationNumber}.pdf`;
        const filePath = `${user.id}/${fileName}`;

        setUploadingPdf(true);
        supabase.storage
          .from('quotations')
          .upload(filePath, blob, { contentType: 'application/pdf', upsert: true })
          .then(({ error: uploadError }) => {
            if (uploadError) throw uploadError;
            return supabase.storage.from('quotations').createSignedUrl(filePath, 31536000);
          })
          .then(({ data: signedData, error: signedError }) => {
            if (signedError) throw signedError;
            setPdfUrl(signedData.signedUrl);
          })
          .catch((err) => {
            console.error('PDF storage upload error:', err.message);
          })
          .finally(() => setUploadingPdf(false));
      }
    } catch (err) {
      console.error('PDF export error:', err.message);
      showToast('error', 'Error exporting PDF: ' + err.message);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return Promise.resolve();
      } catch (err) {
        document.body.removeChild(textarea);
        return Promise.reject(err);
      }
    }
  };

  /**
   * Generates the PDF via the backend and uploads it to Supabase Storage.
   * Returns a signed URL (1 year validity) pointing to the uploaded PDF.
   * If an upload is already in progress, the same promise is reused to
   * prevent duplicate uploads when multiple share actions fire at once.
   */
  const generateAndUploadPdf = async (data = null, overrideQuoteId = null) => {
    // Reuse in-flight upload rather than starting a second one
    if (pdfUploadPromiseRef.current) {
      return pdfUploadPromiseRef.current;
    }

    const activeData = data || proposalData;
    if (!activeData) return null;

    const upload = (async () => {
      setUploadingPdf(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

        const pdfResponse = await fetch(`${apiBaseUrl}/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            proposal_data: activeData,
            company_settings: companySettings
          })
        });


        if (!pdfResponse.ok) {
          const errJson = await pdfResponse.json().catch(() => ({}));
          throw new Error(errJson.error || 'PDF generation failed');
        }

        const blob = await pdfResponse.blob();

        // Build a stable, deterministic storage path so upsert overwrites the
        // previous version rather than creating duplicate files.
        const activeQuoteId = overrideQuoteId || quotationId;
        const safeName = (companyName || 'quotation').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${activeQuoteId || quotationNumber}.pdf`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('quotations')
          .upload(filePath, blob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Signed URL valid for 1 year — long enough for practical sharing while
        // keeping the bucket private (no anonymous public access).
        const { data: signedData, error: signedError } = await supabase.storage
          .from('quotations')
          .createSignedUrl(filePath, 31536000);

        if (signedError) throw signedError;

        setPdfUrl(signedData.signedUrl);
        return signedData.signedUrl;
      } catch (err) {
        console.error('PDF storage upload error:', err.message);
        throw err;
      } finally {
        setUploadingPdf(false);
        pdfUploadPromiseRef.current = null;
      }
    })();

    pdfUploadPromiseRef.current = upload;
    return upload;
  };

  const handleShareClick = async () => {
    if (!proposalData) return;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        // Try to get the PDF URL; if not ready, use what we have
        const shareUrl = pdfUrl || (await generateAndUploadPdf().catch(() => null));
        const companyNameVal = proposalData.companyProfile?.brandName || proposalData.companyProfile?.companyName || '';
        const textContent = `Hello ${proposalData.clientContactName || 'Client'},\n\nHere is your AI Automation Proposal from ${companyNameVal}:\n\n📄 ${proposalData.proposalTitle || 'Proposal'}`;

        await navigator.share({
          title: proposalData.proposalTitle || 'AI Automation Quotation',
          text: textContent + (shareUrl ? `\n\n🔗 View PDF: ${shareUrl}` : ''),
          url: shareUrl || undefined
        });
        showToast('success', 'Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err.message);
          setShowShareDropdown(!showShareDropdown);
        }
      }
    } else {
      setShowShareDropdown(!showShareDropdown);
    }
  };

  /**
   * Ensures a PDF URL is available, uploading on-demand if the background
   * upload hasn't finished yet. Returns the URL or null on failure.
   */
  const ensurePdfUrl = async () => {
    if (pdfUrl) return pdfUrl;
    try {
      return await generateAndUploadPdf();
    } catch (err) {
      showToast('error', 'PDF upload failed. Falling back to local download.');
      // Trigger local download as fallback
      handleTriggerPDFExport();
      return null;
    }
  };

  const handleShareGmail = async () => {
    if (!proposalData) return;
    const clientNameVal = proposalData.clientContactName || '';
    const clientEmailVal = proposalData.email || '';
    const businessNameVal = proposalData.clientBusinessName || '';
    const companyNameVal = proposalData.companyProfile?.companyName || 'AI WORKSFORYOU';

    if (!clientEmailVal) {
      showToast('error', 'Client email is not available.');
      return;
    }

    setShowShareDropdown(false);

    const shareUrl = await ensurePdfUrl();

    const subject = `AI Automation Proposal - ${businessNameVal}`;
    const body = shareUrl
      ? `Hello ${clientNameVal},\n\nPlease find the AI Automation Proposal for ${businessNameVal} at the link below:\n\n${shareUrl}\n\nRegards,\n${companyNameVal}`
      : `Hello ${clientNameVal},\n\nPlease find our AI Automation Proposal for ${businessNameVal}.\n\n(The PDF could not be uploaded automatically. Please download it from the application and attach it manually.)\n\nRegards,\n${companyNameVal}`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(clientEmailVal)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = async () => {
    if (!proposalData) return;
    const clientNameVal = proposalData.clientContactName || '';
    const clientPhoneVal = proposalData.phone || '';
    const companyNameVal = proposalData.companyProfile?.brandName || proposalData.companyProfile?.companyName || '';
    const titleVal = proposalData.proposalTitle || '';

    if (!clientPhoneVal) {
      showToast('error', 'Client phone number not available.');
      return;
    }

    setShowShareDropdown(false);

    const shareUrl = await ensurePdfUrl();

    const cleanPhone = clientPhoneVal.replace(/[^\d+]/g, '');
    let text = `Hello ${clientNameVal},\n\nHere is your AI Automation Proposal from ${companyNameVal}:\n\n📄 *${titleVal}*`;
    if (shareUrl) {
      text += `\n\n🔗 View PDF: ${shareUrl}`;
    } else {
      text += `\n\n(PDF could not be uploaded. Please ask us to resend the proposal document.)`;
    }
    text += `\n\nRegards,\n${companyNameVal}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareCopyLink = async () => {
    if (!proposalData) return;
    setShowShareDropdown(false);

    const shareUrl = await ensurePdfUrl();

    try {
      if (shareUrl) {
        await copyToClipboard(shareUrl);
        showToast('success', 'PDF link copied successfully.');
      } else {
        await copyToClipboard(quotationNumber);
        showToast('error', 'PDF upload failed. Quotation number copied instead.');
      }
    } catch (err) {
      console.error('Clipboard error:', err.message);
      showToast('error', 'Failed to copy to clipboard.');
    }
  };

  const handleSharePrint = () => {
    window.print();
    setShowShareDropdown(false);
  };

  const handleResetForm = () => {
    setQuotationId(null);
    setQuotationNumber(`QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setClientName('');
    setCompanyName('');
    setIndustry('Retail');
    setRequirement('');
    setClientEmail('');
    setClientPhone('');
    setProposalData(null);
    navigate('/quotation/new');
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 className="spin" size={36} style={{ color: 'var(--primary-color)' }} />
        <p style={{ color: 'var(--text-secondary)', marginLeft: '12px', fontWeight: 6 }}>Loading quotation workspace...</p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ padding: '24px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything in the body except the preview container */
          body * {
            visibility: hidden !important;
          }
          #quotation-preview-container, #quotation-preview-container * {
            visibility: visible !important;
          }
          #quotation-preview-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Hide edit buttons, actions, templates during print */
          #quotation-preview-container button,
          #quotation-preview-container .btn,
          #quotation-preview-container input,
          #quotation-preview-container textarea {
            display: none !important;
          }
          /* Prevent section splits */
          .print-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Back to Dashboard">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                {proposalData ? 'AI Automation Quotation Preview' : 'New AI Automation Quotation'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0', fontSize: '13.5px' }}>
                {proposalData ? 'Review the simple business quotation, edit sections inline, and download.' : 'Ask only basic details to generate a clean automation quotation.'}
              </p>
            </div>
          </div>
          {proposalData && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleResetForm} className="btn btn-secondary">
                Create Another
              </button>
              <button onClick={handleTriggerPDFExport} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                <FileDown size={16} /> Download PDF
              </button>
            </div>
          )}
        </div>

        {/* System Toasts */}
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

        {!proposalData ? (
          /* Simplified Inputs Form View */
          <div className="grid grid-cols-3" style={{ gap: '24px', alignItems: 'start' }}>
            
            {/* Main Form Fields */}
            <form onSubmit={handleGenerate} className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '8px' }}>
                Quotation Request
              </h3>

              <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Client Contact Name *</label>
                  <input
                    type="text"
                    placeholder=" Rajesh Kumar"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Client Business Name *</label>
                  <input
                    type="text"
                    placeholder=" Kumar Retails"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Industry Vertical *</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}>
                  <option value="Retail">Retail / E-commerce</option>
                  <option value="Construction">Construction / Tiles</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Hospitality">Hospitality / Restaurants</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance / Accounting</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Fitness">Fitness / Gyms</option>
                  <option value="Travel">Travel Agency</option>
                  <option value="Other">Other Sector</option>
                </select>
              </div>

              <div className="form-group">
                <label>Requirement *</label>
                <textarea
                  rows={4}
                  placeholder="Describe what tasks need to be automated (e.g. qualify leads on WhatsApp and send automated emails when a customer contacts us)..."
                  value={requirement}
                  onChange={e => setRequirement(e.target.value)}
                  required
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Optional Contact Details</p>

              <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="rajesh@kumarretails.com"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px', fontSize: '15px' }} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="spin" size={16} /> Generating AI Quotation...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate AI Quotation
                  </>
                )}
              </button>
            </form>

            {/* Profile Info Summary Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <Building size={16} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0 }}>Branding Profile</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Company Header Name</span>
                  <span style={{ fontWeight: 600 }}>{companySettings.company_name}</span>
                </div>
                {companySettings.brand_name && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Brand Display Name</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{companySettings.brand_name}</span>
                  </div>
                )}
                
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Pricing Packages Configured</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {((Array.isArray(companySettings.default_packages) ? companySettings.default_packages : []).length > 0) ? (
                      companySettings.default_packages.map((pkg, idx) => (
                        <div key={idx} style={{ fontSize: '12px', fontWeight: 600 }}>
                          • {pkg.name}: <span style={{ color: 'var(--primary-color)' }}>{pkg.price}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No custom packages configured</span>
                    )}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                You can change these settings in the <b>Company Profile</b> tab.
              </p>
            </div>

          </div>
        ) : (
          /* Redesigned 8-Section Quotation Preview */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Paper Preview Sheet */}
            <div id="quotation-preview-container" style={{
              backgroundColor: '#ffffff',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '40px',
              boxShadow: 'var(--shadow-premium)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              lineHeight: 1.5,
              fontSize: '14px',
              maxWidth: '900px',
              width: '100%',
              margin: '0 auto'
            }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--primary-color)', textTransform: 'uppercase' }}>
                    {proposalData.companyProfile?.brandName || proposalData.companyProfile?.companyName}
                  </h2>
                  {proposalData.companyProfile?.brandName && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Powered by {proposalData.companyProfile.companyName}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#475569' }}>
                  {proposalData.companyProfile?.email && <div>Email: {proposalData.companyProfile.email}</div>}
                  {proposalData.companyProfile?.phone && <div>Phone: {proposalData.companyProfile.phone}</div>}
                  {proposalData.companyProfile?.website && <div>Web: {proposalData.companyProfile.website.replace(/^https?:\/\//, '')}</div>}
                </div>
              </div>

              {/* 8 Business-First Ordered Sections */}

              {/* SECTION 1: About Our Company */}
              <div className="print-section" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', margin: 0 }}>
                    About Our Company
                  </h3>
                  <button onClick={() => handleStartEdit('aboutCompany', proposalData.aboutCompany)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    <Edit3 size={11} /> Edit
                  </button>
                </div>
                {editingSection === 'aboutCompany' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                      <button onClick={() => handleSaveSectionEdit('aboutCompany')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#334155', margin: 0 }}>{proposalData.aboutCompany}</p>
                )}
              </div>

              {/* SECTION 2: Client Requirement */}
              <div className="print-section" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Client Requirement
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '16px',
                  gap: '16px'
                }}>
                  <div style={{ fontSize: '13px' }}>
                    <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Client Info</h4>
                    <div><b>Contact Name:</b> {proposalData.clientContactName || 'N/A'}</div>
                    <div><b>Business Name:</b> {proposalData.clientBusinessName || 'N/A'}</div>
                    <div><b>Industry:</b> {proposalData.industry || 'N/A'}</div>
                    {proposalData.email && <div><b>Email:</b> {proposalData.email}</div>}
                    {proposalData.phone && <div><b>Phone:</b> {proposalData.phone}</div>}
                  </div>
                  <div style={{ fontSize: '13px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Understanding</h4>
                    {editingSection === 'understanding' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                          <button onClick={() => handleSaveSectionEdit('understanding')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ color: '#334155', fontStyle: 'italic', marginBottom: '8px' }}>{proposalData.understanding}</div>
                        <button onClick={() => handleStartEdit('understanding', proposalData.understanding)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '10px' }}>
                          <Edit3 size={10} /> Edit Description
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Proposed Solution */}
              <div className="print-section" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', margin: 0 }}>
                    Proposed Solution
                  </h3>
                  <button onClick={() => handleStartEdit('proposedSolution', proposalData.proposedSolution)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    <Edit3 size={11} /> Edit
                  </button>
                </div>
                {editingSection === 'proposedSolution' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                      <button onClick={() => handleSaveSectionEdit('proposedSolution')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#334155', margin: 0 }}>{proposalData.proposedSolution}</p>
                )}
              </div>

              {/* SECTION 4 & 5: Services Included & Business Benefits (Side by side) */}
              <div className="print-section grid grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
                
                {/* Services Card */}
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
                      Services Included
                    </h3>
                    <button onClick={() => handleStartEdit('servicesIncluded', proposalData.servicesIncluded)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '10px' }}>
                      <Edit3 size={9} /> Edit
                    </button>
                  </div>
                  {editingSection === 'servicesIncluded' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                      <span style={{ fontSize: '10px', color: '#64748b' }}>One service per line</span>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>Cancel</button>
                        <button onClick={() => handleSaveSectionEdit('servicesIncluded')} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <ul style={{ paddingLeft: '16px', margin: 0, color: '#334155' }}>
                      {proposalData.servicesIncluded?.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Benefits Card */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
                      Business Benefits
                    </h3>
                    <button onClick={() => handleStartEdit('businessBenefits', proposalData.businessBenefits)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '10px' }}>
                      <Edit3 size={9} /> Edit
                    </button>
                  </div>
                  {editingSection === 'businessBenefits' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                      <span style={{ fontSize: '10px', color: '#64748b' }}>One benefit per line</span>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>Cancel</button>
                        <button onClick={() => handleSaveSectionEdit('businessBenefits')} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <ul style={{ paddingLeft: '16px', margin: 0, color: '#334155' }}>
                      {proposalData.businessBenefits?.map((b, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>

              {/* SECTION 6: Pricing Packages */}
              <div className="print-section" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Pricing Packages
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '12px', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', width: '160px' }}>Package</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', width: '150px' }}>Monthly Investment</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>Deliverables Description</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '13px' }}>
                    {proposalData.pricingPackages?.map((pkg, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontWeight: 600 }}>{pkg.name}</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', color: 'var(--primary-color)', fontWeight: 600 }}>{pkg.price}</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', color: '#475569' }}>{pkg.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 7: Why Choose Us */}
              <div className="print-section" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', margin: 0 }}>
                    Why Choose Us
                  </h3>
                  <button onClick={() => handleStartEdit('whyUs', proposalData.whyUs)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    <Edit3 size={11} /> Edit
                  </button>
                </div>
                {editingSection === 'whyUs' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                      <button onClick={() => handleSaveSectionEdit('whyUs')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#334155', margin: 0 }}>{proposalData.whyUs}</p>
                )}
              </div>

              {/* SECTION 8: Call To Action */}
              <div className="print-section" style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                padding: '16px',
                position: 'relative',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ color: '#1e3a8a', fontWeight: 700, margin: 0, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Call to Action
                  </h4>
                  <button onClick={() => handleStartEdit('cta', proposalData.cta)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '9.5px', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
                    <Edit3 size={9} /> Edit
                  </button>
                </div>
                {editingSection === 'cta' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <textarea rows={2} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ backgroundColor: '#ffffff' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingSection(null)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>Cancel</button>
                      <button onClick={() => handleSaveSectionEdit('cta')} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '14px', margin: 0 }}>
                    {proposalData.cta}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '11px', color: '#64748b' }}>
                Generated by AI WorksForYou
              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px', position: 'relative', flexWrap: 'wrap' }}>
              <button onClick={handleResetForm} className="btn btn-secondary" style={{ minWidth: '150px' }}>
                Create New Quotation
              </button>
              <button onClick={handleTriggerPDFExport} className="btn btn-primary" style={{ minWidth: '180px' }} disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <><FileDown size={16} /> Download Quotation PDF</>}
              </button>
              
              {/* Share Dropdown Wrapper */}
              <div ref={shareDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={handleShareClick}
                  className="btn btn-secondary"
                  aria-label="Share Quotation Menu"
                  aria-expanded={showShareDropdown}
                  aria-haspopup="true"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}
                >
                  {uploadingPdf
                    ? <><Loader2 className="spin" size={16} /> Uploading…</>
                    : <><Share2 size={16} /> Share</>
                  }
                </button>

                {showShareDropdown && (
                  <div
                    role="menu"
                    aria-label="Share options"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      right: '0',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '220px',
                      zIndex: 1000,
                      animation: 'slideUp 0.15s ease-out'
                    }}
                  >
                    {/* CSS animation inline helper */}
                    <style dangerouslySetInnerHTML={{__html: `
                      @keyframes slideUp {
                        from { transform: translateY(8px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                      }
                    `}} />

                    {/* Gmail Option */}
                    <button
                      role="menuitem"
                      onClick={handleShareGmail}
                      disabled={!proposalData.email}
                      title={!proposalData.email ? 'Client email is not available.' : 'Compose email in Gmail'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: proposalData.email ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: proposalData.email ? 'pointer' : 'not-allowed',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background-color 0.15s',
                        opacity: proposalData.email ? 1 : 0.6
                      }}
                      onMouseEnter={(e) => {
                        if (proposalData.email) e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Mail size={16} style={{ color: proposalData.email ? '#db4437' : '#94a3b8' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {!proposalData.email ? 'Client email is not available.' : 'Email PDF link via Gmail'}
                        </div>
                      </div>
                    </button>

                    {/* WhatsApp Option */}
                    <button
                      role="menuitem"
                      onClick={handleShareWhatsApp}
                      disabled={!proposalData.phone}
                      title={!proposalData.phone ? 'Client phone number not available.' : 'Share via WhatsApp'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: proposalData.phone ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: proposalData.phone ? 'pointer' : 'not-allowed',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background-color 0.15s',
                        opacity: proposalData.phone ? 1 : 0.6
                      }}
                      onMouseEnter={(e) => {
                        if (proposalData.phone) e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <MessageSquare size={16} style={{ color: proposalData.phone ? '#22c55e' : '#94a3b8' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>WhatsApp Chat</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {!proposalData.phone ? 'Phone not available' : 'Send PDF link to client'}
                        </div>
                      </div>
                    </button>

                    {/* Copy Link Option */}
                    <button
                      role="menuitem"
                      onClick={handleShareCopyLink}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Link2 size={16} style={{ color: '#ec4899' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Copy PDF Link</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {uploadingPdf ? 'Uploading PDF…' : pdfUrl ? 'PDF link ready to copy' : 'Upload & copy PDF link'}
                        </div>
                      </div>
                    </button>

                    {/* Print Option */}
                    <button
                      role="menuitem"
                      onClick={handleSharePrint}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Printer size={16} style={{ color: '#f59e0b' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Print Preview</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Print only this quotation
                        </div>
                      </div>
                    </button>

                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
