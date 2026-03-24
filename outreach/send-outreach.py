#!/usr/bin/env python3
"""
Gmail Outreach Script — Dublin Trades Side Hustle
Sends personalized pitch emails to prospects.

Usage:
    python3 send-outreach.py --dry-run     # Preview emails without sending
    python3 send-outreach.py --send        # Actually send emails
    python3 send-outreach.py --send --prospect "Painters Dublin"  # Send to specific prospect
"""

import json
import os
import sys
import csv
import base64
import pickle
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime

# Gmail API
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

CREDENTIALS_PATH = os.path.expanduser('~/.credentials/gmail-credentials.json')
TOKEN_PATH = os.path.expanduser('~/.credentials/gmail-token.pickle')
PROSPECTS_CSV = os.path.join(os.path.dirname(__file__), 'prospects.csv')
SENT_LOG = os.path.join(os.path.dirname(__file__), 'sent-log.json')

SENDER_NAME = "Gbemi Akadiri — Verdantia Digital"
SENDER_EMAIL = "verdantiadigital@gmail.com"  # TODO: Update when new Gmail is ready

def load_credentials():
    with open(TOKEN_PATH, 'rb') as f:
        creds = pickle.load(f)
    if creds.expired:
        creds.refresh(Request())
    return creds

def build_gmail_service():
    creds = load_credentials()
    return build('gmail', 'v1', credentials=creds)

def load_prospects():
    prospects = []
    with open(PROSPECTS_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            prospects.append(row)
    return prospects

def load_sent_log():
    if os.path.exists(SENT_LOG):
        with open(SENT_LOG, 'r') as f:
            return json.load(f)
    return {}

def save_sent_log(log):
    with open(SENT_LOG, 'w') as f:
        json.dump(log, f, indent=2)

def generate_email_content(prospect, email_num=1):
    """Generate personalized email content for a prospect."""
    business = prospect['business_name']
    trade = prospect['trade']
    website = prospect['website']

    if email_num == 1:
        subject = f"{business} — something I want to show you"
        body = f"""Hi {business} Team,

I came across {business} recently and noticed you're offering {trade} services across Dublin — solid work from what I can see.

I run Verdantia Digital — we build professional websites specifically for trade businesses. Think of it like giving your business a digital storefront that actually works.

I've already put together a custom redesign for {business}. It's a rough mockup, but it shows what a modern, professional site could look like for your business — and I'd love to get your honest thoughts.

Here's the thing: I'm only taking on 3 new clients this month. These mockups are ready to go, and I'd prioritise the first few businesses that move quickly.

Worth a 5-minute look? If it's not relevant, no worries — just reply and I'll leave you alone.

Talk soon,
Gbemi Akadiri
Verdantia Digital
+353 89 975 8277"""

    elif email_num == 2:
        subject = f"Following up — {business} website mockup"
        body = f"""Hi {business} Team,

Just following up on the mockup I sent over — wanted to make sure it didn't get buried.

I've had a few other Dublin {trade} businesses reach out after seeing similar previews, and they're pretty happy with how things are shaping up.

No pressure at all. But if you've been thinking about upgrading your online presence, this is a good time to chat. I'm booking new sites over the next 2 weeks.

Happy to jump on a quick call if you're curious — even 10 minutes.

— Gbemi
Verdantia Digital
+353 89 975 8277"""

    else:
        subject = f"One last thing — {business}"
        body = f"""Hi {business} Team,

I won't take up any more of your time after this.

I just wanted to leave you with one thought: your website is usually the first thing a potential customer sees before they call. What does it say about {business} right now?

I've built these mockups for a handful of Dublin {trade} businesses, and the response has been genuinely positive — owners who weren't sure they needed a redesign changed their minds pretty quickly once they saw the difference.

If you're even slightly curious, I'd love to show you what I put together. No pitch, no pressure — just a quick look and honest advice on what's worth doing.

Talk soon,
Gbemi
Verdantia Digital
+353 89 975 8277"""

    return subject, body

def create_message(to_email, subject, body, prospect_name, attach_screenshots=True):
    message = MIMEMultipart()
    message['to'] = to_email
    message['from'] = SENDER_EMAIL
    message['subject'] = subject

    # Add a text part
    part1 = MIMEText(body, 'plain')
    message.attach(part1)

    # Attach all mockup screenshots if they exist
    if attach_screenshots:
        mockups_dir = os.path.join(os.path.dirname(__file__), 'mockups')
        screenshot_names = ['hero', 'services', 'pricing', 'contact']
        for shot_name in screenshot_names:
            shot_path = os.path.join(mockups_dir, f'{prospect_name.replace(" ", "-").lower()}-{shot_name}.png')
            if os.path.exists(shot_path):
                with open(shot_path, 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-Disposition', 'inline', filename=f'{shot_name}.png')
                    message.attach(img)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {'raw': raw}

def send_email(service, to_email, subject, body, prospect_name):
    message = create_message(to_email, subject, body, prospect_name, attach_screenshots=True)
    result = service.users().messages().send(userId='me', body=message).execute()
    return result

def dry_run(prospects):
    print("=" * 70)
    print("DRY RUN — No emails will be sent")
    print("=" * 70)
    print()

    sent_log = load_sent_log()

    for i, p in enumerate(prospects):
        email = p['email'].strip()
        if not email or email == 'not found':
            print(f"[{i+1}] {p['business_name']} — SKIP (no email found)")
            continue

        if email in sent_log:
            print(f"[{i+1}] {p['business_name']} ({email}) — ALREADY SENT")
            continue

        subject, body = generate_email_content(p, 1)
        print(f"[{i+1}] {p['business_name']} ({email})")
        print(f"    Subject: {subject}")
        print(f"    Body:\n{body}")
        print()

def send_all(prospects, specific_prospect=None):
    print("=" * 70)
    print("SENDING EMAILS")
    print("=" * 70)
    print()

    service = build_gmail_service()
    sent_log = load_sent_log()
    new_sends = []

    for i, p in enumerate(prospects):
        email = p['email'].strip()

        if specific_prospect and p['business_name'] != specific_prospect:
            continue

        if not email or email == 'not found':
            print(f"[{i+1}] {p['business_name']} — SKIP (no email found)")
            continue

        if email in sent_log:
            print(f"[{i+1}] {p['business_name']} ({email}) — ALREADY SENT, skipping")
            continue

        subject, body = generate_email_content(p, 1)
        print(f"[{i+1}] Sending to {p['business_name']} ({email})...")

        try:
            result = send_email(service, email, subject, body, p['business_name'])
            sent_log[email] = {
                'sent_at': datetime.now().isoformat(),
                'prospect': p['business_name'],
                'message_id': result.get('id', 'unknown')
            }
            new_sends.append(p['business_name'])
            print(f"    ✅ Sent! Message ID: {result.get('id')}")
        except Exception as e:
            print(f"    ❌ Failed: {e}")

    save_sent_log(sent_log)
    print()
    print(f"Done. Sent to {len(new_sends)} prospects: {new_sends}")

if __name__ == '__main__':
    args = sys.argv[1:]

    prospects = load_prospects()

    if '--dry-run' in args:
        dry_run(prospects)
    elif '--send' in args:
        specific = None
        if '--prospect' in args:
            idx = args.index('--prospect')
            specific = args[idx + 1] if idx + 1 < len(args) else None
        send_all(prospects, specific)
    else:
        print("Usage:")
        print("  python3 send-outreach.py --dry-run     # Preview emails")
        print("  python3 send-outreach.py --send        # Send all emails")
        print("  python3 send-outreach.py --send --prospect 'Name'  # Send to one")
