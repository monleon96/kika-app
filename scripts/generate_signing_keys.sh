#!/bin/bash
# Generate Tauri signing keys for auto-updates
# Run this once and save the keys securely

set -e

echo "========================================"
echo "Tauri Update Key Generator"
echo "========================================"
echo ""

# Check if tauri-cli is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is required"
    exit 1
fi

# Generate keys using Tauri CLI
cd frontend
echo "Generating Tauri signing keys..."
npm run tauri signer generate -- -w ../tauri-signing-key

cd ..

echo ""
echo "========================================"
echo "Keys Generated!"
echo "========================================"
echo ""
echo "Files created:"
echo "  - tauri-signing-key (PRIVATE KEY - keep this secret!)"
echo "  - tauri-signing-key.pub (PUBLIC KEY)"
echo ""
echo "IMPORTANT: Set up GitHub Secrets:"
echo "  1. Go to your repository Settings > Secrets and variables > Actions"
echo "  2. Add TAURI_PRIVATE_KEY with the contents of tauri-signing-key"
echo "  3. Add TAURI_KEY_PASSWORD if you set one"
echo ""
echo "  4. Update frontend/src-tauri/tauri.conf.json:"
echo "     Set 'updater.pubkey' to the contents of tauri-signing-key.pub"
echo ""
echo "DO NOT commit the private key to git!"
echo ""

# Add to .gitignore if not already there
if ! grep -q "tauri-signing-key" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Tauri signing keys" >> .gitignore
    echo "tauri-signing-key" >> .gitignore
    echo "Added tauri-signing-key to .gitignore"
fi
