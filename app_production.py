"""
ReManga API - Versión Production Ready
Compatible con Heroku, Render, Railway y otros servicios en la nube
Para usar con Supabase como base de datos
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import base64
from io import BytesIO

# Cargar variables de entorno
load_dotenv()

# =========================================================
# CONFIGURACIÓN
# =========================================================

app = Flask(__name__)
CORS(app)

# Variables de entorno
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "imagenes-mangas")

# Configuración local (fallback para desarrollo)
USE_SUPABASE = SUPABASE_URL and SUPABASE_KEY

if USE_SUPABASE:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    # Fallback local SQLite
    import sqlite3
    DATABASE = os.path.join(
        os.path.dirname(__file__),
        "db_mangas1.0.db"
    )
    CARPETA_IMAGENES = os.path.join(
        os.path.dirname(__file__),
        "imagenes"
    )
    os.makedirs(CARPETA_IMAGENES, exist_ok=True)

EXTENSIONES_PERMITIDAS = {"png", "jpg", "jpeg", "webp", "gif"}


# =========================================================
# UTILIDADES
# =========================================================

def archivo_es_imagen(nombre):
    """Valida que el archivo sea una imagen permitida"""
    if not nombre or "." not in nombre:
        return False
    extension = nombre.rsplit(".", 1)[1].lower()
    return extension in EXTENSIONES_PERMITIDAS


# =========================================================
# BASE DE DATOS - SUPABASE
# =========================================================

def conectar_supabase_db():
    """Conecta a Supabase (versión en la nube)"""
    return supabase


def conectar_sqlite_db():
    """Conecta a SQLite (versión local)"""
    conexion = sqlite3.connect(DATABASE)
    conexion.row_factory = sqlite3.Row
    return conexion


def obtener_db():
    """Retorna la conexión apropiada según configuración"""
    return conectar_supabase_db() if USE_SUPABASE else conectar_sqlite_db()


# =========================================================
# MANEJO DE IMÁGENES - SUPABASE STORAGE
# =========================================================

def guardar_imagen_supabase(archivo):
    """
    Guarda imagen en Supabase Storage
    Retorna el nombre del archivo guardado
    """
    if not archivo or not archivo.filename:
        return None
    
    if not archivo_es_imagen(archivo.filename):
        return None
    
    nombre_original = secure_filename(archivo.filename)
    
    # Leer contenido del archivo
    contenido = archivo.read()
    
    try:
        # Subir a Supabase Storage
        ruta = f"public/{nombre_original}"
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            ruta,
            contenido,
            {"content-type": archivo.content_type}
        )
        return nombre_original
    except Exception as e:
        print(f"Error al guardar imagen en Supabase: {e}")
        return None


def guardar_imagen_local(archivo):
    """Guarda imagen localmente (desarrollo)"""
    if not archivo or not archivo.filename:
        return None
    
    if not archivo_es_imagen(archivo.filename):
        return None
    
    nombre_original = secure_filename(archivo.filename)
    ruta_imagen = os.path.join(CARPETA_IMAGENES, nombre_original)
    archivo.save(ruta_imagen)
    return nombre_original


def guardar_imagen(archivo):
    """Guarda imagen usando el método configurado"""
    if USE_SUPABASE:
        return guardar_imagen_supabase(archivo)
    else:
        return guardar_imagen_local(archivo)


# =========================================================
# API ENDPOINTS - PRODUCTOS
# =========================================================

@app.route("/api/productos", methods=["GET"])
def mostrar_productos():
    """Obtiene todos los productos"""
    try:
        if USE_SUPABASE:
            datos = supabase.table("productos").select("*").order("id", desc=True).execute()
            productos = datos.data
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("""
                SELECT id, titulo, tomo, precio, estado, descripcion, imagen
                FROM productos ORDER BY id DESC
            """)
            productos = [dict(row) for row in cursor.fetchall()]
            conexion.close()
        
        return jsonify(productos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/productos/<int:id>", methods=["GET"])
def mostrar_producto(id):
    """Obtiene un producto específico"""
    try:
        if USE_SUPABASE:
            datos = supabase.table("productos").select("*").eq("id", id).execute()
            producto = datos.data[0] if datos.data else None
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("""
                SELECT id, titulo, tomo, precio, estado, descripcion, imagen
                FROM productos WHERE id = ?
            """, (id,))
            producto = cursor.fetchone()
            conexion.close()
            producto = dict(producto) if producto else None
        
        if not producto:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        return jsonify(producto), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/productos", methods=["POST"])
def agregar_producto():
    """Crea un nuevo producto"""
    try:
        # Recopilar datos
        titulo = request.form.get("titulo")
        tomo = request.form.get("tomo")
        precio = request.form.get("precio")
        estado = request.form.get("estado")
        descripcion = request.form.get("descripcion", "")
        archivo_imagen = request.files.get("imagen")

        # Validar campos obligatorios
        campos_obligatorios = {
            "titulo": titulo,
            "tomo": tomo,
            "precio": precio,
            "estado": estado
        }

        for campo, valor in campos_obligatorios.items():
            if valor is None or str(valor).strip() == "":
                return jsonify({"error": f"Falta el campo: {campo}"}), 400

        # Guardar imagen si se proporciona
        nombre_imagen = ""
        if archivo_imagen:
            nombre_imagen = guardar_imagen(archivo_imagen) or ""

        # Guardar en base de datos
        if USE_SUPABASE:
            datos = supabase.table("productos").insert({
                "titulo": titulo,
                "tomo": tomo,
                "precio": float(precio),
                "estado": estado,
                "descripcion": descripcion,
                "imagen": nombre_imagen
            }).execute()
            nuevo_id = datos.data[0]["id"] if datos.data else None
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("""
                INSERT INTO productos (titulo, tomo, precio, estado, descripcion, imagen)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (titulo, tomo, precio, estado, descripcion, nombre_imagen))
            conexion.commit()
            nuevo_id = cursor.lastrowid
            conexion.close()

        return jsonify({
            "mensaje": "Producto agregado correctamente",
            "id": nuevo_id,
            "imagen": nombre_imagen
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/productos/<int:id>", methods=["PUT"])
def modificar_producto(id):
    """Actualiza un producto existente"""
    try:
        datos = request.get_json()

        if not datos:
            return jsonify({"error": "No se recibieron datos"}), 400

        if USE_SUPABASE:
            supabase.table("productos").update(datos).eq("id", id).execute()
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            campos = ", ".join([f"{k} = ?" for k in datos.keys()])
            valores = list(datos.values()) + [id]
            cursor.execute(f"UPDATE productos SET {campos} WHERE id = ?", valores)
            conexion.commit()
            conexion.close()

        return jsonify({"mensaje": "Producto actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/productos/<int:id>", methods=["DELETE"])
def eliminar_producto(id):
    """Elimina un producto"""
    try:
        if USE_SUPABASE:
            supabase.table("productos").delete().eq("id", id).execute()
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("DELETE FROM productos WHERE id = ?", (id,))
            conexion.commit()
            conexion.close()

        return jsonify({"mensaje": "Producto eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# SERVIR IMÁGENES (solo para desarrollo local)
# =========================================================

@app.route("/imagenes/<path:nombre_imagen>", methods=["GET"])
def mostrar_imagen(nombre_imagen):
    """Sirve imágenes locales (solo desarrollo)"""
    if USE_SUPABASE:
        return jsonify({"error": "Usa Supabase Storage en producción"}), 400
    
    return send_from_directory(CARPETA_IMAGENES, nombre_imagen)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():
    """Endpoint para verificar que el servidor está activo"""
    return jsonify({
        "status": "ok",
        "environment": ENVIRONMENT,
        "database": "supabase" if USE_SUPABASE else "sqlite"
    }), 200


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint no encontrado"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Error interno del servidor"}), 500


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":
    # En desarrollo: True, En producción (Heroku, etc): False
    debug = ENVIRONMENT == "development"
    port = int(os.getenv("FLASK_PORT", 5000))
    
    app.run(
        host="0.0.0.0",  # Importante para plataformas en la nube
        port=port,
        debug=debug
    )
