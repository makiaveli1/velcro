#!/usr/bin/env python3
"""Minimal device code polling test."""
import urllib.request, urllib.parse, urllib.error, json, time, ssl

CLIENT_ID = "89f55189-c396-4444-b4fe-b03301c26d68"
TENANT_ID = "8669ffe2-3fed-463c-a64b-eff1dd4a34c8"

def hp(url, fields):
    data = urllib.parse.urlencode(fields).encode()
    h = {"Content-Type": "application/x-www-form-urlencoded", "Content-Length": str(len(data))}
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, context=ssl.create_default_context()) as r:
            body = r.read().decode()
            return {"ok": True, "status": r.status, "body": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ok": False, "status": e.code, "body": body}

# Get fresh device code
dc = hp("https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/devicecode", {
    "client_id": CLIENT_ID,
    "scope": "offline_access https://graph.microsoft.com/.default"
})
print("Device code response:", json.dumps(dc, indent=2))
if not dc["ok"]:
    print("Failed to get device code")
    exit(1)

device_code = dc["body"]["device_code"]
user_code = dc["body"]["user_code"]
interval = dc["body"].get("interval", 5)
expires_in = dc["body"].get("expires_in", 300)
expires_at = time.time() + expires_in

print(f"\nCODE: {user_code}")
print(f"URL: https://login.microsoftonline.com/device")
print(f"Poll interval: {interval}s, expires in {expires_in}s\n")

# Poll
polls = 0
while time.time() < expires_at and polls < 12:  # max 12 polls for test
    polls += 1
    time.sleep(interval)
    print(f"Poll {polls}...", end=" ", flush=True)
    tr = hp("https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/token", {
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "client_id": CLIENT_ID,
        "device_code": device_code,
    })
    print(f"status={tr['status']} body_len={len(tr['body'])}", end="", flush=True)
    if "access_token" in tr["body"]:
        print("\nGOT TOKEN!")
        break
    elif "authorization_pending" in tr["body"]:
        print(" pending")
        continue
    elif "expired_token" in tr["body"]:
        print("\nEXPIRED")
        break
    else:
        print(f"\nUNKNOWN: {tr['body'][:100]}")
        break
else:
    print(f"\nMax polls reached or timed out ({polls} polls)")
