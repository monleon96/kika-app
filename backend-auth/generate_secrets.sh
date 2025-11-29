#!/bin/bash

# Script para generar variables de entorno seguras para producción

echo "==================================="
echo "🔐 Generador de Variables Seguras"
echo "==================================="
echo ""

echo "JWT_SECRET (para tokens):"
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
echo ""

echo "ADMIN_API_KEY (para operaciones admin):"
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
echo ""

echo "==================================="
echo "✅ Copia estos valores a Render"
echo "==================================="
