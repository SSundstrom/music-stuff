#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p certs

# Detect local IP address
LOCAL_IP=$(ipconfig getifaddr en0)

if [ -z "$LOCAL_IP" ]; then
  echo "❌ Could not detect local IP address. Make sure you're connected to WiFi."
  exit 1
fi

echo "✓ Detected local IP: $LOCAL_IP"

# Check if certificates already exist
if [ -f "certs/server.crt" ] && [ -f "certs/server.key" ]; then
  # Check if existing certificate matches current IP
  EXISTING_IP=$(openssl x509 -in certs/server.crt -text -noout | grep -oP '(?<=DNS:)[^,]+' | head -1)
  if [ "$EXISTING_IP" = "$LOCAL_IP" ]; then
    echo "✓ Certificates already exist for $LOCAL_IP. Skipping generation."
    exit 0
  else
    echo "⚠ Certificates exist but for different IP ($EXISTING_IP). Regenerating..."
    rm -f certs/server.crt certs/server.key certs/server.csr
  fi
fi

# Create certificate signing request config
cat > certs/san.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = NO
ST = State
L = City
O = Organization
CN = $LOCAL_IP

[v3_req]
subjectAltName = DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1,IP:$LOCAL_IP
EOF

# Generate private key
openssl genrsa -out certs/server.key 2048

# Generate certificate signing request
openssl req -new -config certs/san.cnf -key certs/server.key -out certs/server.csr

# Generate self-signed certificate with SAN
openssl x509 -req -in certs/server.csr -signkey certs/server.key -out certs/server.crt \
  -days 365 -extensions v3_req -extfile certs/san.cnf

# Clean up temporary files
rm -f certs/server.csr certs/san.cnf

echo ""
echo "✓ HTTPS certificates generated in certs/"
echo "  Valid for: localhost, 127.0.0.1, and $LOCAL_IP"
echo ""
echo "To trust the certificate on macOS, run:"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/server.crt"
echo ""
echo "Then update your .env.local:"
echo "  NEXTAUTH_URL=https://$LOCAL_IP:3001"
echo ""
echo "And update Spotify Dashboard redirect URI to:"
echo "  https://$LOCAL_IP:3001/api/auth/callback/spotify"
