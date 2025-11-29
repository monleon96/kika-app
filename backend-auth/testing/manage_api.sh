#!/bin/bash

# Script para gestionar usuarios desde línea de comandos
# Usa los endpoints de la API de kika-backend

BACKEND_URL="https://kika-backend.onrender.com"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}🔧 KIKA Backend - Gestión de Usuarios${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Función para listar usuarios (requiere admin key)
list_users() {
    echo -e "${BLUE}📋 Listando usuarios...${NC}"
    read -p "Ingresa tu ADMIN_API_KEY: " admin_key
    
    curl -s -X GET "$BACKEND_URL/admin/users/list?limit=100" \
        -H "X-Admin-Key: $admin_key" \
        | jq '.' || echo -e "${RED}Error: Verifica tu admin key${NC}"
}

# Función para crear usuario
create_user() {
    echo -e "${BLUE}➕ Crear nuevo usuario${NC}"
    read -p "Email: " email
    read -s -p "Password: " password
    echo ""
    read -p "¿Usuario verificado? (true/false): " verified
    read -p "Ingresa tu ADMIN_API_KEY: " admin_key
    
    curl -s -X POST "$BACKEND_URL/admin/users/create" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $admin_key" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"verified\":$verified,\"is_active\":true}" \
        | jq '.' || echo -e "${RED}Error al crear usuario${NC}"
}

# Función para probar registro público
test_register() {
    echo -e "${BLUE}📝 Probar registro público${NC}"
    read -p "Email: " email
    read -s -p "Password: " password
    echo ""
    
    response=$(curl -s -X POST "$BACKEND_URL/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    echo -e "${GREEN}Respuesta:${NC}"
    echo "$response" | jq '.' || echo "$response"
}

# Función para probar login
test_login() {
    echo -e "${BLUE}🔐 Probar login${NC}"
    read -p "Email: " email
    read -s -p "Password: " password
    echo ""
    
    response=$(curl -s -X POST "$BACKEND_URL/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    echo -e "${GREEN}Respuesta:${NC}"
    echo "$response" | jq '.' || echo "$response"
}

# Función para obtener estado de usuario
get_user_status() {
    echo -e "${BLUE}👤 Obtener estado de usuario${NC}"
    read -p "Email: " email
    
    response=$(curl -s -X GET "$BACKEND_URL/users/$email")
    
    echo -e "${GREEN}Respuesta:${NC}"
    echo "$response" | jq '.' || echo "$response"
}

# Menú principal
while true; do
    echo ""
    echo -e "${BLUE}Selecciona una opción:${NC}"
    echo "1) Listar usuarios (admin)"
    echo "2) Crear usuario (admin)"
    echo "3) Probar registro público"
    echo "4) Probar login"
    echo "5) Obtener estado de usuario"
    echo "6) Ver docs API en navegador"
    echo "0) Salir"
    echo ""
    read -p "Opción: " option
    
    case $option in
        1) list_users ;;
        2) create_user ;;
        3) test_register ;;
        4) test_login ;;
        5) get_user_status ;;
        6) 
            echo -e "${GREEN}Abriendo: $BACKEND_URL/docs${NC}"
            xdg-open "$BACKEND_URL/docs" 2>/dev/null || open "$BACKEND_URL/docs" 2>/dev/null || echo "Abre manualmente: $BACKEND_URL/docs"
            ;;
        0) 
            echo -e "${GREEN}¡Hasta luego!${NC}"
            exit 0
            ;;
        *) echo -e "${RED}Opción inválida${NC}" ;;
    esac
done
