@echo off
REM Script para migrar datos de SQLite a Supabase (Windows)
REM Asegúrate de tener .env configurado antes de ejecutar

echo.
echo [=======================================================]
echo  Migrando datos de SQLite a Supabase
echo [=======================================================]
echo.

REM Verificar que Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en PATH
    pause
    exit /b 1
)

REM Crear y ejecutar script Python
python << 'EOF'
import sqlite3
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

print("\n📋 Verificando configuración...")

# Verificar variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Error: SUPABASE_URL o SUPABASE_KEY no configuradas")
    print("   Verifica el archivo .env")
    exit(1)

print("✓ Supabase URL: " + supabase_url[:30] + "...")
print("✓ Supabase KEY: " + supabase_key[:20] + "...")

try:
    print("\n🔗 Conectando a Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    print("✓ Conexión exitosa")
    
    print("\n📂 Leyendo datos de SQLite...")
    sqlite_conn = sqlite3.connect('db_mangas1.0.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM productos")
    productos = [dict(row) for row in cursor.fetchall()]
    
    print(f"✓ Encontrados {len(productos)} productos")
    
    if not productos:
        print("⚠️  No hay productos para migrar")
        sqlite_conn.close()
        exit(0)
    
    print("\n⬆️  Subiendo a Supabase...")
    migrados = 0
    errores = 0
    
    for i, producto in enumerate(productos, 1):
        try:
            supabase.table("productos").insert(producto).execute()
            print(f"  [{i}/{len(productos)}] ✓ {producto['titulo']}")
            migrados += 1
        except Exception as e:
            print(f"  [{i}/{len(productos)}] ✗ {producto['titulo']}: {str(e)}")
            errores += 1
    
    sqlite_conn.close()
    
    print("\n" + "="*50)
    print("📊 RESUMEN DE MIGRACIÓN:")
    print("="*50)
    print(f"  ✓ Migrados exitosamente: {migrados}")
    print(f"  ✗ Errores: {errores}")
    print(f"  Total procesados: {len(productos)}")
    print("="*50)
    
    if errores == 0:
        print("\n✅ Migración completada sin errores")
    else:
        print(f"\n⚠️  Migración completada con {errores} error(es)")
    
except Exception as e:
    print(f"\n❌ Error fatal: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)

EOF

pause
