# Guía de Deployment - ReManga

## Opciones de Deployment

### Opción 1: Backend en Heroku/Railway + Supabase + Netlify (RECOMENDADO)

Esta es la configuración más flexible y escalable.

#### Paso 1: Configurar Supabase (Base de Datos)

1. **Crear cuenta en Supabase:**
   - Ir a https://supabase.com
   - Crear un nuevo proyecto
   - Guardar:
     - `SUPABASE_URL` (Project URL)
     - `SUPABASE_KEY` (anon public key)

2. **Crear tabla de productos:**
   ```sql
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
   ```

3. **Crear bucket para imágenes:**
   - Ir a "Storage" en Supabase
   - Crear nuevo bucket llamado `imagenes-mangas`
   - Hacer público (public policy)

#### Paso 2: Configurar Backend (Heroku o Railway)

**Usando Heroku:**

1. Crear cuenta en https://heroku.com
2. Instalar Heroku CLI
3. En tu carpeta del proyecto:
   ```bash
   heroku login
   heroku create tu-app-nombre
   heroku config:set ENVIRONMENT=production
   heroku config:set SUPABASE_URL=https://tu-proyecto.supabase.co
   heroku config:set SUPABASE_KEY=tu_anon_key
   ```

4. Crear archivo `Procfile` en la raíz:
   ```
   web: python app_production.py
   ```

5. Hacer push:
   ```bash
   git push heroku main
   ```

**Usando Railway:**

1. Crear cuenta en https://railway.app
2. Conectar tu repositorio de GitHub
3. Ir a "Variables" y agregar:
   - `ENVIRONMENT=production`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `FLASK_PORT=8000`

#### Paso 3: Frontend en Netlify

1. Crear cuenta en https://netlify.com
2. Conectar tu repositorio de GitHub
3. Configurar Build:
   - Build command: (dejar en blanco)
   - Publish directory: `/` (raíz del proyecto)

4. Ir a "Site settings" → "Build & deploy" → "Environment"
5. Agregar variable:
   ```
   REACT_APP_API_URL = https://tu-app-heroku.herokuapp.com
   ```

6. En tu archivo `index.html`, agregar en `<head>`:
   ```html
   <script>
     window.REMANGA_API_URL = 'https://tu-app-heroku.herokuapp.com';
   </script>
   ```

#### Paso 4: Actualizar archivos locales

1. **Renombrar** `app.py` a `app_dev.py` (backup)
2. **Usar** `app_production.py` como `app.py`
3. **Crear** archivo `.env.local`:
   ```
   API_URL=https://tu-app-heroku.herokuapp.com
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu_anon_key
   SUPABASE_BUCKET=imagenes-mangas
   ENVIRONMENT=production
   ```

---

### Opción 2: Todo en Render.com (Simplificado)

Render permite alojar frontend + backend en un mismo lugar:

1. Crear cuenta en https://render.com
2. Crear nuevo "Web Service"
3. Conectar repositorio GitHub
4. Configurar:
   - Build: `pip install -r requirements.txt`
   - Start: `python app_production.py`
5. Agregar variables de entorno (SUPABASE_URL, SUPABASE_KEY, etc.)

---

### Opción 3: Solo Frontend en Netlify + API Externa

Si ya tienes API en otro servidor:

1. En el archivo `config.js`, cambiar:
   ```javascript
   const API_URL = 'https://tu-api-existente.com';
   ```

2. Subir a Netlify normalmente

---

## Cambios necesarios en los archivos

### 1. `config.js` (Crear si no existe)
✅ **Ya incluido** - Este archivo detecta automáticamente el entorno

### 2. `index.html` (y todos los HTML)
Agregar en el `<head>`:
```html
<script src="config.js"></script>
```

Cambiar la referencia en `script.js`:
```javascript
// Antes:
const API_URL = "http://127.0.0.1:5000";

// Después:
const API_URL = window.REMANGA_API_URL || Config.API_URL;
```

