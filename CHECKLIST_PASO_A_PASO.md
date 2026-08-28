# ✅ CHECKLIST COMPLETO - De Local a Producción

## FASE 1: PREPARACIÓN LOCAL (30 minutos)

### 1.1 Instalar dependencias
```bash
# [ ] Ejecutar esto en terminal
pip install -r requirements.txt
```

### 1.2 Crear archivo .env
```bash
# [ ] Crear archivo .env en la raíz del proyecto
# [ ] Copiar contenido de .env.example
# [ ] DEJAR como desarrollo por ahora

ENVIRONMENT=development
FLASK_PORT=5000
FLASK_ENV=development
```

### 1.3 Probar en local
```bash
# [ ] Ejecutar servidor
python app_production.py

# [ ] En otra terminal, probar
curl http://localhost:5000/health

# [ ] Debería responder:
# {"status":"ok","environment":"development","database":"sqlite"}
```

### 1.4 Verificar frontend en local
```bash
# [ ] Abrir en navegador: http://localhost:5000
# [ ] ¿Se carga el index.html?
# [ ] ¿Hay productos?
# [ ] Abrir console (F12) ¿Errores?
```

---

## FASE 2: CONFIGURAR SUPABASE (20 minutos)

### 2.1 Crear cuenta
- [ ] Ir a https://supabase.com
- [ ] Hacer click en "Start your project"
- [ ] Usar email o GitHub
- [ ] Llenar datos

### 2.2 Crear proyecto
- [ ] Click en "New project"
- [ ] Nombre: `remanga` (o lo que prefieras)
- [ ] Password fuerte
- [ ] Región: Elegir la más cercana
- [ ] Click "Create new project"
- [ ] **ESPERAR** (tarda 1-2 minutos)

### 2.3 Copiar credenciales
- [ ] Ir a "Settings" → "API"
- [ ] Copiar: **Project URL**
  ```
  https://xxxxxxxxxxxx.supabase.co
  ```
- [ ] Copiar: **anon public key**
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- [ ] **GUARDAR EN LUGAR SEGURO** (no compartir)

### 2.4 Crear tabla de productos
- [ ] En Supabase, ir a "SQL Editor"
- [ ] Click en "New query"
- [ ] Copiar y pegar esto:

```sql
-- Crear tabla
CREATE TABLE IF NOT EXISTS productos (
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

-- Crear índices
CREATE INDEX idx_productos_titulo ON productos(titulo);
CREATE INDEX idx_productos_estado ON productos(estado);

-- Mensaje confirmación
SELECT 'Tabla creada exitosamente' AS mensaje;
```

- [ ] Click "Run"
- [ ] Verificar que no hay errores

### 2.5 Crear bucket de imágenes
- [ ] En Supabase, ir a "Storage"
- [ ] Click en "Create a new bucket"
- [ ] Nombre: `imagenes-mangas`
- [ ] **IMPORTANTE**: Activar "Public bucket"
- [ ] Click "Create bucket"

### 2.6 Verificar tabla
- [ ] Ir a "Table Editor"
- [ ] Verificar que existe la tabla `productos`
- [ ] Debe estar vacía al principio

---

## FASE 3: ACTUALIZAR ARCHIVOS LOCALES (15 minutos)

### 3.1 Actualizar .env
```bash
# [ ] Editar archivo .env
# [ ] Reemplazar con:

ENVIRONMENT=development
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key_muy_larga
SUPABASE_BUCKET=imagenes-mangas
FLASK_PORT=5000
FLASK_ENV=development
```

**Reemplazar:**
- `tu-proyecto` por tu ID de Supabase
- `tu_anon_key_muy_larga` por tu API Key

### 3.2 Actualizar HTML files
Para **cada HTML** (index.html, catalogo.html, etc.):

```html
<!-- Agregar en el <head>, DESPUÉS de <meta> y ANTES de otros scripts -->
<script>
    window.REMANGA_API_URL = 'http://127.0.0.1:5000'; // Desarrollo
</script>
```

