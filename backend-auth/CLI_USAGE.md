# 📋 Guía de uso del CLI - Gestión de Usuarios

Esta guía explica cómo usar el CLI (Command Line Interface) para administrar usuarios en el backend de KIKA.

## 🚀 Requisitos previos

Antes de usar el CLI, asegúrate de:

1. Tener el entorno de Poetry configurado
2. Tener la base de datos corriendo (PostgreSQL)
3. Estar en el directorio `kika-backend`

```bash
cd /home/MONLEON-JUAN/kika-backend
```

---

## 📖 Comandos disponibles

### Ver ayuda general

Para ver todos los comandos disponibles:

```bash
poetry run python -m cli --help
```

**Salida:**
```
Usage: cli.py [OPTIONS] COMMAND [ARGS]...

  Admin CLI for KIKA backend.

Options:
  --help  Show this message and exit.

Commands:
  create-user      Create a new user.
  deactivate-user  Deactivate a user.
  list-users       List users.
```

### Ver ayuda de un comando específico

```bash
poetry run python -m cli create-user --help
poetry run python -m cli list-users --help
poetry run python -m cli deactivate-user --help
```

---

## 1️⃣ Crear usuarios

### 1.1 Crear usuario SIN contraseña (solo email)

**Uso:** Ideal para usuarios que solo necesitan verificación por email.

```bash
poetry run python -m cli create-user usuario@example.com
```

**Resultado:**
```
✓ Created: usuario@example.com
```

**Estado del usuario:**
- ✅ Email: usuario@example.com
- ✅ Activo: Sí
- ❌ Verificado: No
- ❌ Contraseña: No tiene

---

### 1.2 Crear usuario verificado automáticamente

**Uso:** Para crear usuarios que no necesitan hacer clic en el email de verificación.

```bash
poetry run python -m cli create-user usuario@example.com --verify
```

**Resultado:**
```
✓ Created: usuario@example.com
✓ Verified
```

**Estado del usuario:**
- ✅ Email: usuario@example.com
- ✅ Activo: Sí
- ✅ Verificado: Sí (inmediatamente)
- ❌ Contraseña: No tiene

---

### 1.3 Crear usuario CON contraseña

**Uso:** Para usuarios que necesitan login con email + password.

```bash
poetry run python -m cli create-user usuario@example.com --password MiPassword123
```

**Resultado:**
```
(trapped) error reading bcrypt version  # ← Advertencia ignorable
✓ Created: usuario@example.com
✓ Password set
```

**Estado del usuario:**
- ✅ Email: usuario@example.com
- ✅ Activo: Sí
- ❌ Verificado: No
- ✅ Contraseña: Sí

> ⚠️ **Nota:** La advertencia sobre bcrypt es normal y no afecta el funcionamiento.

---

### 1.4 Crear usuario completo (verificado + contraseña)

**Uso:** Para administradores o usuarios que necesitan acceso inmediato con contraseña.

```bash
poetry run python -m cli create-user admin@example.com --password AdminPass456 --verify
```

**Resultado:**
```
(trapped) error reading bcrypt version  # ← Advertencia ignorable
✓ Created: admin@example.com
✓ Verified
✓ Password set
```

**Estado del usuario:**
- ✅ Email: admin@example.com
- ✅ Activo: Sí
- ✅ Verificado: Sí
- ✅ Contraseña: Sí

---

### 1.5 Usando la forma corta con `-p` y `-v`

Puedes usar versiones cortas de las opciones:

```bash
# -p en lugar de --password
# No hay versión corta de --verify

poetry run python -m cli create-user test@example.com -p Test123
```

---

## 2️⃣ Listar usuarios

### 2.1 Listar todos los usuarios (límite por defecto: 100)

```bash
poetry run python -m cli list-users
```

