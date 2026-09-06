/**
 * normalizeQuotation.js
 * 
 * Centralized normalization function to map all raw incoming formats
 * (Gemini responses, legacy database records, user input, state)
 * into a single canonical quotation structure.
 */

export const normalizeQuotation = (raw = {}, dbQuote = {}, currentSettings = {}, fallbackState = {}) => {
  if (!raw) raw = {};
  
  // 1. Resolve Provider Company Profile
  const companyProfile = {
    companyName: currentSettings.company_name || dbQuote.company_settings?.company_name || 'AI WORKSFORYOU',
    brandName: currentSettings.brand_name || dbQuote.company_settings?.brand_name || '',
    email: currentSettings.email || dbQuote.company_settings?.email || 'info@provider.com',
    phone: currentSettings.phone || dbQuote.company_settings?.phone || '',
    website: currentSettings.website || dbQuote.company_settings?.website || '',
    address: currentSettings.address || dbQuote.company_settings?.address || '',
    brandColors: currentSettings.brand_colors || dbQuote.company_settings?.brand_colors || { primary: '#2563eb', secondary: '#0f172a' }
  };

  // 2. Resolve Client Details
  const clientContactName = 
    raw.clientContactName || 
    raw.client_name || 
    raw.clientRepresentative || 
    dbQuote.clients?.name || 
    fallbackState.clientName || 
    '';

  const clientBusinessName = 
    raw.clientBusinessName || 
    raw.company_name || 
    dbQuote.clients?.company_name || 
    fallbackState.companyName || 
    '';

  const industry = 
    raw.industry || 
    raw.industry_vertical || 
    dbQuote.clients?.industry || 
    dbQuote.industry || 
    fallbackState.industry || 
    'Retail';

  const email = 
    raw.email || 
    raw.client_email || 
    dbQuote.clients?.email || 
    fallbackState.clientEmail || 
    '';

  const phone = 
    raw.phone || 
    raw.client_phone || 
    dbQuote.clients?.phone || 
    fallbackState.clientPhone || 
    '';

  // 3. Resolve Content Sections
  const proposalTitle = 
    raw.proposalTitle || 
    raw.proposal_title || 
    dbQuote.proposal_title || 
    fallbackState.proposalTitle || 
    `AI Automation Quotation for ${clientBusinessName || 'Client'}`;

  const aboutCompany = 
    raw.aboutCompany || 
    raw.about_company || 
    `${companyProfile.brandName || companyProfile.companyName} provides professional automation services. We specialize in workflow streamlining and saving business hours.`;

  const requirement = 
    raw.requirement || 
    raw.requirements || 
    dbQuote.requirements || 
    fallbackState.requirement || 
    '';

  const understanding = 
    raw.understanding || 
    (raw.executive_summary && (raw.executive_summary.current_challenge || raw.executive_summary.business_objective)) || 
    'Understanding business inquiry capture and followup qualification workflow needs.';

  const proposedSolution = 
    raw.proposedSolution || 
    raw.solution || 
    (raw.executive_summary && raw.executive_summary.expected_outcome) || 
    'Providing simple automation routines to sync, qualify, and alert lead details instantly.';

  // 4. Services Included
  let servicesIncluded = raw.servicesIncluded || raw.services;
  if (!servicesIncluded) {
    servicesIncluded = [];
    const legacyScope = raw.scope_of_work || [];
    if (Array.isArray(legacyScope)) {
      legacyScope.forEach(s => {
        if (s && s.phase_name) servicesIncluded.push(s.phase_name);
      });
    }
    const legacyDeliverables = raw.deliverables || [];
    if (Array.isArray(legacyDeliverables)) {
      legacyDeliverables.forEach(d => {
        if (d && d.name) servicesIncluded.push(d.name);
      });
    }
  }
  if (!Array.isArray(servicesIncluded) || servicesIncluded.length === 0) {
    servicesIncluded = ['WhatsApp Automation', 'Lead Qualification', 'CRM Sync'];
  }

  // 5. Business Benefits
  let businessBenefits = raw.businessBenefits || raw.benefits;
  if (!businessBenefits && raw.executive_summary && Array.isArray(raw.executive_summary.high_level_benefits)) {
    businessBenefits = raw.executive_summary.high_level_benefits;
  }
  if (!Array.isArray(businessBenefits) || businessBenefits.length === 0) {
    businessBenefits = ['Save Time', 'Reduce Manual Work', 'Increase Productivity'];
  }

  // 6. Pricing Packages
  const rawPackages = raw.pricingPackages || raw.pricing_packages || currentSettings.default_packages;
  let pricingPackages = [];
  if (Array.isArray(rawPackages)) {
    pricingPackages = rawPackages.map(pkg => ({
      name: pkg.name || 'Standard Setup',
      price: pkg.price || 'Contact Sales',
      description: pkg.description || pkg.features?.join(', ') || ''
    }));
  } else if (rawPackages && typeof rawPackages === 'object') {
    pricingPackages = Object.entries(rawPackages).map(([name, val]) => ({
      name: name,
      price: val?.price || 'Contact Sales',
      description: val?.description || val?.features?.join(', ') || ''
    }));
  }
  if (pricingPackages.length === 0) {
    pricingPackages = [
      { name: 'Standard Setup', price: 'Contact Sales', description: 'Automation tailored per requirements' }
    ];
  }

  // 7. Why Us & CTA
  const whyUs = 
    raw.whyUs || 
    raw.why_us || 
    'Partnering with our team gives you specialized, simple automation systems custom tailored using our business experience.';

  const cta = 
    raw.cta || 
    'Let\'s schedule a meeting to finalize your automation solution.';

  // 8. Document Metadata
  const quotationNumber = 
    raw.quotationNumber || 
    raw.quotation_number || 
    dbQuote.quotation_number || 
    fallbackState.quotationNumber || 
    '';

  const generatedAt = 
    raw.generatedAt || 
    raw.created_at || 
    dbQuote.created_at || 
    new Date().toISOString();

  const version = 
    raw.version || 
    dbQuote.version_number || 
    1;

  // Return strictly defined canonical object
  return {
    quotationNumber,
    generatedAt,
    version,
    clientContactName,
    clientBusinessName,
    industry,
    email,
    phone,
    companyProfile,
    proposalTitle,
    aboutCompany,
    requirement,
    understanding,
    proposedSolution,
    servicesIncluded,
    businessBenefits,
    whyUs,
    cta,
    pricingPackages
  };
};