- [ ] index.html ✓
- [ ] catalogo.html ✓
- [ ] producto.html ✓
- [ ] carrito.html ✓
- [ ] vender.html ✓
- [ ] login.html ✓

### 3.3 Verificar script.js
```javascript
// En static/script.js, verificar que está:

const API_URL = (() => {
    if (typeof REMANGA_API_URL !== 'undefined') {
        return REMANGA_API_URL;
    }
    // ... resto del código
})();
```

- [ ] ✓ script.js ya está actualizado

---

## FASE 4: PROBAR CON SUPABASE LOCALMENTE (10 minutos)

### 4.1 Detener servidor anterior
```bash
# [ ] En terminal, presionar Ctrl+C para detener

# [ ] Reiniciar servidor:
python app_production.py
```

### 4.2 Probar endpoints
```bash
# [ ] En otra terminal, verificar health:
curl http://localhost:5000/health

# [ ] Debería responder:
# {"status":"ok","environment":"development","database":"supabase"}

# [ ] Probar obtener productos (debe estar vacío):
curl http://localhost:5000/api/productos
# Debería responder: []
```

### 4.3 Probar agregar producto
```bash
# [ ] Abrir en navegador: http://localhost:5000
# [ ] Ir a "Vender"
# [ ] Agregar un producto con imagen
# [ ] Verificar en Supabase:
#     - SQL Editor → SELECT * FROM productos;
#     - Debería aparecer el producto
#     - Verificar Storage → imagenes-mangas → archivo
```

- [ ] ✓ Producto agregado exitosamente
- [ ] ✓ Imagen subida a Supabase Storage
- [ ] ✓ Imagen se muestra en el catálogo

---

## FASE 5: MIGRAR DATOS (Si tienes datos viejos)

### 5.1 Preparar migración
```bash
# [ ] Verificar que tienes db_mangas1.0.db con datos
# [ ] Verificar que .env tiene SUPABASE_URL y SUPABASE_KEY

# [ ] Ejecutar migración:
# Windows:
migrate-to-supabase.bat

# Linux/Mac:
bash migrate-to-supabase.sh
```

### 5.2 Verificar migración
- [ ] En Supabase → Table Editor
- [ ] Verificar que hay productos
- [ ] Verificar Storage → imagenes-mangas
- [ ] ¿Todas las imágenes se migraron?

---

## FASE 6: PREPARAR PARA PRODUCCIÓN (10 minutos)

### 6.1 Crear cuenta en Railway/Heroku/Render
**Elegir UNO:**

#### Si eliges Railway:
- [ ] Ir a https://railway.app
- [ ] Click "Start New Project"
- [ ] "Deploy from GitHub"
- [ ] Conectar cuenta GitHub
- [ ] Autorizar Railway
- [ ] Seleccionar repositorio `mangas/repo`

#### Si eliges Heroku:
- [ ] Ir a https://heroku.com
- [ ] Crear cuenta
- [ ] Instalar Heroku CLI
- [ ] `heroku login`
- [ ] `heroku create remanga-app`

#### Si eliges Render:
- [ ] Ir a https://render.com
- [ ] Crear cuenta
- [ ] Conectar GitHub
- [ ] Seleccionar repositorio

### 6.2 Agregar variables de entorno

**En Railway:**
- [ ] Click en tu proyecto
- [ ] Variables
- [ ] Agregar:
  ```
  ENVIRONMENT=production
  SUPABASE_URL=https://...
  SUPABASE_KEY=eyJ...
  SUPABASE_BUCKET=imagenes-mangas
  ```

**En Heroku:**
```bash
heroku config:set ENVIRONMENT=production
heroku config:set SUPABASE_URL=https://...
heroku config:set SUPABASE_KEY=eyJ...
heroku config:set SUPABASE_BUCKET=imagenes-mangas
```

**En Render:**
- [ ] Environment
- [ ] Agregar cada variable

