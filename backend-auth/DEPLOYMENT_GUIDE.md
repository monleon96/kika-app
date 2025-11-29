# Guía de Despliegue en Render + Brevo + Neon

## 📋 Resumen de Servicios

- **Render** → Hosting del backend (kika-backend)
- **Brevo** → Envío de emails (API)
- **Neon** → Base de datos PostgreSQL
- **Tauri** → Frontend (Desktop App)

---

## 🗄️ Paso 1: Configurar Base de Datos en Neon

### 1.1 Crear Proyecto en Neon
1. Ve a https://neon.tech
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Nombre: `kika-backend`
5. Región: Elige la más cercana a donde desplegarás Render

### 1.2 Obtener Connection String
Una vez creado el proyecto, copia la **connection string**:
```
postgres://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### 1.3 Convertir a formato asyncpg
Cambia `postgres://` por `postgresql+asyncpg://`:
```
postgresql+asyncpg://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

✅ **Guarda esta URL**, la necesitarás para Render.

---

## 📧 Paso 2: Configurar Brevo

### 2.1 Verificar tu Dominio
1. Ve a https://app.brevo.com
2. Settings → Senders & IP
3. Añade `no-reply@kika-app.com`
4. Verifica el dominio siguiendo las instrucciones de Brevo (añadir registros DNS)

### 2.2 Obtener API Key
Ya tienes tu API key: `xkeysib-CrMGZaKTXjxIEgk5`

✅ **API Key lista para usar**

---

## 🚀 Paso 3: Desplegar Backend en Render

### 3.1 Conectar Repositorio
1. Ve a https://render.com
2. Click en "New +" → "Web Service"
3. Conecta tu repositorio GitHub: `monleon96/KIKA`
4. Selecciona la carpeta: `/kika-backend`

### 3.2 Configuración Básica
```
Name: kika-backend
Region: Frankfurt (o la más cercana a Neon)
Branch: main (o feature/streamlit-ui)
Root Directory: kika-backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT
```

### 3.3 Variables de Entorno en Render

Añade estas variables en la sección "Environment":

```bash
# URL pública de tu backend (Render te la dará, ejemplo)
PUBLIC_BASE_URL=https://kika-backend.onrender.com

# CORS - permite tu Streamlit app
CORS_ALLOW_ORIGINS=["https://tu-streamlit-app.streamlit.app","http://localhost:8501"]

# Base de datos PostgreSQL de Neon
DATABASE_URL=postgresql+asyncpg://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Email - Brevo API
BREVO_API_KEY=xkeysib-CrMGZaKTXjxIEgk5
MAIL_FROM=no-reply@kika-app.com
MAIL_FROM_NAME=KIKA

# JWT y Tokens (genera valores seguros)
JWT_SECRET=genera_una_cadena_aleatoria_muy_larga_y_segura_aqui
JWT_EXPIRE_MIN=60
RESET_TOKEN_EXPIRE_MIN=30

# Admin API Key (genera un valor seguro)
ADMIN_API_KEY=otra_cadena_aleatoria_muy_larga_y_segura_aqui
```

### 3.4 Generar Claves Seguras

Ejecuta esto en tu terminal para generar claves:

```bash
# JWT_SECRET
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# ADMIN_API_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3.5 Ejecutar Migraciones

Una vez desplegado, necesitas ejecutar las migraciones de la base de datos.

**Opción A: Shell de Render**
1. En tu servicio en Render, ve a "Shell"
2. Ejecuta:
```bash
alembic upgrade head
```

**Opción B: Desde tu local**
1. Actualiza tu `.env` local temporalmente con el DATABASE_URL de Neon
2. Ejecuta:
```bash
alembic upgrade head
```
3. Restaura tu `.env` local

---

## 🎨 Paso 4: Actualizar Streamlit App

### 4.1 Actualizar Backend URL

Edita `streamlit_app/.env`:
```bash
KIKA_BACKEND_URL=https://kika-backend.onrender.com
```

### 4.2 Desplegar en Streamlit Cloud

1. Ve a https://streamlit.io/cloud
2. New app
3. Repositorio: `monleon96/KIKA`
4. Branch: `main`
5. Main file path: `streamlit_app/KIKA.py`

### 4.3 Configurar Secrets en Streamlit Cloud

En Settings → Secrets, añade:
```toml
KIKA_BACKEND_URL = "https://kika-backend.onrender.com"
```

---

## ✅ Paso 5: Verificar Todo Funciona

### 5.1 Probar Backend
```bash
curl https://kika-backend.onrender.com/health
# Debe devolver: {"status":"healthy"}
```

### 5.2 Probar Registro
1. Ve a tu Streamlit app
2. Crea una cuenta
3. Verifica que recibes el email de Brevo
4. Confirma el email
5. Inicia sesión

---

## 📝 Resumen de Variables de Entorno

### Para Render (kika-backend):
```bash
PUBLIC_BASE_URL=https://kika-backend.onrender.com
CORS_ALLOW_ORIGINS=["https://tu-app.streamlit.app"]
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?sslmode=require
BREVO_API_KEY=xkeysib-CrMGZaKTXjxIEgk5
MAIL_FROM=no-reply@kika-app.com
MAIL_FROM_NAME=KIKA
JWT_SECRET=[generar]
JWT_EXPIRE_MIN=60
RESET_TOKEN_EXPIRE_MIN=30
ADMIN_API_KEY=[generar]
```

### Para Streamlit Cloud:
```bash
KIKA_BACKEND_URL=https://kika-backend.onrender.com
```

### Para tu .env local (desarrollo):
```bash
PUBLIC_BASE_URL=http://localhost:8000
CORS_ALLOW_ORIGINS=["http://localhost:8501"]
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/kika
BREVO_API_KEY=xkeysib-CrMGZaKTXjxIEgk5
MAIL_FROM=no-reply@kika-app.com
MAIL_FROM_NAME=KIKA
JWT_SECRET=[tu clave local]
JWT_EXPIRE_MIN=60
RESET_TOKEN_EXPIRE_MIN=30
ADMIN_API_KEY=[tu clave local]
```

---

## 🔧 Troubleshooting

### Email no llega
- Verifica que el dominio está verificado en Brevo
- Revisa la carpeta de spam
- Comprueba los logs en Brevo → Statistics → Emails

### Error de CORS
- Añade tu URL de frontend a `CORS_ALLOW_ORIGINS`
- Formato: `["http://localhost:1420","tauri://localhost"]`

### Base de datos no conecta
- Verifica que la URL tiene `?sslmode=require`
- Comprueba que Neon permite conexiones desde Render
- Ejecuta `alembic upgrade head`

### Backend no inicia
- Revisa los logs en Render
- Verifica que todas las variables de entorno están configuradas
- Asegúrate que `requirements.txt` está actualizado

---

## 🎉 ¡Listo!

Tu aplicación KIKA debería estar funcionando en:
- Backend: `https://kika-backend.onrender.com`
- Frontend: Desktop App
- Emails vía Brevo API
- Base de datos en Neon PostgreSQL
