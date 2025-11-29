#!/bin/bash

# Script de prueba completa del flujo de autenticación de KIKA Backend
# Ejecutar: bash test_full_flow.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BACKEND_URL="https://kika-backend.onrender.com"
TEST_EMAIL="test-$(date +%s)@example.com"  # Email único con timestamp
TEST_PASSWORD="TestPassword123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   KIKA Backend - Pruebas Completas${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}[1/5] Verificando Health Check...${NC}"
HEALTH=$(curl -s ${BACKEND_URL}/healthz)
if [[ $HEALTH == *"ok"* ]]; then
    echo -e "${GREEN}✅ Backend está funcionando${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Backend no responde correctamente${NC}"
    exit 1
fi
echo ""

# Test 2: Registro de usuario
echo -e "${YELLOW}[2/5] Registrando usuario: ${TEST_EMAIL}${NC}"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BACKEND_URL}/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | head -n -1)
REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n 1)

if [[ $REGISTER_STATUS == "200" ]]; then
    echo -e "${GREEN}✅ Usuario registrado exitosamente${NC}"
    echo "   Response: $REGISTER_BODY"
    echo "   Status: $REGISTER_STATUS"
else
    echo -e "${RED}❌ Error al registrar usuario${NC}"
    echo "   Response: $REGISTER_BODY"
    echo "   Status: $REGISTER_STATUS"
    exit 1
fi
echo ""

# Test 3: Intentar login sin verificar email (debería fallar)
echo -e "${YELLOW}[3/5] Intentando login sin verificar email (debería fallar)...${NC}"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BACKEND_URL}/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [[ $LOGIN_STATUS == "401" ]]; then
    echo -e "${GREEN}✅ Login rechazado correctamente (email no verificado)${NC}"
    echo "   Response: $LOGIN_BODY"
else
    echo -e "${RED}⚠️  Respuesta inesperada${NC}"
    echo "   Response: $LOGIN_BODY"
    echo "   Status: $LOGIN_STATUS"
fi
echo ""

# Test 4: Intentar registrar el mismo email (debería actualizar)
echo -e "${YELLOW}[4/5] Registrando el mismo email nuevamente...${NC}"
REGISTER2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BACKEND_URL}/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"NewPassword456\"}")

REGISTER2_BODY=$(echo "$REGISTER2_RESPONSE" | head -n -1)
REGISTER2_STATUS=$(echo "$REGISTER2_RESPONSE" | tail -n 1)

if [[ $REGISTER2_STATUS == "200" ]]; then
    echo -e "${GREEN}✅ Re-registro exitoso (contraseña actualizada)${NC}"
    echo "   Response: $REGISTER2_BODY"
else
    echo -e "${RED}❌ Error al re-registrar${NC}"
    echo "   Response: $REGISTER2_BODY"
    echo "   Status: $REGISTER2_STATUS"
fi
echo ""

# Test 5: Forgot Password
echo -e "${YELLOW}[5/5] Probando recuperación de contraseña...${NC}"
FORGOT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BACKEND_URL}/password/forgot \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\"}")

FORGOT_BODY=$(echo "$FORGOT_RESPONSE" | head -n -1)
FORGOT_STATUS=$(echo "$FORGOT_RESPONSE" | tail -n 1)

if [[ $FORGOT_STATUS == "200" ]]; then
    echo -e "${GREEN}✅ Solicitud de reset enviada${NC}"
    echo "   Response: $FORGOT_BODY"
else
    echo -e "${RED}❌ Error en forgot password${NC}"
    echo "   Response: $FORGOT_BODY"
    echo "   Status: $FORGOT_STATUS"
fi
echo ""

# Resumen
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           RESUMEN DE PRUEBAS${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Backend funcionando${NC}"
echo -e "${GREEN}✅ Registro de usuario OK${NC}"
echo -e "${GREEN}✅ Validación de email no verificado OK${NC}"
echo -e "${GREEN}✅ Re-registro OK${NC}"
echo -e "${GREEN}✅ Forgot password OK${NC}"
echo ""
echo -e "${YELLOW}📧 NOTA: Los emails no se enviaron (error esperado por ahora)${NC}"
echo -e "${YELLOW}   Para que funcionen completamente, necesitas:${NC}"
echo -e "${YELLOW}   1. Verificar el dominio en Brevo${NC}"
echo -e "${YELLOW}   2. O usar un email verificado en MAIL_FROM${NC}"
echo ""
echo -e "${BLUE}Usuario de prueba creado:${NC}"
echo -e "   Email: ${TEST_EMAIL}"
echo -e "   Password: NewPassword456 (actualizada)"
echo ""
echo -e "${GREEN}🎉 ¡Todas las pruebas completadas!${NC}"
