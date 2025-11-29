#!/bin/bash

# Script para probar el backend después del deploy

echo "🧪 Probando KIKA Backend..."
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check..."
health=$(curl -s https://kika-backend.onrender.com/healthz)
if [[ $health == *"ok"* ]]; then
    echo "✅ Backend está vivo"
else
    echo "❌ Backend no responde"
    exit 1
fi
echo ""

# Test 2: Registro de usuario
echo "2️⃣ Probando registro..."
email="test-$(date +%s)@test.com"  # Email único con timestamp
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://kika-backend.onrender.com/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"test12345\"}")

http_code=$(echo "$response" | grep HTTP_CODE | cut -d: -f2)
body=$(echo "$response" | grep -v HTTP_CODE)

if [[ $http_code == "200" ]]; then
    echo "✅ Usuario registrado correctamente"
    echo "📧 Email de prueba: $email"
    echo "📝 Respuesta: $body"
else
    echo "❌ Error en el registro (HTTP $http_code)"
    echo "📝 Respuesta: $body"
    exit 1
fi
echo ""

echo "🎉 ¡Todas las pruebas pasaron!"
echo ""
echo "📋 Siguiente paso:"
echo "   1. Verifica que recibiste un email de verificación en Brevo"
echo "   2. Si no llega, revisa los logs de Brevo: https://app.brevo.com"
echo "   3. Prueba el login desde tu Streamlit app"
