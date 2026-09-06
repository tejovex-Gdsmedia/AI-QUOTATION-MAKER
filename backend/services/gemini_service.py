import os
import json
import logging
import hashlib

logger = logging.getLogger(__name__)

class GeminiService:
    SYSTEM_INSTRUCTION = (
        "You are an expert sales copywriter and AI automation engineer for GDS Media (Brand: AI WORKSFORYOU).\n"
        "Your task is to generate a simple, clean, professional B2B quotation JSON based ONLY on the provided company profile and client details.\n\n"
        "STRICT CONSTRAINTS:\n"
        "1. Write in simple, clear English suitable for non-technical business owners (e.g. small shop or local business owners).\n"
        "2. Do NOT use any technical jargon. Strictly avoid terms like: API, APIs, backend, frontend, cloud, database, databases, sql, postgres, code, repositories, system architecture, framework, DevOps, infrastructure, prompt engineering, software stack, implementation phases, LLM, AI Model, Workflow Engine, Automation Workflow, Integration Layer, Pipeline.\n"
        "3. CRM Sync must only be mentioned if the word 'CRM' is explicitly present in the company's services_offered list. Otherwise, replace it with simple descriptions like 'customer tracking' or 'contact lists update'.\n"
        "4. Focus exclusively on business value: saving manual work, saving time, increasing productivity, faster customer responses, scaling operations, and improving sales.\n"
        "5. Services Recommendation: Recommending services is strictly constrained. You must ONLY recommend and select services that are configured in the company profile's 'services_offered' list. Do NOT invent or include services not present in that list.\n"
        "6. Why Choose Us: Write a custom 'Why Choose Us' paragraph using the company's 'company_description' and 'services_offered'. Tailor it dynamically to explain how the company's specific background and services address the client's industry and requirements instead of using generic marketing text.\n"
        "7. Do not include cover pages, timeline roadmaps, deliverables catalogs, challenges matrices, acceptance criteria, or legal terms.\n"
        "8. Return ONLY a single, valid JSON object matching the required schema. Do NOT return markdown or explanation.\n\n"
        "REQUIRED SCHEMA:\n"
        "{\n"
        "  \"proposal_title\": \"string (e.g. AI Automation Quotation for Kumar Retail Outlets)\",\n"
        "  \"about_company\": \"string (A professional, simple introduction of the company using the company description and services offered)\",\n"
        "  \"understanding\": \"string (About Client Requirement section: A short paragraph explaining the client's business need in simple English)\",\n"
        "  \"solution\": \"string (Our Proposed Solution section: Simple explanation of how the brand solves the client's problem using automation. Simple language. No jargon. Focus on business value.)\",\n"
        "  \"services\": [\"string (List of 3-5 relevant services selected ONLY from the company profile services_offered list)\"],\n"
        "  \"benefits\": [\"string (List of 3-4 business benefits tailored to the requirement. Examples: Save Time, Reduce Manual Work, Increase Productivity, Faster Response, Improve Customer Experience, Scale Business, Reduce Human Errors)\"],\n"
        "  \"why_us\": \"string (Why Choose Us section: Short paragraph explaining why they should partner with us, generated using our Company Description and Services Offered, tailored to the client's needs)\",\n"
        "  \"cta\": \"string (Call to action, e.g. Let's schedule a meeting to finalize your automation solution.)\"\n"
        "}"
    )

    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Live Gemini Client initialized successfully.")
            except Exception as e:
                logger.error("Failed to initialize live Gemini Client. Check GEMINI_API_KEY and google-genai installation.")
        else:
            logger.warning("No GEMINI_API_KEY found. Falling back to structured deterministic mockup.")

    def _normalize_packages(self, raw_packages):
        """
        Normalizes pricing packages from DB.
        Supports both legacy objects (Starter/Growth/Enterprise) and dynamic lists.
        """
        if isinstance(raw_packages, list):
            return raw_packages
        if isinstance(raw_packages, dict):
            normalized = []
            for name, val in raw_packages.items():
                if isinstance(val, dict):
                    normalized.append({
                        "name": name,
                        "price": val.get("price") or "",
                        "description": val.get("description") or ", ".join(val.get("features", []))
                    })
            return normalized
        return []

    @staticmethod
    def _seed(*parts):
        joined = "|".join(str(p).strip().lower() for p in parts)
        digest = hashlib.md5(joined.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    @staticmethod
    def _pick(seed, options, offset=0):
        if not options:
            return ""
        return options[(seed + offset) % len(options)]

    @staticmethod
    def _pick_n(seed, options, n, offset=0):
        if not options:
            return []
        n = min(n, len(options))
        idx_order = list(range(len(options)))
        start = (seed + offset) % len(options)
        rotated = idx_order[start:] + idx_order[:start]
        return [options[i] for i in rotated[:n]]

    def generate_proposal(self, company_settings, client_details, prompt_template, requirements, pain_points, roi_input):
        client_company = client_details.get("company_name", "Client Company")
        client_name = client_details.get("name", "Client Contact")
        client_industry = client_details.get("industry", "Technology")

        # Extract custom fields from api_cost_rules jsonb block to avoid migrations
        api_rules = company_settings.get("api_cost_rules") or {}
        if not isinstance(api_rules, dict):
            api_rules = {}

        company_desc = api_rules.get("company_description") or "We provide simple business automations to save time and grow sales."
        services_list_str = api_rules.get("services_offered") or "WhatsApp Automation, Lead Qualification, CRM Sync, Appointment Booking, Email Automation"

        # Pricing packages normalization
        raw_packages = company_settings.get("default_packages")
        normalized_packages = self._normalize_packages(raw_packages)

        # Configured services list
        configured_services = [s.strip() for s in services_list_str.split(',') if s.strip()]
        if not configured_services:
            configured_services = ["WhatsApp Automation", "Lead Qualification", "CRM Sync", "Appointment Booking", "Email Automation"]

        # 1. LIVE GEMINI API GENERATION
        if self.client:
            from google.genai import types
            from google.genai.errors import APIError

            user_prompt = (
                f"Generate a professional AI Automation Quotation for the client based on our Company Profile:\n\n"
                f"COMPANY PROFILE:\n"
                f"- Brand Name: {company_settings.get('brand_name', 'AI WORKSFORYOU')}\n"
                f"- Company Description: {company_desc}\n"
                f"- Services Offered: {services_list_str}\n"
                f"- Pricing Packages Configured: {json.dumps(normalized_packages)}\n\n"
                f"CLIENT DETAILS:\n"
                f"- Client Name: {client_name}\n"
                f"- Company Name: {client_company}\n"
                f"- Industry: {client_industry}\n\n"
                f"CLIENT REQUIREMENT:\n"
                f"{requirements}\n"
            )

            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        system_instruction=self.SYSTEM_INSTRUCTION,
                        temperature=0.4
                    )
                )

                result_json = json.loads(response.text)
                
                result_json["proposal_title"] = result_json.get("proposal_title") or f"AI Automation Quotation for {client_company}"
                result_json["client_name"] = client_name
                result_json["company_name"] = client_company
                result_json["industry"] = client_industry
                result_json["requirement"] = requirements
                result_json["client_email"] = client_details.get("email", "")
                result_json["client_phone"] = client_details.get("phone", "")
                
                # Whitelist filtering
                ai_services = result_json.get("services") or []
                filtered_services = []
                for s in ai_services:
                    normalized_s = s.strip()
                    matched = next((cs for cs in configured_services if cs.lower() == normalized_s.lower()), None)
                    if matched and matched not in filtered_services:
                        filtered_services.append(matched)
                
                if not filtered_services:
                    filtered_services = configured_services[:3]
                result_json["services"] = filtered_services

                # Intro
                result_json["about_company"] = result_json.get("about_company") or f"{company_settings.get('brand_name', 'AI WORKSFORYOU')} (Powered by {company_settings.get('company_name', 'GDS MEDIA')}) provides professional automation services. {company_desc} We specialize in: {services_list_str}."

                # Pricing packages
                result_json["pricing_packages"] = normalized_packages

                return result_json
            except APIError as e:
                # Do not log raw APIError — its string representation can include the API key
                logger.error(f"Gemini API error (status {getattr(e, 'status_code', 'unknown')}). Falling back to mock.")
            except Exception as e:
                logger.error("Unexpected error parsing Gemini response. Falling back to mock.")

        # 2. DETERMINISTIC MOCKUP GENERATION FALLBACK
        return self._generate_deterministic_mock(company_settings, client_details, prompt_template, requirements)

    def _generate_deterministic_mock(self, company_settings, client_details, prompt_template, requirements):
        client_company = client_details.get('company_name', 'Client Corp')
        client_name = client_details.get('name', 'Client Contact')
        client_industry = client_details.get('industry', 'Technology')

        api_rules = company_settings.get("api_cost_rules") or {}
        if not isinstance(api_rules, dict):
            api_rules = {}

        company_desc = api_rules.get("company_description") or "We provide simple business automations to save time and grow sales."
        services_list_str = api_rules.get("services_offered") or "WhatsApp Automation, Lead Qualification, CRM Sync, Appointment Booking, Email Automation"

        seed = self._seed(client_company, client_industry, requirements[:80])

        configured_services = [s.strip() for s in services_list_str.split(',') if s.strip()]
        if not configured_services:
            configured_services = ["WhatsApp Automation", "Lead Qualification", "CRM Sync", "Appointment Booking", "Email Automation"]

        selected_services = []
        req_lower = requirements.lower()
        
        for cs in configured_services:
            cs_lower = cs.lower()
            if "whatsapp" in cs_lower and ("whatsapp" in req_lower or "message" in req_lower or "chat" in req_lower):
                selected_services.append(cs)
            elif "lead" in cs_lower and ("lead" in req_lower or "customer" in req_lower or "inquiry" in req_lower or "sales" in req_lower):
                selected_services.append(cs)
            elif ("booking" in cs_lower or "appointment" in cs_lower or "schedule" in cs_lower) and ("booking" in req_lower or "appointment" in req_lower or "schedule" in req_lower or "calendar" in req_lower):
                selected_services.append(cs)
            elif "email" in cs_lower and ("email" in req_lower or "mail" in req_lower or "alert" in req_lower):
                selected_services.append(cs)
            elif "crm" in cs_lower and ("crm" in req_lower or "log" in req_lower or "track" in req_lower):
                selected_services.append(cs)

        if not selected_services:
            selected_services = self._pick_n(seed, configured_services, 3)

        services = []
        for s in selected_services:
            if s not in services and len(services) < 5:
                services.append(s)

        all_benefits = [
            "Save Time",
            "Reduce Manual Work",
            "Increase Productivity",
            "Faster Response",
            "Improve Customer Experience",
            "Scale Business",
            "Reduce Human Errors"
        ]
        benefits = self._pick_n(seed, all_benefits, 4)

        # Understanding paragraph
        understanding_variants = [
            f"Based on our analysis, {client_company} requires a structured way to handle customer inquiries in the {client_industry} sector. Currently, processing inquiries manually results in delays and repetitive tasks for your staff. Introducing automation will allow your business to respond instantly to potential clients and free up your team for high-value operations.",
            f"For a business in the {client_industry} sector, managing customer outreach and bookings is a critical bottleneck. {client_company} needs an automated setup to capture, qualify, and organize incoming requests. This quotation outlines a simple, reliable solution to streamline these tasks, ensuring no opportunity is missed due to manual delays."
        ]
        understanding = self._pick(seed, understanding_variants)

        solution_variants = [
            f"We will design and implement a tailored automation setup for {client_company}. This system will automatically capture new leads, qualify their inquiries, and route them directly to your team. By automating customer outreach via messaging and email, you will engage leads instantly, increase conversion rates, and dramatically reduce manual data entry.",
            f"We will build a simple automation setup for {client_company} that qualifies incoming inquiries and automatically routes them to your team. This ensures faster customer response times, boosts productivity, and helps scale your sales operations without adding headcount."
        ]
        solution = self._pick(seed, solution_variants, offset=1)

        brand = company_settings.get('brand_name', 'AI WORKSFORYOU')
        company = company_settings.get('company_name', 'GDS MEDIA')
        about_company = f"{brand} (Powered by {company}) provides professional automation services. {company_desc} We specialize in: {services_list_str}."

        why_us = (
            f"Choose us because we are specialized in delivering high-impact automation setups. "
            f"Specifically: {company_desc} "
            f"By leveraging our core expertise in {configured_services[0]} and other customer-qualifying setups, "
            f"we make sure your workflow is efficient, stable, and completely tailored to your industry."
        )

        cta = "Let's schedule a meeting to finalize your automation solution."

        # Dynamic package pricing
        raw_packages = company_settings.get("default_packages")
        normalized_packages = self._normalize_packages(raw_packages)

        if not normalized_packages:
            normalized_packages = [
                {"name": "Starter", "price": "Contact Sales", "description": "Basic automation setups"},
                {"name": "Growth", "price": "Contact Sales", "description": "Comprehensive workflows"},
                {"name": "Enterprise", "price": "Custom Pricing", "description": "Custom builds and SLA"}
            ]

        return {
            "proposal_title": f"AI Automation Quotation for {client_company}",
            "client_name": client_name,
            "company_name": client_company,
            "industry": client_industry,
            "requirement": requirements,
            "client_email": client_details.get("email", ""),
            "client_phone": client_details.get("phone", ""),
            "about_company": about_company,
            "understanding": understanding,
            "solution": solution,
            "services": services,
            "benefits": benefits,
            "pricing_packages": normalized_packages,
            "why_us": why_us,
            "cta": cta
        }
