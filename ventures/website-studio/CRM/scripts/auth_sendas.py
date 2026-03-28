#!/usr/bin/env python3
"""Self-contained Graph auth + Send As test using only stdlib."""
import urllib.request, urllib.parse, urllib.error, json, time, ssl, os, sys

BASE = "/home/likwid/.openclaw/workspace/ventures/website-studio/CRM"
GRAPH_JSON = os.path.join(BASE, "config", "graph.json")
TOKEN_FILE = os.path.join(BASE, "config", "graph_token.json")
STATE_FILE = os.path.join(BASE, "config", "current_state.json")

def load_json(path):
    with open(path) as f: return json.load(f)

def save_json(path, data):
    with open(path, "w") as f: json.dump(data, f)

def hp(url, fields, headers=None):
    """POST application/x-www-form-urlencoded, return dict or raw."""
    data = urllib.parse.urlencode(fields).encode()
    h = {"Content-Type": "application/x-www-form-urlencoded", "Content-Length": str(len(data))}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, context=ssl.create_default_context()) as r:
            body = r.read().decode()
            try: return json.loads(body)
            except: return body
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body[:500]}")
        raise

def hp_json(url, body, token):
    """POST JSON, return status+body."""
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data,
        headers={"Authorization": f"Bearer {token}",
                 "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as r:
        return {"status": r.status, "body": json.loads(r.read().decode())}

def test_token(access_token):
    """Quick /me check."""
    req = urllib.request.Request("https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"})
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as r:
        return json.loads(r.read().decode()).get("mail", r.status)

# Load config
C = load_json(GRAPH_JSON)
client_id = C["clientId"]
tenant_id = C["tenantId"]

# Check existing token
token_valid = False
if os.path.exists(TOKEN_FILE):
    try:
        t = load_json(TOKEN_FILE)
        at = t.get("access_token")
        ea = t.get("expires_at")
        if at and ea:
            now_ms = int(time.time() * 1000)
            # Check expiry with 60s buffer
            if now_ms < ea - 60000:
                print(f"✓ Token still valid (expires {time.strftime('%H:%M', time.localtime(ea/1000))})")
                print(f"  Testing with existing token...")
                me_result = test_token(at)
                print(f"  /me says: {me_result}")
                token_valid = True
            else:
                print(f"✗ Token expired at {time.strftime('%H:%M', time.localtime(ea/1000))}")
    except Exception as e:
        print(f"Token check error: {e}")

if token_valid:
    pass  # skip to Send As test
else:
    print("Getting fresh device code...")
    dc_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/devicecode"
    dc = hp(dc_url, {
        "client_id": client_id,
        "scope": "offline_access https://graph.microsoft.com/.default"
    })
    if "error" in dc:
        print(f"Device code error: {dc}")
        sys.exit(1)

    user_code = dc["user_code"]
    device_code = dc["device_code"]
    interval = dc.get("interval", 5)
    expires_in = dc.get("expires_in", 300)
    expires_at = time.time() + expires_in

    save_json(STATE_FILE, {"device_code": device_code, "expires_at": expires_at, "interval": interval})
    # Also save user code in plain text for easy access
    with open(os.path.join(BASE, "config", "current_code.txt"), "w") as f:
        f.write(user_code)

    print(f"\n{'='*50}")
    print(f"  CODE: {user_code}")
    print(f"  URL:  https://login.microsoftonline.com/device")
    print(f"  Expires in ~{expires_in//60} minutes")
    print(f"{'='*50}")
    print("\nPolling every 5s... (Ctrl+C to abort)\n")

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    acquired = False

    while time.time() < expires_at:
        time.sleep(interval)
        try:
            tr = hp(token_url, {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": client_id,
                "device_code": device_code,
            })
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if "authorization_pending" in body:
                print(".", end="", flush=True)
                continue
            else:
                print(f"\nHTTP {e.code}: {body[:200]}")
                break
        if "access_token" in tr:
            tr["acquired_at"] = int(time.time() * 1000)
            tr["expires_at"] = tr["acquired_at"] + tr.get("expires_in", 3600) * 1000
            save_json(TOKEN_FILE, tr)
            print(f"\n✓ TOKEN SAVED")
            print(f"  Expires: {time.strftime('%H:%M', time.localtime(tr['expires_at']/1000))}")
            acquired = True
            break
        elif tr.get("error") == "authorization_pending":
            print(".", end="", flush=True)
        elif tr.get("error") == "expired_token":
            print("\n✗ Code expired. Run again.")
            sys.exit(1)
        else:
            print(f"\nError: {tr}")
            break

    if not acquired:
        print("\n✗ Timed out.")
        sys.exit(1)

# ---- Send As test ----
print("\nRunning Send As test...")
t = load_json(TOKEN_FILE)
at = t["access_token"]

res = hp_json("https://graph.microsoft.com/v1.0/me/sendMail", {
    "message": {
        "from": {"address": "studio@verdantia.it"},
        "toRecipients": [{"emailAddress": {"address": "oluwagbemi@verdantia.it"}}],
        "subject": "Verdantia CRM — Send As Test",
        "body": {"contentType": "Text", "content":
            "This is a test to verify the Send As API path from the Verdantia CRM.\n"
            "If you receive this, the full pipeline works correctly."}
    },
    "saveToSentItems": False
}, at)

print(f"HTTP {res['status']}")
if res['status'] == 202:
    print("SEND_AS_WORKS ✓")
else:
    print(f"Response: {json.dumps(res['body'], indent=2)}")
