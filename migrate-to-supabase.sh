#!/bin/bash
# Script para migrar datos de SQLite a Supabase

echo "🔄 Migrando datos de SQLite a Supabase..."

# Verificar que existan las variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: Variables SUPABASE_URL o SUPABASE_KEY no configuradas"
    exit 1
fi

# Ejecutar el script Python
python3 << 'EOF'
import sqlite3
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

try:
    # Conectar a Supabase
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Conectar a SQLite local
    sqlite_conn = sqlite3.connect('db_mangas1.0.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    # Obtener productos
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM productos")
    productos = [dict(row) for row in cursor.fetchall()]
    
    if not productos:
        print("⚠️  No hay productos para migrar")
        sqlite_conn.close()
        exit(0)
    
    # Insertar en Supabase
    migrados = 0
    errores = 0
    
    for producto in productos:
        try:
            supabase.table("productos").insert(producto).execute()
            print(f"✓ Migrado: {producto['titulo']}")
            migrados += 1
        except Exception as e:
            print(f"✗ Error en {producto['titulo']}: {str(e)}")
            errores += 1
    
    sqlite_conn.close()
    
    print(f"\n📊 Resumen:")
    print(f"  ✓ Migrados: {migrados}")
    print(f"  ✗ Errores: {errores}")
    print(f"  Total: {len(productos)}")
    
except Exception as e:
    print(f"❌ Error fatal: {str(e)}")
    exit(1)

EOF

echo "✅ Migración completada"
