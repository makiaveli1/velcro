#!/usr/bin/env python3
"""Test email send to verify Gmail API is working."""

import json
import os
import base64
import pickle
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

CREDENTIALS_PATH = '/home/likwid/.credentials/gmail-credentials.json'
TOKEN_PATH = '/home/likwid/.credentials/gmail-token.pickle'

# Load credentials
with open(TOKEN_PATH, 'rb') as f:
    credentials = pickle.load(f)

# Refresh if expired
if credentials.expired:
    credentials.refresh(Request())

# Build Gmail service
service = build('gmail', 'v1', credentials=credentials)

# Create test email
message = MIMEMultipart()
message['to'] = 'likwidveli@gmail.com'
message['from'] = 'me'
message['subject'] = 'Nero Gmail API Test'

body = """Hey Gbemi,

This is a test email sent via the Gmail API that I just set up.

If you're reading this, the Gmail integration is working. 🎉

From your AI operator,
Nero"""

message.attach(MIMEText(body, 'plain'))

# Encode and send
raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
try:
    result = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    print(f"✅ Email sent! Message ID: {result['id']}")
except Exception as e:
    print(f"❌ Error: {e}")
