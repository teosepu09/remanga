# ReManga - Guía de Integración para Producción

## Archivos Generados

Se han creado los siguientes archivos para preparar tu proyecto para producción:

### 1. **app_production.py**
Versión de producción del backend con soporte para:
- ✅ Supabase Database (base de datos en la nube)
- ✅ Supabase Storage (almacenamiento de imágenes)
- ✅ Variables de entorno (.env)
- ✅ CORS habilitado automáticamente
- ✅ Fallback a SQLite si no hay Supabase
- ✅ Endpoints de salud para monitoreo

### 2. **config.js**
Archivo de configuración JavaScript que:
- ✅ Detecta automáticamente desarrollo vs producción
- ✅ Ajusta URLs dinámicamente según el entorno
- ✅ Proporciona funciones helper para fetch
- ✅ Gestiona URLs de imágenes correctamente

### 3. **netlify.toml**
Configuración de Netlify con:
- ✅ Headers CORS configurados
- ✅ Cache policies
- ✅ Redirecciones de API
- ✅ Variables de entorno por ambiente

### 4. **.env.example**
Plantilla de variables de entorno

### 5. **DEPLOYMENT.md**
Guía detallada de deployment con 3 opciones diferentes

---

## Pasos Para Implementar (Paso a Paso)

### PASO 1: Preparar Supabase (5 minutos)

```bash
# 1. Ir a https://supabase.com
# 2. Crear nuevo proyecto
# 3. Copiar:
#    - Project URL (ej: https://abcdef.supabase.co)
#    - Anon Key (API Key pública)
# 4. Ir a SQL Editor y ejecutar:
```

**SQL para Supabase:**
```sql
-- Crear tabla de productos
CREATE TABLE productos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  titulo TEXT NOT NULL,
  tomo TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  estado TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  imagen TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para búsquedas rápidas
CREATE INDEX idx_productos_titulo ON productos(titulo);
CREATE INDEX idx_productos_estado ON productos(estado);
```

### PASO 2: Configurar Almacenamiento de Imágenes

En Supabase:
1. Ir a **Storage**
2. Crear nuevo bucket: `imagenes-mangas`
3. Hacer público (Policy → Public)

### PASO 3: Crear archivo .env local

```bash
# En tu carpeta del proyecto, crear archivo .env
ENVIRONMENT=production
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key_aqui
SUPABASE_BUCKET=imagenes-mangas
FLASK_PORT=5000
FLASK_ENV=development
```

### PASO 4: Actualizar Python

```bash
# Instalar nuevas dependencias
pip install -r requirements.txt

# Verificar que funciona localmente
python app_production.py

# Probar en otra terminal:
# curl http://localhost:5000/health
```

### PASO 5: Publicar el Backend (Elegir uno)

**OPCIÓN A: Heroku (Recomendado para principiantes)**

```bash
# 1. Crear cuenta en https://heroku.com
# 2. Instalar Heroku CLI
# 3. En tu proyecto:

heroku login
heroku create tu-app-nombre

# Agregar variables de entorno
heroku config:set ENVIRONMENT=production
heroku config:set SUPABASE_URL=https://tu-proyecto.supabase.co
heroku config:set SUPABASE_KEY=tu_key_aqui
heroku config:set FLASK_PORT=8000

# Crear Procfile en la raíz del proyecto:
echo "web: python app_production.py" > Procfile

# Hacer push
git add .
git commit -m "Preparar para producción"
git push heroku main

# Verificar que funciona
heroku logs --tail
```

**OPCIÓN B: Railway (Más sencillo)**

```bash
# 1. Crear cuenta en https://railway.app
# 2. Conectar tu repo de GitHub
# 3. Ir a Variables en Railway:
#    - ENVIRONMENT = production
#    - SUPABASE_URL = https://...
#    - SUPABASE_KEY = tu_key
#    - FLASK_PORT = 8000
# 4. Railway despliega automáticamente
```

### PASO 6: Frontend en Netlify

```bash
# 1. Conectar repo en Netlify
# 2. Configuración de build:
#    - Build command: (dejar vacío)
#    - Publish directory: . (punto)
# 3. Ir a Site Settings → Build & Deploy → Environment
# 4. Agregar variable:
#    REACT_APP_API_URL = https://tu-app-heroku.herokuapp.com

# 5. En index.html agregar en <head>:
```

