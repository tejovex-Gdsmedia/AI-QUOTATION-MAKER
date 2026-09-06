"""
normalize_service.py

Centralized normalization helper for the Python backend. Maps all raw, legacy,
or external quotation formats into the single canonical quotation schema format
before validation and rendering.
"""

from datetime import datetime

def normalize_quotation(raw, company_settings=None):
    if not isinstance(raw, dict):
        raw = {}
    if not isinstance(company_settings, dict):
        company_settings = {}

    # 1. Resolve Provider Company Profile
    current_cs = raw.get("companyProfile") or {}
    if not isinstance(current_cs, dict):
        current_cs = {}
        
    company_profile = {
        "companyName": current_cs.get("companyName") or company_settings.get("company_name") or "AI WORKSFORYOU",
        "brandName": current_cs.get("brandName") or company_settings.get("brand_name") or "",
        "email": current_cs.get("email") or company_settings.get("email") or "info@provider.com",
        "phone": current_cs.get("phone") or company_settings.get("phone") or "",
        "website": current_cs.get("website") or company_settings.get("website") or "",
        "address": current_cs.get("address") or company_settings.get("address") or "",
        "brandColors": current_cs.get("brandColors") or company_settings.get("brand_colors") or {"primary": "#2563eb", "secondary": "#0f172a"}
    }

    # 2. Resolve Client Details & Mappings
    client_contact_name = (
        raw.get("clientContactName") or 
        raw.get("client_name") or 
        raw.get("clientRepresentative") or 
        ""
    )

    client_business_name = (
        raw.get("clientBusinessName") or 
        raw.get("company_name") or 
        ""
    )

    industry = (
        raw.get("industry") or 
        raw.get("industry_vertical") or 
        "Retail"
    )

    email = (
        raw.get("email") or 
        raw.get("client_email") or 
        ""
    )

    phone = (
        raw.get("phone") or 
        raw.get("client_phone") or 
        ""
    )

    # 3. Resolve Content Sections
    proposal_title = (
        raw.get("proposalTitle") or 
        raw.get("proposal_title") or 
        f"AI Automation Quotation for {client_business_name or 'Client'}"
    )

    about_company = (
        raw.get("aboutCompany") or 
        raw.get("about_company") or 
        f"{company_profile['brandName'] or company_profile['companyName']} provides professional automation services."
    )

    requirement = (
        raw.get("requirement") or 
        raw.get("requirements") or 
        ""
    )

    understanding = raw.get("understanding")
    if not understanding:
        exec_summary = raw.get("executive_summary") or {}
        if isinstance(exec_summary, dict):
            understanding = exec_summary.get("current_challenge") or exec_summary.get("business_objective")
    if not understanding:
        understanding = "Understanding business inquiry capture and followup qualification workflow needs."

    proposed_solution = raw.get("proposedSolution") or raw.get("solution")
    if not proposed_solution:
        exec_summary = raw.get("executive_summary") or {}
        if isinstance(exec_summary, dict):
            proposed_solution = exec_summary.get("expected_outcome")
    if not proposed_solution:
        proposed_solution = "Providing simple automation routines to sync, qualify, and alert lead details instantly."

    # 4. Services Included
    services_included = raw.get("servicesIncluded") or raw.get("services")
    if not services_included:
        services_included = []
        legacy_scope = raw.get("scope_of_work") or []
        if isinstance(legacy_scope, list):
            for s in legacy_scope:
                if isinstance(s, dict) and s.get("phase_name"):
                    services_included.append(s.get("phase_name"))
        legacy_deliv = raw.get("deliverables") or []
        if isinstance(legacy_deliv, list):
            for d in legacy_deliv:
                if isinstance(d, dict) and d.get("name"):
                    services_included.append(d.get("name"))
    if not isinstance(services_included, list) or len(services_included) == 0:
        services_included = ["WhatsApp Automation", "Lead Qualification", "CRM Sync"]

    # 5. Business Benefits
    business_benefits = raw.get("businessBenefits") or raw.get("benefits")
    if not business_benefits:
        exec_summary = raw.get("executive_summary") or {}
        if isinstance(exec_summary, dict) and isinstance(exec_summary.get("high_level_benefits"), list):
            business_benefits = exec_summary.get("high_level_benefits")
    if not isinstance(business_benefits, list) or len(business_benefits) == 0:
        business_benefits = ["Save Time", "Reduce Manual Work", "Increase Productivity"]

    # 6. Pricing Packages
    raw_packages = raw.get("pricingPackages") or raw.get("pricing_packages") or company_settings.get("default_packages")
    pricing_packages = []
    if isinstance(raw_packages, list):
        for pkg in raw_packages:
            if isinstance(pkg, dict):
                pricing_packages.append({
                    "name": pkg.get("name") or "Standard Setup",
                    "price": pkg.get("price") or "Contact Sales",
                    "description": pkg.get("description") or ", ".join(pkg.get("features", [])) if isinstance(pkg.get("features"), list) else pkg.get("description") or ""
                })
    elif isinstance(raw_packages, dict):
        for name, val in raw_packages.items():
            if isinstance(val, dict):
                pricing_packages.append({
                    "name": name,
                    "price": val.get("price") or "Contact Sales",
                    "description": val.get("description") or ", ".join(val.get("features", [])) if isinstance(val.get("features"), list) else val.get("description") or ""
                })
    if len(pricing_packages) == 0:
        pricing_packages = [
            {"name": "Standard Setup", "price": "Contact Sales", "description": "Automation tailored per requirements"}
        ]

    # 7. Why Us & CTA
    why_us = (
        raw.get("whyUs") or 
        raw.get("why_us") or 
        "Partnering with our team gives you specialized, simple automation systems custom tailored using our business experience."
    )

    cta = (
        raw.get("cta") or 
        "Let's schedule a meeting to finalize your automation solution."
    )

    # 8. Document Metadata & Schema Versioning
    quotation_number = raw.get("quotationNumber") or raw.get("quotation_number") or ""
    generated_at = raw.get("generatedAt") or raw.get("created_at") or datetime.utcnow().isoformat()
    version = raw.get("version") or 1  # Force upgrade to schema version 1

    return {
        "quotationNumber": quotation_number,
        "generatedAt": generated_at,
        "version": version,
        "clientContactName": client_contact_name,
        "clientBusinessName": client_business_name,
        "industry": industry,
        "email": email,
        "phone": phone,
        "companyProfile": company_profile,
        "proposalTitle": proposal_title,
        "aboutCompany": about_company,
        "requirement": requirement,
        "understanding": understanding,
        "proposedSolution": proposed_solution,
        "servicesIncluded": services_included,
        "businessBenefits": business_benefits,
        "whyUs": why_us,
        "cta": cta,
        "pricingPackages": pricing_packages
    }


