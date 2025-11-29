#!/bin/bash

# Script para ver usuarios registrados en KIKA
# Uso: bash view_users.sh [email_opcional]

BACKEND_URL="https://kika-backend.onrender.com"
ADMIN_KEY="1hyiGV8gozClCQm4-eAhOMcWzrB2FYqdNarsdYcQGPc"

echo "========================================="
echo "    Usuarios Registrados en KIKA"
echo "========================================="
echo ""

if [ -n "$1" ]; then
    # Si se proporciona un email, buscar ese usuario específico
    echo "🔍 Buscando usuario: $1"
    RESPONSE=$(curl -s "https://kika-backend.onrender.com/users/$1")
    
    if [[ $RESPONSE == *"email"* ]]; then
        echo "✅ Usuario encontrado:"
        echo "$RESPONSE" | python3 -m json.tool
    else
        echo "❌ Usuario no encontrado o error"
        echo "$RESPONSE"
    fi
else
    # Listar usuarios recientes registrados desde el test
    echo "📋 Verificando usuarios de prueba recientes..."
    echo ""
    
    # Obtener timestamp actual y buscar en las últimas 2 horas
    CURRENT_TIME=$(date +%s)
    START_TIME=$((CURRENT_TIME - 7200))  # Últimas 2 horas
    
    echo "Usuarios creados en los tests (últimas 2 horas):"
    echo ""
    
    for ts in $(seq $START_TIME 60 $CURRENT_TIME); do
        EMAIL="test-${ts}@example.com"
        RESULT=$(curl -s "https://kika-backend.onrender.com/users/$EMAIL" 2>/dev/null)
        
        if [[ $RESULT == *"email"* ]]; then
            VERIFIED=$(echo "$RESULT" | grep -o '"verified":[^,}]*' | cut -d':' -f2)
            ACTIVE=$(echo "$RESULT" | grep -o '"is_active":[^,}]*' | cut -d':' -f2)
            
            printf "  📧 %-40s" "$EMAIL"
            
            if [[ $VERIFIED == "true" ]]; then
                printf " ✅ Verificado"
            else
                printf " ⏳ Pendiente"
            fi
            
            if [[ $ACTIVE == "true" ]]; then
                printf " 🟢 Activo\n"
            else
                printf " 🔴 Inactivo\n"
            fi
        fi
    done
    
    echo ""
    echo "💡 Para buscar un usuario específico: bash view_users.sh usuario@email.com"
fi
