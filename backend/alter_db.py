import os
import psycopg2
from dotenv import load_dotenv

# Load .env from the same directory as this script (works on any machine)
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=dotenv_path)
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL is not set.")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        # Add columns if they do not exist
        cur.execute("ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS ongoing_support text;")
        cur.execute("ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS api_cost_information text;")
        conn.commit()
        print("Successfully added columns to company_settings (or they already existed).")
        
        # Verify columns again
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_settings';")
        columns = cur.fetchall()
        print("Updated columns:")
        for col in columns:
            print(f"- {col[0]}: {col[1]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
