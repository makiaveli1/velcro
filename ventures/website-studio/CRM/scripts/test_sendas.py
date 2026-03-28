#!/usr/bin/env python3
import subprocess, os, json, time

base = "/home/likwid/.openclaw/workspace/ventures/website-studio/CRM"
os.chdir(base)

# Kill all node processes
subprocess.run(["pkill", "-9", "node"], stderr=subprocess.DEVNULL)
time.sleep(2)

# Check if token is valid
token_file = os.path.join(base, "config", "graph_token.json")
if os.path.exists(token_file):
    with open(token_file) as f:
        token = json.load(f)
    access_token = token.get("access_token")
    expires_at = token.get("expires_at")
    now_ms = int(time.time() * 1000)

    if access_token:
        print(f"Token: FOUND")
        print(f"Expires_at (raw): {expires_at}")
        print(f"Now (ms): {now_ms}")
        if expires_at:
            expires_s = expires_at if expires_at > 1e12 else expires_at * 1000
            print(f"Expires: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(expires_s/1000))}")
            print(f"Expired: {now_ms > expires_s}")

        # Try Send As test
        import urllib.request, urllib.error, ssl

        ctx = ssl.create_default_context()
        data = json.dumps({
            "message": {
                "from": {"address": "studio@verdantia.it"},
                "toRecipients": [{"emailAddress": {"address": "oluwagbemi@verdantia.it"}}],
                "subject": "Verdantia CRM — Send As Test",
                "body": {"contentType": "Text", "content": "Test from CRM Send As API."}
            },
            "saveToSentItems": False
        }).encode()

        req = urllib.request.Request(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            data=data,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            method="POST"
        )
        try:
            resp = urllib.request.urlopen(req, context=ctx)
            print(f"SEND AS RESULT: {resp.status}")
            print("SEND_AS_WORKS")
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"SEND AS FAILED: {e.code} {body[:200]}")
        except Exception as e:
            print(f"SEND AS ERROR: {e}")
    else:
        print("No access_token in token file")
else:
    print("No token file")