**Ejemplo de salida:**
```
3 users:

  superadmin@example.com
    verified:✓  active:✓  password:✓
    created:2025-11-03T13:35:59.290734+00:00
  admin@example.com
    verified:✓  active:✓  password:✗
    created:2025-11-03T13:35:24.119194+00:00
  test@example.com
    verified:✗  active:✓  password:✗
    created:2025-11-03T13:25:07.450345+00:00
```

**Símbolos:**
- ✓ = Sí / Activo
- ✗ = No / Inactivo

---

### 2.2 Listar con límite personalizado

```bash
# Listar solo los últimos 10 usuarios
poetry run python -m cli list-users --limit 10

# Forma corta con -l
poetry run python -m cli list-users -l 50
```

**Rango permitido:** 1 a 500 usuarios

---

## 3️⃣ Desactivar usuarios

### 3.1 Desactivar un usuario

**Uso:** Inhabilita la cuenta sin borrarla. El usuario no podrá hacer login.

```bash
poetry run python -m cli deactivate-user usuario@example.com
```

**Resultado:**
```
✓ Deactivated: usuario@example.com
```

**Efecto:**
- El usuario pasa a estado `activo: ✗`
- No puede hacer login
- La cuenta se mantiene en la base de datos
- Se puede reactivar editando manualmente la BD si es necesario

---

### 3.2 Verificar desactivación

Después de desactivar, puedes verificar:

```bash
poetry run python -m cli list-users
```

Verás:
```
  usuario@example.com
    verified:✓  active:✗  password:✓
    created:2025-11-03T13:00:00.000000+00:00
```

Nota el `active:✗`

---

## 🔍 Casos de uso comunes

### Caso 1: Crear administrador del sistema

Necesitas crear un super usuario con acceso inmediato:

```bash
poetry run python -m cli create-user admin@miapp.com --password SuperSecretPass123 --verify
```

Este usuario puede hacer login inmediatamente con email y contraseña.

---

### Caso 2: Crear usuario de prueba

Para testing, necesitas un usuario verificado sin contraseña:

```bash
poetry run python -m cli create-user test@example.com --verify
```

---

### Caso 3: Ver todos los usuarios activos

```bash
poetry run python -m cli list-users --limit 100
```

Busca los que tengan `active:✓`

---

### Caso 4: Usuario olvidó su contraseña

**Opción A:** Desactivar la cuenta temporalmente:

```bash
poetry run python -m cli deactivate-user usuario@example.com
```

**Opción B:** El usuario puede usar el endpoint `/password/forgot` desde la aplicación.

---

### Caso 5: Eliminar spam o usuarios maliciosos

```bash
# 1. Desactivar inmediatamente
poetry run python -m cli deactivate-user spam@hacker.com

# 2. Verificar
poetry run python -m cli list-users | grep spam@hacker.com
```

---

## ⚠️ Errores comunes

### Error: "User already exists"

```bash
poetry run python -m cli create-user test@example.com
```

**Salida:**
```
User test@example.com already exists
```

**Solución:** El email ya está registrado. Usa otro email o lista usuarios para verificar.

---

### Error: "User not found"

```bash
poetry run python -m cli deactivate-user noexiste@example.com
```

**Salida:**
```
User noexiste@example.com not found
```

**Solución:** Verifica el email con `list-users` primero.

---