```html
<!-- En todos tus HTML, agregar en el <head> -->
<script>
  // Variable global para que script.js la detecte
  window.REMANGA_API_URL = 'https://tu-app-heroku.herokuapp.com';
</script>
```

---

## Cambios en los Archivos HTML

Actualizar todos los HTML (index.html, catalogo.html, etc.):

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <!-- ... otros meta tags ... -->
    
    <!-- AGREGAR ESTA LÍNEA: -->
    <script>
        window.REMANGA_API_URL = 'https://tu-app-heroku.herokuapp.com';
    </script>
    
    <!-- AGREGAR ESTA LÍNEA: -->
    <script src="config.js"></script>
    
    <!-- CSS -->
    <link rel="stylesheet" href="style.css">
</head>
```

---

## Migrar Datos de SQLite a Supabase

Si tienes datos en la base de datos local:

```python
# script-migrate.py
import sqlite3
from supabase import create_client

# Configurar conexiones
sqlite_conn = sqlite3.connect('db_mangas1.0.db')
sqlite_conn.row_factory = sqlite3.Row

supabase = create_client(
    'https://tu-proyecto.supabase.co',
    'tu_anon_key'
)

# Traer datos
cursor = sqlite_conn.cursor()
cursor.execute("SELECT * FROM productos")
productos = [dict(row) for row in cursor.fetchall()]

# Insertar en Supabase
for producto in productos:
    try:
        supabase.table("productos").insert(producto).execute()
        print(f"✓ Migrado: {producto['titulo']}")
    except Exception as e:
        print(f"✗ Error: {e}")

print(f"\nMigrados {len(productos)} productos")
sqlite_conn.close()
```

Ejecutar:
```bash
python script-migrate.py
```

---

## Pruebas de Endpoints

Una vez desplegado, verificar que funciona:

```bash
# Health check
curl https://tu-app-heroku.herokuapp.com/health

# Obtener productos
curl https://tu-app-heroku.herokuapp.com/api/productos

# Obtener un producto
curl https://tu-app-heroku.herokuapp.com/api/productos/1
```

---

## Variables de Entorno Resumidas

| Variable | Desarrollo | Producción |
|----------|-----------|-----------|
| ENVIRONMENT | development | production |
| FLASK_ENV | development | production |
| FLASK_PORT | 5000 | 8000 |
| API_URL | http://localhost:5000 | https://tu-app.herokuapp.com |
| SUPABASE_URL | - | https://tu-proyecto.supabase.co |
| SUPABASE_KEY | - | tu_anon_key |

---

## Estructura del Proyecto en Producción

```
Frontend (Netlify)
  ├── index.html
  ├── catalogo.html
  ├── config.js ← Lee variables globales
  └── static/
      └── script.js ← Usa API_URL dinámico

Backend (Heroku/Railway)
  ├── app_production.py ← Puerto 8000
  └── .env ← Variables secretas

Database (Supabase)
  ├── productos table
  └── imagenes-mangas bucket

CDN (Imágenes)
  └── https://supabase.../storage/v1/object/...
```

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error en front | Verificar CORS(app) en app_production.py |
| Imágenes no cargan | Verificar bucket es público en Supabase |
| API no responde | Ver logs en Heroku: `heroku logs --tail` |
| 404 en endpoints | Verificar ruta exacta en app_production.py |
| Variables no se leen | Verificar .env existe y `pip install python-dotenv` |

---

## Próximos Pasos (Recomendado)

1. ✅ Implementar autenticación (Supabase Auth)
2. ✅ Agregar validación de usuarios en vender.html
3. ✅ Implementar carrito persistente
4. ✅ Agregar sistema de pagos (Stripe/MercadoPago)
5. ✅ Agregar caché de imágenes
6. ✅ Monitorear performance

---

## Contacto & Recursos

- Documentación Supabase: https://supabase.com/docs
- Documentación Heroku: https://devcenter.heroku.com/
- Documentación Flask: https://flask.palletsprojects.com/
- CORS Flask: https://flask-cors.readthedocs.io/
