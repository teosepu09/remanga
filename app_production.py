"""ReManga API de producción: Supabase en nube y SQLite como fallback local."""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "imagenes-mangas")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

if USE_SUPABASE:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    import sqlite3
    DATABASE = os.path.join(os.path.dirname(__file__), "db_mangas1.0.db")
    CARPETA_IMAGENES = os.path.join(os.path.dirname(__file__), "imagenes")
    os.makedirs(CARPETA_IMAGENES, exist_ok=True)

EXTENSIONES_PERMITIDAS = {"png", "jpg", "jpeg", "webp", "gif"}


def archivo_es_imagen(nombre):
    if not nombre or "." not in nombre:
        return False
    return nombre.rsplit(".", 1)[1].lower() in EXTENSIONES_PERMITIDAS


def url_imagen_supabase(nombre):
    if not nombre or not SUPABASE_URL:
        return ""
    if nombre.startswith(("http://", "https://")):
        return nombre
    ruta = nombre.lstrip("/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{ruta}"


def normalizar_producto(producto):
    resultado = dict(producto)
    if USE_SUPABASE:
        resultado["imagen"] = url_imagen_supabase(resultado.get("imagen", ""))
    return resultado


def conectar_sqlite_db():
    conexion = sqlite3.connect(DATABASE)
    conexion.row_factory = sqlite3.Row
    return conexion


def guardar_imagen_supabase(archivo):
    if not archivo or not archivo.filename:
        return None
    nombre = secure_filename(archivo.filename)
    if not nombre or not archivo_es_imagen(nombre):
        return None
    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            nombre,
            archivo.read(),
            {"content-type": archivo.content_type or "application/octet-stream", "upsert": "true"}
        )
        return nombre
    except Exception as error:
        print(f"Error al subir imagen a Supabase Storage: {error}")
        return None


def guardar_imagen_local(archivo):
    if not archivo or not archivo.filename:
        return None
    nombre = secure_filename(archivo.filename)
    if not nombre or not archivo_es_imagen(nombre):
        return None
    archivo.save(os.path.join(CARPETA_IMAGENES, nombre))
    return nombre


def guardar_imagen(archivo):
    return guardar_imagen_supabase(archivo) if USE_SUPABASE else guardar_imagen_local(archivo)


@app.route("/api/productos", methods=["GET"])
def mostrar_productos():
    try:
        if USE_SUPABASE:
            datos = supabase.table("productos").select("id,titulo,tomo,precio,estado,descripcion,imagen").order("id", desc=True).execute()
            productos = [normalizar_producto(item) for item in (datos.data or [])]
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("SELECT id,titulo,tomo,precio,estado,descripcion,imagen FROM productos ORDER BY id DESC")
            productos = [dict(row) for row in cursor.fetchall()]
            conexion.close()
        return jsonify(productos), 200
    except Exception as error:
        print(f"Error GET /api/productos: {error}")
        return jsonify({"error": str(error)}), 500


@app.route("/api/productos/<int:id>", methods=["GET"])
def mostrar_producto(id):
    try:
        if USE_SUPABASE:
            datos = supabase.table("productos").select("id,titulo,tomo,precio,estado,descripcion,imagen").eq("id", id).execute()
            producto = datos.data[0] if datos.data else None
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("SELECT id,titulo,tomo,precio,estado,descripcion,imagen FROM productos WHERE id = ?", (id,))
            producto = cursor.fetchone()
            conexion.close()
            producto = dict(producto) if producto else None
        if not producto:
            return jsonify({"error": "Producto no encontrado"}), 404
        return jsonify(normalizar_producto(producto)), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/api/productos", methods=["POST"])
def agregar_producto():
    try:
        titulo = request.form.get("titulo")
        tomo = request.form.get("tomo")
        precio = request.form.get("precio")
        estado = request.form.get("estado")
        descripcion = request.form.get("descripcion", "")
        archivo_imagen = request.files.get("imagen")

        for campo, valor in {"titulo": titulo, "tomo": tomo, "precio": precio, "estado": estado}.items():
            if valor is None or str(valor).strip() == "":
                return jsonify({"error": f"Falta el campo: {campo}"}), 400

        nombre_imagen = guardar_imagen(archivo_imagen) if archivo_imagen and archivo_imagen.filename else ""
        payload = {
            "titulo": titulo.strip(),
            "tomo": int(tomo),
            "precio": float(precio),
            "estado": estado.strip(),
            "descripcion": descripcion.strip(),
            "imagen": nombre_imagen or ""
        }

        if USE_SUPABASE:
            datos = supabase.table("productos").insert(payload).execute()
            nuevo_id = datos.data[0]["id"] if datos.data else None
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("INSERT INTO productos (titulo,tomo,precio,estado,descripcion,imagen) VALUES (?,?,?,?,?,?)", tuple(payload.values()))
            conexion.commit()
            nuevo_id = cursor.lastrowid
            conexion.close()

        return jsonify({"mensaje": "Producto agregado correctamente", "id": nuevo_id, "imagen": url_imagen_supabase(nombre_imagen) if USE_SUPABASE else nombre_imagen}), 201
    except Exception as error:
        print(f"Error POST /api/productos: {error}")
        return jsonify({"error": str(error)}), 500


@app.route("/api/productos/<int:id>", methods=["PUT"])
def modificar_producto(id):
    try:
        datos = request.get_json(silent=True) or {}
        permitidos = {"titulo", "tomo", "precio", "estado", "descripcion", "imagen"}
        actualizacion = {k: v for k, v in datos.items() if k in permitidos}
        if not actualizacion:
            return jsonify({"error": "No se recibieron datos válidos"}), 400

        if USE_SUPABASE:
            resultado = supabase.table("productos").update(actualizacion).eq("id", id).execute()
            if not resultado.data:
                return jsonify({"error": "Producto no encontrado"}), 404
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            campos = ", ".join(f"{k} = ?" for k in actualizacion)
            cursor.execute(f"UPDATE productos SET {campos} WHERE id = ?", list(actualizacion.values()) + [id])
            conexion.commit()
            filas = cursor.rowcount
            conexion.close()
            if filas == 0:
                return jsonify({"error": "Producto no encontrado"}), 404

        return jsonify({"mensaje": "Producto modificado correctamente"}), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/api/productos/<int:id>", methods=["DELETE"])
def eliminar_producto(id):
    try:
        if USE_SUPABASE:
            resultado = supabase.table("productos").delete().eq("id", id).execute()
            if not resultado.data:
                return jsonify({"error": "Producto no encontrado"}), 404
        else:
            conexion = conectar_sqlite_db()
            cursor = conexion.cursor()
            cursor.execute("DELETE FROM productos WHERE id = ?", (id,))
            conexion.commit()
            filas = cursor.rowcount
            conexion.close()
            if filas == 0:
                return jsonify({"error": "Producto no encontrado"}), 404
        return jsonify({"mensaje": "Producto eliminado correctamente"}), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/imagenes/<path:nombre_imagen>", methods=["GET"])
def mostrar_imagen(nombre_imagen):
    if USE_SUPABASE:
        return jsonify({"error": "En producción las imágenes se sirven desde Supabase Storage"}), 400
    return send_from_directory(CARPETA_IMAGENES, nombre_imagen)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "environment": ENVIRONMENT, "database": "supabase" if USE_SUPABASE else "sqlite", "storage": "supabase" if USE_SUPABASE else "local"}), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint no encontrado"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5000)))
    app.run(host="0.0.0.0", port=port, debug=ENVIRONMENT == "development")
