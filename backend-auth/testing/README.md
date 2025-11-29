# Testing Scripts - KIKA Backend

Scripts de prueba y utilidades para el backend de KIKA.

## Scripts disponibles

### `test_full_flow.sh`

Prueba completa del flujo de autenticación.

**Uso:**
```bash
bash testing/test_full_flow.sh
```

**Qué hace:**
1. ✅ Health check del backend
2. 👤 Registro de usuario (con email único)
3. 🔒 Intento de login sin verificar (debe fallar)
4. 🔄 Re-registro del mismo usuario
5. 📧 Solicitud de reset de contraseña

**Salida esperada:**
- Todos los tests pasan con ✅
- Crea un usuario de prueba con timestamp único
- Muestra el resumen de operaciones

---

### `view_users.sh`

Consulta usuarios registrados en la base de datos.

**Uso:**
```bash
# Ver un usuario específico
bash testing/view_users.sh usuario@email.com

# Buscar usuarios de prueba recientes
bash testing/view_users.sh
```

**Qué hace:**
- Consulta el endpoint `/users/{email}` del backend
- Muestra el estado de verificación y activación
- Útil para debugging y verificar registros

**Ejemplo de salida:**
```
=========================================
    Usuarios Registrados en KIKA
=========================================

🔍 Buscando usuario: test@example.com
✅ Usuario encontrado:
{
    "email": "test@example.com",
    "verified": true,
    "is_active": true
}
```

---

### `manage_api.sh`

Utilidad CLI para operaciones administrativas via API.

**Uso:**
```bash
bash testing/manage_api.sh [comando] [argumentos]
```

**Comandos disponibles:**
- `create-user <email> <password>` - Crear usuario
- `deactivate-user <email>` - Desactivar usuario
- `list-users` - Listar usuarios (requiere admin key)

**Requiere:**
- Variable de entorno `ADMIN_API_KEY` configurada

---

### `test_backend.sh`

Pruebas básicas de conectividad del backend.

**Uso:**
```bash
bash testing/test_backend.sh
```

**Qué hace:**
- Prueba el endpoint de health check
- Verifica que el backend responde correctamente

---

## Variables de entorno requeridas

Asegúrate de tener configurado en `.env`:

```bash
# Backend URL
KIKA_BACKEND_URL=https://kika-backend.onrender.com

# Admin key (solo para manage_api.sh)
ADMIN_API_KEY=tu_admin_key_aqui
```

---

## Notas

- Los scripts usan `curl` para hacer requests HTTP
- Algunos requieren `python3` con `json.tool` para formatear output
- Los timeouts están configurados para 30 segundos (Render free tier)
