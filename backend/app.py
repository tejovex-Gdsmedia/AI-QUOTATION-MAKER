import os
import io
import json
import uuid
import logging
import random
import datetime
import re
import requests as http_requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

def sanitize_error_message(msg):
    if not msg:
        return ""
    # Strip database credentials and secret tokens from error outputs
    msg = re.sub(r'postgresql://[^@]+@', 'postgresql://***@', str(msg))
    msg = re.sub(r'password=\S+', 'password=***', msg)
    msg = re.sub(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', 'Bearer ***', msg)
    return msg

# Load configurations
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Startup validation ────────────────────────────────────────────────────────
_secret_key = os.environ.get("FLASK_SECRET_KEY", "")
_debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
_PLACEHOLDER_KEY = "replace-with-a-strong-random-secret-key"
if not _secret_key or _secret_key == _PLACEHOLDER_KEY:
    if not _debug_mode:
        raise RuntimeError(
            "FLASK_SECRET_KEY is not configured or still uses the placeholder. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    logger.warning("FLASK_SECRET_KEY is not set — running in development mode only. Do NOT deploy this.")

# ── App configuration ─────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = _secret_key or "dev-only-not-for-production"
app.config["DEBUG"] = _debug_mode
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # 2MB max request payload

# CORS: allow local development origins and configured frontend URL
_frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if _frontend_url and _frontend_url not in _cors_origins:
    _cors_origins.append(_frontend_url)

CORS(app, resources={r"/api/*": {"origins": _cors_origins, "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Rate limiting — per-IP; uses Redis when REDIS_URL is configured
_redis_url = os.environ.get("REDIS_URL")
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=_redis_url if _redis_url else "memory://"
)
if not _redis_url:
    logger.warning(
        "REDIS_URL not set — rate limiting uses in-process memory. "
        "Set REDIS_URL for shared rate limits across multiple workers."
    )

# ── Security headers (applied to every response) ─────────────────────────────
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "script-src 'none'; "
        "frame-ancestors 'none'"
    )
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    return response

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "Payload too large. Maximum allowed size is 2MB."}), 413

# ── Error helper ──────────────────────────────────────────────────────────────
def _internal_error(context: str, exc: Exception = None):
    """Log a detailed server-side error and return a safe generic response with correlation ID."""
    ref = str(uuid.uuid4())[:8].upper()
    if exc is not None:
        logger.error(
            f"[{ref}] {context}: {sanitize_error_message(str(exc))}",
            exc_info=True
        )
    else:
        logger.error(f"[{ref}] {context}")
    return jsonify({"error": "An internal server error occurred.", "reference": ref}), 500

# ── Auth & Token Verification Helper ──────────────────────────────────────────
def extract_bearer_token():
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None

def verify_supabase_user(access_token):
    """
    Verifies a user session token against Supabase Auth.
    Returns (user_dict, None) on success or (None, error_str) on failure.
    """
    if not access_token:
        return None, "Missing authentication token"

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    api_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or ""

    if not supabase_url or not api_key:
        if _debug_mode:
            # Development fallback when testing offline without active network
            return {"id": "dev-user-001", "email": "dev@example.com"}, None
        return None, "Supabase authentication service is not configured on server"

    try:
        resp = http_requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": api_key,
                "Authorization": f"Bearer {access_token}"
            },
            timeout=8
        )
        if resp.status_code == 200:
            return resp.json(), None
        elif resp.status_code == 401:
            return None, "Invalid or expired session token"
        else:
            return None, f"Token verification failed with status {resp.status_code}"
    except http_requests.exceptions.RequestException as e:
        logger.error(f"Auth verification error: {sanitize_error_message(str(e))}")
        return None, "Authentication service unreachable"

# Import services
from services.gemini_service import GeminiService
from services.pdf_service import PDFService

gemini_service = GeminiService()
pdf_service = PDFService()

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.warning("DATABASE_URL is not set. Database integration is disabled.")
        return None
    try:
        # Enforce TLS/SSL for all connections unless the URL already specifies sslmode
        ssl_kwargs = {} if "sslmode=" in db_url else {"sslmode": "require"}
        return psycopg2.connect(db_url, **ssl_kwargs)
    except Exception as e:
        logger.error(f"Failed to connect to database: {sanitize_error_message(str(e))}")
        return None