### Error: Connection refused / Database error

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solución:**
1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker ps | grep pg-kika
   ```
2. Si no está corriendo, levántalo:
   ```bash
   docker start pg-kika
   ```

---

## 🔐 Seguridad y mejores prácticas

### ✅ DO (Hacer)

1. **Usa contraseñas fuertes:**
   ```bash
   poetry run python -m cli create-user admin@app.com --password "MyS3cur3P@ssw0rd!" --verify
   ```

2. **Verifica usuarios administrativos:**
   Siempre usa `--verify` para admins.

3. **Lista usuarios periódicamente:**
   ```bash
   poetry run python -m cli list-users --limit 500
   ```

4. **Documenta usuarios de prueba:**
   Mantén una lista de los emails de prueba que creas.

### ❌ DON'T (No hacer)

1. ❌ **No uses contraseñas débiles:**
   ```bash
   # MAL - Contraseña muy débil
   poetry run python -m cli create-user admin@app.com --password "123"
   ```

2. ❌ **No compartas contraseñas en logs o archivos:**
   Las contraseñas son hasheadas pero evita escribirlas en scripts versionados.

3. ❌ **No borres usuarios directamente de la BD:**
   Usa `deactivate-user` en lugar de eliminar registros.

---

## 📊 Resumen rápido de opciones

| Comando | Opción | Descripción | Ejemplo |
|---------|--------|-------------|---------|
| `create-user` | `EMAIL` (requerido) | Email del usuario | `user@example.com` |
| | `--password` / `-p` | Contraseña opcional | `--password Pass123` |
| | `--verify` | Marcar como verificado | `--verify` |
| `list-users` | `--limit` / `-l` | Número máximo de usuarios | `--limit 50` |
| `deactivate-user` | `EMAIL` (requerido) | Email del usuario a desactivar | `user@example.com` |

---

## 🧪 Flujo de prueba completo

Aquí hay un flujo completo para probar el CLI:

```bash
# 1. Ver usuarios existentes
poetry run python -m cli list-users

# 2. Crear usuario básico
poetry run python -m cli create-user basic@test.com

# 3. Crear usuario verificado
poetry run python -m cli create-user verified@test.com --verify

# 4. Crear usuario con contraseña
poetry run python -m cli create-user withpass@test.com --password TestPass123

# 5. Crear usuario completo
poetry run python -m cli create-user complete@test.com --password CompletePass456 --verify

# 6. Listar todos
poetry run python -m cli list-users

# 7. Desactivar uno
poetry run python -m cli deactivate-user basic@test.com

# 8. Verificar desactivación
poetry run python -m cli list-users
```

---

## 🔗 Integración con la API

### Verificar usuario creado desde CLI

Después de crear un usuario con CLI, puedes verificar desde la API:

```bash
# Ver estado del usuario
curl http://localhost:8000/users/admin@example.com

# Respuesta:
# {"email":"admin@example.com","verified":true,"is_active":true}
```

### Probar login

Si creaste un usuario con contraseña:

```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPass456"}'

# Respuesta exitosa:
# {"ok":true}
```

---

## 📝 Notas adicionales

### Sobre la advertencia de bcrypt

Verás esto al crear usuarios con contraseña:

```
(trapped) error reading bcrypt version
```

**Es normal y seguro ignorarlo.** La contraseña se hashea correctamente usando bcrypt 4.3.0.

### Sobre los timestamps

Todos los usuarios tienen un timestamp en formato ISO 8601 UTC:

```
created:2025-11-03T13:35:59.290734+00:00
```

Esto permite saber exactamente cuándo se creó cada usuario.

### Límites y validaciones

- **Email:** Debe ser válido (formato `user@domain.com`)
- **Contraseña:** Mínimo 8 caracteres (validado en la API)
- **Límite de usuarios:** Máximo 500 en una sola consulta

---

## 🆘 Soporte

Si encuentras problemas:

1. **Verifica el entorno:**
   ```bash
   poetry env info
   poetry show | grep -E "bcrypt|passlib|click"
   ```

2. **Verifica la base de datos:**
   ```bash
   docker ps | grep pg-kika
   ```

3. **Verifica las migraciones:**
   ```bash
   poetry run alembic current
   ```

4. **Logs del servidor:**
   Si el backend está corriendo, revisa los logs para más detalles.

---

## 📚 Recursos relacionados

- **Documentación API:** http://localhost:8000/docs
- **MailHog (emails):** http://localhost:8025
- **Archivo `.env`:** Configuración del backend
- **Archivo `models.py`:** Estructura de la tabla de usuarios

---

**Última actualización:** 3 de noviembre de 2025

**Versión del CLI:** 1.0.0

**Backend:** KIKA FastAPI