def validate_canonical_quotation(data):
    if not isinstance(data, dict):
        return False, "Data must be a dictionary"
        
    required_keys = [
        "quotationNumber",
        "clientContactName",
        "clientBusinessName",
        "industry",
        "proposalTitle",
        "aboutCompany",
        "understanding",
        "proposedSolution",
        "servicesIncluded",
        "businessBenefits",
        "whyUs",
        "cta",
        "pricingPackages",
        "companyProfile",
        "version"
    ]
    
    missing = [k for k in required_keys if k not in data]
    if missing:
        return False, f"Missing required canonical fields: {', '.join(missing)}"
        
    # Field-specific validations
    if not isinstance(data["clientContactName"], str) or not data["clientContactName"].strip():
        return False, "clientContactName cannot be empty"
    if not isinstance(data["clientBusinessName"], str) or not data["clientBusinessName"].strip():
        return False, "clientBusinessName cannot be empty"
    if not isinstance(data["proposalTitle"], str) or not data["proposalTitle"].strip():
        return False, "proposalTitle cannot be empty"
    if not isinstance(data["servicesIncluded"], list) or len(data["servicesIncluded"]) == 0:
        return False, "servicesIncluded must be a non-empty list of services"
    if not isinstance(data["businessBenefits"], list) or len(data["businessBenefits"]) == 0:
        return False, "businessBenefits must be a non-empty list of benefits"
    if not isinstance(data["pricingPackages"], list) or len(data["pricingPackages"]) == 0:
        return False, "pricingPackages must be a non-empty list of pricing packages"
        
    # Check pricing packages contents
    for idx, pkg in enumerate(data["pricingPackages"]):
        if not isinstance(pkg, dict):
            return False, f"pricingPackages[{idx}] must be a dictionary"
        if not pkg.get("name") or not pkg.get("price"):
            return False, f"pricingPackages[{idx}] is missing name or price"
            
    # Check companyProfile contents
    profile = data["companyProfile"]
    if not isinstance(profile, dict):
        return False, "companyProfile must be a dictionary"
    profile_required = ["companyName"]
    missing_profile = [k for k in profile_required if not profile.get(k)]
    if missing_profile:
        return False, f"companyProfile is missing required fields: {', '.join(missing_profile)}"
        
    return True, None