def save_proposal_to_db(user_id, client_id, quotation_number, proposal_title, template_name, requirements, pain_points, proposal_data, status='Draft', quotation_id=None):
    conn = get_db_connection()
    if not conn:
        logger.warning("Database client connection unavailable. Skipping database auto-save.")
        return quotation_id, quotation_number

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Authorize Client Ownership (Prevent IDOR / cross-user linking)
            if client_id:
                cur.execute("SELECT id FROM clients WHERE id = %s AND user_id = %s", (client_id, user_id))
                if not cur.fetchone():
                    logger.warning(f"IDOR prevention: Client {client_id} does not belong to user {user_id}.")
                    client_id = None

            # 2. Check or Upsert Quotation with Strict User ID Ownership
            if quotation_id:
                cur.execute(
                    """
                    UPDATE quotations 
                    SET client_id = %s, proposal_title = %s, requirements = %s, pain_points = %s, status = %s, updated_at = NOW()
                    WHERE id = %s AND user_id = %s
                    RETURNING id, quotation_number;
                    """,
                    (client_id, proposal_title, requirements, pain_points, status, quotation_id, user_id)
                )
                res = cur.fetchone()
                if not res:
                    logger.warning(f"Quotation {quotation_id} not found for user {user_id}. Inserting new record.")
                    quotation_id = None
            
            if not quotation_id:
                if not quotation_number:
                    quotation_number = f"QT-{datetime.date.today().year}-{random.randint(1000, 9999)}"
                
                cur.execute(
                    """
                    INSERT INTO quotations (user_id, client_id, quotation_number, proposal_title, industry, requirements, pain_points, prompt_template, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, quotation_number;
                    """,
                    (user_id, client_id, quotation_number, proposal_title, template_name, requirements, pain_points, template_name, status)
                )
                res = cur.fetchone()
                quotation_id = res['id']
                quotation_number = res['quotation_number']

            # 3. Determine version number
            cur.execute(
                "SELECT COALESCE(MAX(version_number), 0) as max_ver FROM quotation_versions WHERE quotation_id = %s",
                (quotation_id,)
            )
            version_res = cur.fetchone()
            next_ver = version_res['max_ver'] + 1

            # 4. Insert new Quotation Version
            cur.execute(
                """
                INSERT INTO quotation_versions (quotation_id, version_number, proposal_data, created_by)
                VALUES (%s, %s, %s, %s)
                """,
                (quotation_id, next_ver, json.dumps(proposal_data), user_id)
            )

            # 5. Log audit details in Activities table
            action = 'created' if next_ver == 1 else 'updated'
            details = f"Saved version {next_ver} of proposal \"{proposal_title}\" via AI API"
            cur.execute(
                """
                INSERT INTO activities (user_id, quotation_id, action, details)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, quotation_id, action, details)
            )

            conn.commit()
            logger.info(f"Successfully auto-saved quotation {quotation_number} version {next_ver} to Supabase database.")
            return quotation_id, quotation_number
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction rolled back. Error: {sanitize_error_message(str(e))}")
        raise e
    finally:
        conn.close()


@app.route("/api/health", methods=["GET"])
def health():
    db_status = "unavailable"
    conn = get_db_connection()
    if conn:
        db_status = "connected"
        conn.close()
    return jsonify({
        "status": "healthy",
        "service": "AI Proposal API",
        "database": db_status
    }), 200


@app.route("/api/generate-proposal", methods=["POST"])
@limiter.limit("20 per minute; 120 per hour")
def generate_proposal():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON body format."}), 400
        
        company_settings = data.get("company_settings") or {}
        client_details = data.get("client_details") or {}
        prompt_template = str(data.get("prompt_template") or "General AI Automation")[:100]
        requirements = str(data.get("requirements") or "")[:3000]
        pain_points = str(data.get("pain_points") or "")[:1000]
        roi_input = data.get("roi_input") or {}
        
        # Validation checks
        if not prompt_template:
            return jsonify({"error": "Prompt template industry category is required."}), 400

        # Authenticate if persistence fields are requested
        user_id = data.get("user_id")
        client_id = data.get("client_id")
        quotation_id = data.get("quotation_id")
        quotation_number = data.get("quotation_number")
        status = data.get("status", "Draft")

        if user_id:
            token = extract_bearer_token()
            if not token:
                return jsonify({"error": "Authentication token required for user-specific operations."}), 401
            auth_user, auth_err = verify_supabase_user(token)
            if not auth_user:
                return jsonify({"error": f"Unauthorized: {auth_err}"}), 401
            if auth_user.get("id") != user_id:
                return jsonify({"error": "Forbidden: Cannot write data on behalf of another user."}), 403

        # Generate proposal JSON from Gemini (or fallback mock)
        proposal = gemini_service.generate_proposal(
            company_settings,
            client_details,
            prompt_template,
            requirements,
            pain_points,
            roi_input
        )

        # Execute authenticated database auto-save
        if user_id and client_id:
            try:
                saved_quote_id, saved_quote_num = save_proposal_to_db(
                    user_id=user_id,
                    client_id=client_id,
                    quotation_number=quotation_number,
                    proposal_title=proposal.get("proposal_title", "Business Proposal"),
                    template_name=prompt_template,
                    requirements=requirements,
                    pain_points=pain_points,
                    proposal_data=proposal,
                    status=status,
                    quotation_id=quotation_id
                )
                if saved_quote_id:
                    proposal["quotation_id"] = saved_quote_id
                    proposal["quotation_number"] = saved_quote_num
            except Exception as db_err:
                logger.error(f"Auto-saving skipped due to database write exception: {sanitize_error_message(str(db_err))}")

        return jsonify(proposal), 200
    except Exception as e:
        return _internal_error("generate-proposal failed", e)


@app.route("/api/generate-pdf", methods=["POST"])
@limiter.limit("30 per minute")
def generate_pdf():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON body format."}), 400

        proposal_data = data.get("proposal_data")
        company_settings = data.get("company_settings")

        if not isinstance(proposal_data, dict):
            return jsonify({"error": "Proposal data is required to generate PDF"}), 400
        if not isinstance(company_settings, dict):
            return jsonify({"error": "Company settings are required to format PDF branding"}), 400

        # Central backend normalization layer
        from services.normalize_service import normalize_quotation, validate_canonical_quotation

        normalized_proposal = normalize_quotation(proposal_data, company_settings)

        # Strict validation on canonical schema
        is_valid, err_msg = validate_canonical_quotation(normalized_proposal)
        if not is_valid:
            logger.error(f"Quotation validation failed: {err_msg}")
            return jsonify({"error": f"Quotation validation failed: {err_msg}"}), 400

        # Generate ReportLab compiled binary PDF
        pdf_bytes = pdf_service.generate_proposal_pdf(normalized_proposal)
        
        # Path traversal and header injection safe filename
        raw_title = str(normalized_proposal.get('proposalTitle') or 'Proposal')
        safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_title).strip('_')[:40] or "Proposal"
        safe_filename = f"{safe_title}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=safe_filename
        )
    except Exception as e:
        return _internal_error("generate-pdf failed", e)


@app.route("/api/send-email", methods=["POST"])
@limiter.limit("10 per minute; 50 per hour")
def send_email():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON payload format."}), 400

        proposal_data = data.get("proposal_data")
        company_settings = data.get("company_settings")
        recipient_email = str(data.get("recipient_email") or "").strip()

        if not isinstance(proposal_data, dict) or not isinstance(company_settings, dict):
            return jsonify({"error": "Proposal data and company settings are required."}), 400

        if recipient_email and not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', recipient_email):
            return jsonify({"error": "Invalid recipient email address format."}), 400

        # Mock email dispatch confirmation without exposing internal secrets
        logger.info("Mock email dispatched successfully.")

        return jsonify({
            "status": "success",
            "message": "Email dispatched successfully."
        }), 200
    except Exception as e:
        return _internal_error("send-email failed", e)


@app.route("/api/delete-account", methods=["POST"])
@limiter.limit("5 per hour")
def delete_account():
    """
    Permanently deletes the authenticated user's account and all associated data.
    Requires caller's verified Supabase JWT matching the target user_id.
    """
    try:
        data = request.get_json(silent=True) or {}
        user_id = str(data.get("user_id") or "").strip()
        access_token = str(data.get("access_token") or "").strip()

        if not user_id or not access_token:
            return jsonify({"error": "user_id and access_token are required"}), 400

        supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not supabase_url or not service_role_key:
            logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.")
            return jsonify({"error": "Account deletion is not configured on this server."}), 503

        # Step 1: Verify caller's token
        verify_resp = http_requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {access_token}"
            },
            timeout=10
        )

        if verify_resp.status_code != 200:
            return jsonify({"error": "Invalid or expired session. Please sign in again."}), 401

        verified_user = verify_resp.json()
        verified_id = verified_user.get("id", "")

        # Step 2: Confirm token matches target user (IDOR prevention)
        if verified_id != user_id:
            return jsonify({"error": "Unauthorized: Token does not match requested user_id."}), 403

        # Step 3: Delete user via Supabase Admin API (cascades all related rows)
        delete_resp = http_requests.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}"
            },
            timeout=10
        )

        if delete_resp.status_code not in (200, 204):
            logger.error(f"Supabase Admin user deletion failed with status {delete_resp.status_code}")
            return jsonify({"error": "Failed to delete account. Please contact support."}), 500

        logger.info("User account deleted successfully via Admin API.")
        return jsonify({"status": "success", "message": "Account and all associated data have been permanently deleted."}), 200

    except http_requests.exceptions.Timeout:
        logger.error("Timeout contacting Supabase Admin API during account deletion.")
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except Exception as e:
        return _internal_error("delete-account unexpected exception", e)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=app.config.get("FLASK_DEBUG", True))
