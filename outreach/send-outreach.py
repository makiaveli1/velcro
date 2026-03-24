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

SENDER_NAME = "Gbemi Akadiri"
SENDER_EMAIL = "likwidveli@gmail.com"

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
        subject = f"What if your {trade} website brought you 2x more calls?"
        body = f"""Hi {business} Team,

I came across your site recently and noticed you offer great {trade} services across Dublin — but I have to be honest with you:

Your website isn't working as hard as it should be.

Most of the businesses I work with are leaving 30–50% of their incoming leads on the table because their site looks outdated, loads slowly, or doesn't show up well on Google when people search for "{trade} Dublin."

I've put together a quick mockup redesign for {business} — takes 2 minutes to look at — showing exactly what a modern, professional site could look like for your business.

Would you be open to a 2-minute look? If it's not for you, no worries at all — just reply and I'll leave you alone.

Either way — what would it mean for your business if you doubled your website leads?

Best,
Gbemi
+353 89 975 8277"""
    elif email_num == 2:
        subject = f"Quick follow up — {business} website"
        body = f"""Hi {business} Team,

Just following up on my note from a few days ago about your website.

I genuinely think there's real potential there — a clean redesign could make a meaningful difference to how many people contact you versus your competitors.

I've attached the mockup again — happy to share the full version if you'd like to take a look.

Even if you're not ready to make a change right now, it might be worth having a conversation about what's possible.

Happy to jump on a quick 10-minute call this week if you're curious.

— Gbemi
+353 89 975 8277"""
    else:
        subject = f"One more thing on {business}"
        body = f"""Hi {business} Team,

I won't take up any more of your time after this — but I wanted to leave you with one thought:

Your website is usually the first thing a potential customer sees before they call. What does it say about your business right now?

I've built websites for {trade} businesses across Dublin and the difference in customer inquiries after the redesign is real and measurable.

If you're even slightly curious, I'd love to show you what I put together. No pitch, no pressure — just a quick look.

Talk soon,
Gbemi
+353 89 975 8277"""

    return subject, body

def create_message(to_email, subject, body, prospect_name):
    message = MIMEMultipart()
    message['to'] = to_email
    message['from'] = SENDER_EMAIL
    message['subject'] = subject

    # Add a text part
    part1 = MIMEText(body, 'plain')
    message.attach(part1)

    # Try to attach a mockup image if it exists
    mockup_path = os.path.join(os.path.dirname(__file__), 'mockups', f'{prospect_name.replace(" ", "-").lower()}-mockup.png')
    if os.path.exists(mockup_path):
        with open(mockup_path, 'rb') as f:
            img = MIMEImage(f.read())
            img.add_header('Content-Disposition', 'attachment', filename=f'{prospect_name}-mockup.png')
            message.attach(img)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {'raw': raw}

def send_email(service, to_email, subject, body, prospect_name):
    message = create_message(to_email, subject, body, prospect_name)
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
