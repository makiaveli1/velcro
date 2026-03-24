#!/usr/bin/env python3
"""
Gmail OAuth2 Setup Script - Manual Console Flow
For headless environments (WSL, SSH, etc.)
"""

import json
import os
from google_auth_oauthlib.flow import Flow
import pickle
import urllib.parse

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
CREDENTIALS_PATH = os.path.expanduser('~/.credentials/gmail-credentials.json')
TOKEN_PATH = os.path.expanduser('~/.credentials/gmail-token.pickle')

def main():
    print("=" * 60)
    print("GMAIL API OAUTH2 SETUP")
    print("=" * 60)
    
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"ERROR: Credentials file not found at {CREDENTIALS_PATH}")
        return
    
    with open(CREDENTIALS_PATH, 'r') as f:
        credentials_info = json.load(f)
    
    installed = credentials_info['installed']
    
    # Build authorization URL manually
    auth_params = {
        'client_id': installed['client_id'],
        'redirect_uri': 'http://localhost:8080',
        'scope': SCOPES[0],
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    
    auth_url = f"{installed['auth_uri']}?{urllib.parse.urlencode(auth_params)}"
    
    print(f"\n📋 STEP 1: Get Authorization Code")
    print("-" * 60)
    print("Visit this URL in your browser:\n")
    print(auth_url)
    print("\n" + "-" * 60)
    print("Once you grant permission, you'll be redirected to")
    print("http://localhost:8080?code=XXXXX")
    print("\nThe page won't load (that's fine), but COPY THE CODE")
    print("from the URL bar in your browser.")
    print("\nPaste the code here: ", end='')
    
    auth_code = input().strip()
    
    if not auth_code:
        print("No code entered. Exiting.")
        return
    
    print(f"\n📋 STEP 2: Exchange Code for Tokens")
    print("-" * 60)
    print("Exchanging authorization code for tokens...")
    
    # Exchange code for tokens
    import requests
    
    token_data = {
        'code': auth_code,
        'client_id': installed['client_id'],
        'client_secret': installed['client_secret'],
        'redirect_uri': 'http://localhost:8080',
        'grant_type': 'authorization_code'
    }
    
    response = requests.post(installed['token_uri'], data=token_data)
    
    if response.status_code != 200:
        print(f"ERROR: Token exchange failed!")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    token_response = response.json()
    print(f"✅ Got access token!")
    print(f"   Access token expires in: {token_response.get('expires_in', 'N/A')} seconds")
    
    # Save the credentials with the tokens
    from google.oauth2.credentials import Credentials
    
    credentials = Credentials(
        token=token_response['access_token'],
        refresh_token=token_response.get('refresh_token'),
        token_uri=installed['token_uri'],
        client_id=installed['client_id'],
        client_secret=installed['client_secret'],
        scopes=SCOPES
    )
    
    # Save using pickle (for use with google-auth library)
    with open(TOKEN_PATH, 'wb') as f:
        pickle.dump(credentials, f)
    
    print(f"\n✅ SUCCESS!")
    print(f"   Credentials saved to: {TOKEN_PATH}")
    
    # Also save a human-readable version of the token info
    token_info_path = os.path.expanduser('~/.credentials/gmail-token-info.json')
    with open(token_info_path, 'w') as f:
        json.dump({
            'access_token': token_response['access_token'],
            'refresh_token': token_response.get('refresh_token'),
            'token_uri': installed['token_uri'],
            'client_id': installed['client_id'],
            'client_secret': installed['client_secret'],
            'scopes': SCOPES
        }, f, indent=2)
    
    print(f"   Token info saved to: {token_info_path}")
    print("\n🎉 Gmail API is ready to send emails!")

if __name__ == '__main__':
    main()