### 6.3 Hacer push a GitHub
```bash
# [ ] En tu terminal local

# Si no has hecho git init:
git init
git add .
git commit -m "Preparar para producción con Supabase"

# Si ya es un repo:
git add .
git commit -m "Preparar para producción"
git push origin main
```

- [ ] ✓ Cambios enviados a GitHub

---

## FASE 7: DESPLEGAR BACKEND (15 minutos)

### 7.1 Railway automático
- [ ] Railway automáticamente:
  - Detecta cambios en GitHub
  - Construye la app
  - Deploya
- [ ] Esperar log: "Build successful"
- [ ] Copiar URL:
  ```
  https://remanga-production.up.railway.app
  ```

### 7.2 Heroku (si elegiste esta)
```bash
# [ ] En terminal:
git push heroku main

# [ ] Esperar a que termine
# [ ] Copiar URL: https://remanga-app.herokuapp.com
```

### 7.3 Verificar que funciona
```bash
# [ ] Probar health check:
curl https://remanga-production.up.railway.app/health

# [ ] Debería responder con estado ok
```

- [ ] ✓ Backend en producción funcionando

---

## FASE 8: DESPLEGAR FRONTEND (15 minutos)

### 8.1 Conectar Netlify
- [ ] Ir a https://netlify.com
- [ ] Click "New site from Git"
- [ ] "Connect to GitHub"
- [ ] Seleccionar repositorio `mangas/repo`
- [ ] Configuración:
  - Build command: (dejar vacío)
  - Publish directory: `.`
- [ ] Click "Deploy site"
- [ ] Esperar a que termine el deploy

### 8.2 Agregar variable de entorno
- [ ] Site settings → Build & deploy → Environment
- [ ] Edit variables
- [ ] Agregar:
  ```
  REACT_APP_API_URL=https://remanga-production.up.railway.app
  ```
  (Reemplazar con tu URL de Railway/Heroku)

### 8.3 Agregar script en HTML
En **index.html** (y todos los HTML), en el `<head>`:

```html
<script>
    window.REMANGA_API_URL = 'https://remanga-production.up.railway.app';
</script>
```

- [ ] Cambiar a tu URL de producción
- [ ] Guardar
- [ ] Git push

### 8.4 Verificar deploy
- [ ] Netlify automáticamente redeploya
- [ ] URL: https://remanga-XXXX.netlify.app
- [ ] Abrir en navegador
- [ ] ¿Se carga?
- [ ] ¿Hay productos?
- [ ] F12 → Console ¿Errores?

- [ ] ✓ Frontend en producción funcionando

---

## FASE 9: VERIFICACIÓN FINAL (10 minutos)

### 9.1 Test de navegación
- [ ] [ ] Ir a https://remanga-XXXX.netlify.app
- [ ] [ ] Página carga sin errores
- [ ] [ ] Menú funciona
- [ ] [ ] Logo es clicable

### 9.2 Test de catálogo
- [ ] [ ] Click en "Catálogo"
- [ ] [ ] Se cargan los productos
- [ ] [ ] Las imágenes se ven
- [ ] [ ] Se pueden filtrar

### 9.3 Test de vender
- [ ] [ ] Click en "Vender"
- [ ] [ ] Llenar formulario
- [ ] [ ] Subir imagen
- [ ] [ ] Click "Agregar producto"
- [ ] [ ] Mensaje de éxito
- [ ] [ ] El producto aparece en catálogo

### 9.4 Test de carrito
- [ ] [ ] Agregar producto al carrito
- [ ] [ ] Carrito muestra número
- [ ] [ ] Click en carrito
- [ ] [ ] Ver productos

### 9.5 Test de error
- [ ] [ ] Abrir F12 (Developer Tools)
- [ ] [ ] Pestaña Console
- [ ] [ ] ¿Hay errores rojos?
- [ ] [ ] Si hay errores, revisar:
  - URL del API es correcta
  - Supabase está activo
  - Variables de entorno están bien

