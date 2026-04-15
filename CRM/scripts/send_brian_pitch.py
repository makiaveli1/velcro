#!/usr/bin/env python3
"""Send Brian McGarry pitch from studio@verdantia.it via Graph API."""
import urllib.request, urllib.error, ssl, json, os, time

BASE = "/home/likwid/.openclaw/workspace/ventures/website-studio/CRM"
TOKEN_FILE = os.path.join(BASE, "config", "graph_token.json")

# Load token
with open(TOKEN_FILE) as f:
    token = json.load(f)

access_token = token.get("access_token")
if not access_token:
    print("ERROR: No access token")
    exit(1)

expires_at = token.get("expires_at", 0)
now_ms = int(time.time() * 1000)
expires_s = expires_at if expires_at > 1e12 else expires_at * 1000
if now_ms > expires_s:
    print("ERROR: Token expired")
    print(f"Expired: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(expires_s/1000))}")
    exit(1)

print(f"Token valid. Expires: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(expires_s/1000))}")

# Build pitch email
subject = "Brian McGarry — a quick observation"
body_text = """I searched "plumber Dublin 12" on Google just now — the local map pack shows 3 businesses. Brian McGarry wasn't one of them.

That's the first thing Dublin 12 homeowners see when they need a plumber. And right now, your competitors are showing up there instead of you.

You've been operating since 2014 from St. Brendan's Crescent, Walkinstown. That's 11 years of local reputation — and a Google searcher has no way to find any of it. We're not talking about a website redesign problem. We're talking about a discovery gap: homeowners in your area who would call you, finding your competitors instead.

A Google Business Profile listing + a simple 1-page website would fix that — and put you in the map pack alongside the other Dublin 12 plumbers.

Happy to share what we found. No commitment, no sales call.

Best,
Gbemi Akadiri
Verdantia Ltd"""

# Build HTML body
body_html = f"""<p>I searched "plumber Dublin 12" on Google just now — the local map pack shows 3 businesses. Brian McGarry wasn't one of them.</p>

<p>That's the first thing Dublin 12 homeowners see when they need a plumber. And right now, your competitors are showing up there instead of you.</p>

<p>You've been operating since 2014 from St. Brendan's Crescent, Walkinstown. That's 11 years of local reputation — and a Google searcher has no way to find any of it. We're not talking about a website redesign problem. We're talking about a discovery gap: homeowners in your area who would call you, finding your competitors instead.</p>

<p>A Google Business Profile listing + a simple 1-page website would fix that — and put you in the map pack alongside the other Dublin 12 plumbers.</p>

<p>Happy to share what we found. No commitment, no sales call.</p>

<p>Best,<br>
Gbemi Akadiri<br>
Verdantia Ltd</p>"""

payload = json.dumps({
    "message": {
        "from": {"address": "studio@verdantia.it"},
        "toRecipients": [{"emailAddress": {"address": "brianmcgarry90@gmail.com"}}],
        "subject": subject,
        "body": {"contentType": "HTML", "content": body_html}
    },
    "saveToSentItems": False
}).encode()

req = urllib.request.Request(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    data=payload,
    headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    },
    method="POST"
)

ctx = ssl.create_default_context()
try:
    resp = urllib.request.urlopen(req, context=ctx)
    print(f"SEND RESULT: {resp.status}")
    print(f"TO: brianmcgarry90@gmail.com")
    print(f"FROM: studio@verdantia.it")
    print(f"SUBJECT: {subject}")
    print("SEND_WORKS")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"SEND FAILED: {e.code}")
    print(body[:500])
except Exception as e:
    print(f"SEND ERROR: {e}")