### 3. `requirements.txt`
Actualizar para agregar Supabase:
```
Flask==2.3.0
Flask-CORS==4.0.0
Werkzeug==2.3.0
supabase==2.0.0
python-dotenv==1.0.0
```

### 4. `app_production.py`
✅ **Ya incluido** - Este archivo es el principal para producción

---

## Variables de Entorno Necesarias

### Desarrollo Local (.env.local)
```
ENVIRONMENT=development
API_URL=http://127.0.0.1:5000
FLASK_PORT=5000
FLASK_ENV=development
```

### Producción (Heroku/Railway/Render)
```
ENVIRONMENT=production
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
SUPABASE_BUCKET=imagenes-mangas
FLASK_PORT=5000
```

---

## Testing en Producción

Antes de hacer push:

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Exportar variables de entorno
set ENVIRONMENT=production
set SUPABASE_URL=https://tu-proyecto.supabase.co
set SUPABASE_KEY=tu_key

# 3. Ejecutar servidor
python app_production.py

# 4. Probar en otra terminal
curl http://localhost:5000/health
```

---

## Migración de Datos SQLite a Supabase

Si tienes datos existentes en SQLite:

```python
import sqlite3
from supabase import create_client, Client

# Conectar a ambas bases
sqlite_conn = sqlite3.connect('db_mangas1.0.db')
sqlite_conn.row_factory = sqlite3.Row
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Traer datos de SQLite
cursor = sqlite_conn.cursor()
cursor.execute("SELECT * FROM productos")
productos = [dict(row) for row in cursor.fetchall()]

# Insertar en Supabase
for producto in productos:
    supabase.table("productos").insert(producto).execute()

print(f"Migrados {len(productos)} productos")
```

---

## Troubleshooting

### "CORS error" en producción
Verificar que `CORS(app)` está habilitado en `app_production.py`

### Imágenes no cargan
- Verificar que Supabase bucket es público
- Verificar que `SUPABASE_KEY` es correcto
- Comprobar que las imágenes están en `imagenes-mangas/public/`

### API no responde
- Verificar `SUPABASE_URL` y `SUPABASE_KEY`
- Chequear logs en Heroku/Railway/Render
- Comprobar que la tabla `productos` existe en Supabase

---

## Checklist de Deployment

- [ ] Crear proyecto Supabase
- [ ] Crear tabla de productos en Supabase
- [ ] Crear bucket de imágenes
- [ ] Configurar Heroku/Railway/Render
- [ ] Agregar variables de entorno
- [ ] Actualizar `config.js`
- [ ] Hacer push a GitHub
- [ ] Verificar deployment
- [ ] Probar endpoints en producción
- [ ] Configurar Netlify para frontend

---

## Endpoints en Producción

```
GET    https://tu-app-heroku.herokuapp.com/health
GET    https://tu-app-heroku.herokuapp.com/api/productos
GET    https://tu-app-heroku.herokuapp.com/api/productos/1
POST   https://tu-app-heroku.herokuapp.com/api/productos
PUT    https://tu-app-heroku.herokuapp.com/api/productos/1
DELETE https://tu-app-heroku.herokuapp.com/api/productos/1
```

---

## Costos Estimados

| Servicio | Plan Gratuito | Costo |
|----------|---------------|-------|
| Supabase | 500MB DB, 1GB Storage | $25/mes (Pro) |
| Heroku | - | $7/mes (Eco) |
| Railway | $5 de crédito/mes | Pago por uso |
| Netlify | Ilimitado | Gratis |
| **Total** | Parcialmente gratis | ~$30/mes |

---

## Referencias

- Supabase Docs: https://supabase.com/docs
- Heroku Docs: https://devcenter.heroku.com
- Flask Production: https://flask.palletsprojects.com/en/2.3.x/deploying/
- CORS en Flask: https://flask-cors.readthedocs.io/