---

## FASE 10: CAMBIOS DE CONFIGURACIÓN PARA PRODUCCIÓN

### 10.1 Archivo app_production.py
- [ ] ✓ Ya está configurado automáticamente

### 10.2 Archivo .env (IMPORTANTE)
```bash
# [ ] Crear .env.production (nunca compartir):

ENVIRONMENT=production
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-key-super-secreto
SUPABASE_BUCKET=imagenes-mangas
FLASK_PORT=8000
```

### 10.3 .gitignore (VERIFICAR)
- [ ] Verificar que .gitignore contiene:
  ```
  .env
  .env.local
  *.env
  db_*.db
  ```
- [ ] Así no subes credenciales a GitHub

---

## ✨ RESUMEN - LO QUE AHORA TIENES

```
✅ Backend en producción
   - URL: https://tu-app.herokuapp.com
   - Base de datos: Supabase
   - Imágenes: Supabase Storage

✅ Frontend en producción
   - URL: https://tu-sitio.netlify.app
   - Auto-deploy desde GitHub
   - URLs dinámicas para API

✅ Configuración automática
   - Desarrollo: localhost:5000
   - Producción: tu-app.herokuapp.com

✅ Migración de datos
   - SQLite → Supabase
   - Imágenes incluidas
```

---

## 🎉 ¡FELICIDADES!

Tu aplicación ReManga ahora está:
- ✅ En la nube
- ✅ Accesible desde cualquier lugar
- ✅ Con base de datos profesional
- ✅ Con almacenamiento de imágenes
- ✅ Con deploy automático

**Tu URL pública:**
```
https://tu-sitio.netlify.app
```

---

## 📞 PRÓXIMOS PASOS (Opcionales)

1. **Agregar dominio personalizado**
   - Comprar dominio en Godaddy, Namecheap, etc.
   - Configurar en Netlify
   - Gratis o ~$12/año

2. **SSL/HTTPS**
   - Ya incluido con Netlify
   - Automático y gratuito

3. **Email de confirmación**
   - Integrar SendGrid
   - Enviar confirmación cuando venden

4. **Sistema de pagos**
   - Integrar Stripe o MercadoPago
   - Cobrar por productos

5. **Analytics**
   - Plausible o Google Analytics
   - Ver estadísticas de visitantes

---

## 🆘 TROUBLESHOOTING

### "CORS error" en navegador
```
Causa: API sin CORS
Solución: Verificar app_production.py tiene CORS(app)
```

### "Products no cargan" / "[]"
```
Causa: Supabase vacío o credenciales incorrectas
Solución: 
1. Verificar tabla existe en Supabase
2. Verificar SUPABASE_URL y KEY son correctas
3. Ver logs: railway logs o heroku logs --tail
```

### "Imágenes no se ven"
```
Causa: Storage bucket no es público
Solución:
1. Supabase → Storage → imagenes-mangas
2. Policies → Public
3. Verificar que hay imágenes en el bucket
```

### "Error de variable no definida"
```
Causa: .env no cargado
Solución:
1. Verificar ENVIRONMENT está en variables
2. Reiniciar servidor
3. Ver logs para errores
```

---

## 📚 DOCUMENTOS IMPORTANTES EN TU REPO

- `DEPLOYMENT.md` - Guía detallada de deployment
- `GUIA_PRODUCCION.md` - Paso a paso en español
- `OPCIONES_DEPLOYMENT.md` - Comparativa de opciones
- `RESUMEN_PRODUCCION.md` - Resumen ejecutivo
- `.env.example` - Plantilla de variables
- `app_production.py` - Backend para producción
- `Procfile` - Para Heroku
- `netlify.toml` - Config de Netlify

**¡Mantén estos documentos como referencia!**

---

**¡Éxito en tu deployment! 🚀**

Si algo no funciona, revisa los logs del servicio (Railway/Heroku) y la consola del navegador (F12).
