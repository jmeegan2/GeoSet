#!/bin/bash
set -euo pipefail

# Bootstrap the wildfire proximity alert in Superset Alerts & Reports.
# Runs once after superset-init to seed the SQL alert via the REST API.

SUPERSET_URL="${SUPERSET_URL:-http://superset-web:8088}"
ADMIN_USER="${ADMIN_USERNAME:-admin}"
ADMIN_PASS="${ADMIN_PASSWORD}"
ALERT_RECIPIENT="${WILDFIRE_ALERT_RECIPIENT:-jmeegan@teamraft.com}"
COOKIE_JAR="/tmp/superset_cookies.txt"

echo "Waiting for Superset API to be ready..."
until curl -sf "${SUPERSET_URL}/health" > /dev/null 2>&1; do
  sleep 5
done

# Run the rest via Python to avoid bash quoting hell
python3 << PYEOF
import json, subprocess, sys

SUPERSET_URL = "${SUPERSET_URL}"
ADMIN_USER = "${ADMIN_USER}"
ADMIN_PASS = "${ADMIN_PASS}"
ALERT_RECIPIENT = "${ALERT_RECIPIENT}"
COOKIE_JAR = "${COOKIE_JAR}"

def curl(*args):
    """Run curl and return stdout."""
    cmd = ["curl", "-s", "-b", COOKIE_JAR, "-c", COOKIE_JAR] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def curl_json(*args):
    """Run curl and parse JSON response."""
    raw = curl(*args)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {raw[:200]}", file=sys.stderr)
        sys.exit(1)

# Login
print("Logging in...")
login_data = curl_json(
    f"{SUPERSET_URL}/api/v1/security/login",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS, "provider": "db"})
)
token = login_data["access_token"]
auth = f"Bearer {token}"
print("Login OK")

# CSRF - first call establishes session, second gets token
print("Fetching CSRF token...")
curl(f"{SUPERSET_URL}/api/v1/security/csrf_token/", "-H", f"Authorization: {auth}")
csrf_data = curl_json(f"{SUPERSET_URL}/api/v1/security/csrf_token/", "-H", f"Authorization: {auth}")
csrf_token = csrf_data["result"]
print("CSRF OK")

# Check if alert already exists
reports = curl_json(f"{SUPERSET_URL}/api/v1/report/", "-H", f"Authorization: {auth}")
existing = [r for r in reports.get("result", []) if r.get("name") == "Wildfire Proximity Alert"]
if existing:
    print("Wildfire Proximity Alert already exists, skipping.")
    sys.exit(0)

# Find DART database
databases = curl_json(f"{SUPERSET_URL}/api/v1/database/", "-H", f"Authorization: {auth}")
dart_dbs = [d for d in databases["result"] if "dart" in d["database_name"].lower()]
if not dart_dbs:
    print("ERROR: No 'dart' database found in Superset", file=sys.stderr)
    sys.exit(1)
database_id = dart_dbs[0]["id"]
print(f"Using database ID: {database_id}")

# Find the wildfire proximity chart
charts = curl_json(f"{SUPERSET_URL}/api/v1/chart/", "-H", f"Authorization: {auth}")
chart_matches = [c for c in charts.get("result", []) if "active wildfire locations program office" in c.get("slice_name", "").lower()]
chart_id = chart_matches[0]["id"] if chart_matches else None
if chart_id:
    print(f"Using chart ID: {chart_id}")
else:
    print("WARNING: No 'active wildfire locations program office' chart found")

# Build alert payload
alert = {
    "type": "Alert",
    "name": "Wildfire Proximity Alert",
    "description": "Daily alert when active wildfires are within 25 miles of program offices (NIFC data)",
    "active": True,
    "crontab": "0 8 * * *",
    "timezone": "America/New_York",
    "database": database_id,
    "sql": 'SELECT COUNT(*) FROM _program_locations_joined_with_active_nifc_fast WHERE "Name" IS NOT NULL AND is_fully_contained = false',
    "validator_type": "operator",
    "validator_config_json": {"op": ">", "threshold": 0},
    "recipients": [{"type": "Email", "recipient_config_json": {"target": ALERT_RECIPIENT}}],
    "report_format": "TEXT",
    "force_screenshot": False,
}
if chart_id:
    alert["chart"] = chart_id

# Create alert
print("Creating Wildfire Proximity Alert...")
result = curl_json(
    f"{SUPERSET_URL}/api/v1/report/",
    "-X", "POST",
    "-H", f"Authorization: {auth}",
    "-H", "Content-Type: application/json",
    "-H", f"X-CSRFToken: {csrf_token}",
    "-H", f"Referer: {SUPERSET_URL}/",
    "-d", json.dumps(alert)
)

if "id" in result:
    print(f"Wildfire Proximity Alert created, id: {result['id']}")
else:
    print(f"ERROR: {json.dumps(result, indent=2)}", file=sys.stderr)
    sys.exit(1)
PYEOF
