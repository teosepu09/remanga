from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sqlite3
import os

# =========================================================
# CONFIGURACIÓN
# =========================================================

app = Flask(__name__)

CORS(app)

DATABASE = os.path.join(
    os.path.dirname(__file__),
    "db_mangas1.0.db"
)

CARPETA_IMAGENES = os.path.join(
    os.path.dirname(__file__),
    "imagenes"
)

os.makedirs(CARPETA_IMAGENES, exist_ok=True)

EXTENSIONES_PERMITIDAS = {
    "png", "jpg", "jpeg", "webp", "gif"
}


def archivo_es_imagen(nombre):

    if not nombre or "." not in nombre:
        return False

    extension = nombre.rsplit(".", 1)[1].lower()

    return extension in EXTENSIONES_PERMITIDAS


# =========================================================
# CONEXIÓN A LA BASE DE DATOS
# =========================================================

def conectar_db():

    conexion = sqlite3.connect(DATABASE)
    conexion.row_factory = sqlite3.Row

    return conexion


# =========================================================
# SERVIR IMÁGENES
# GET /imagenes/nombre.jpg
# =========================================================

@app.route("/imagenes/<path:nombre_imagen>", methods=["GET"])
def mostrar_imagen(nombre_imagen):

    return send_from_directory(
        CARPETA_IMAGENES,
        nombre_imagen
    )


# =========================================================
# MOSTRAR TODOS LOS PRODUCTOS
# GET /api/productos
# =========================================================

@app.route("/api/productos", methods=["GET"])
def mostrar_productos():

    conexion = conectar_db()
    cursor = conexion.cursor()

    cursor.execute("""
        SELECT
            id,
            titulo,
            tomo,
            precio,
            estado,
            descripcion,
            imagen
        FROM productos
        ORDER BY id DESC
    """)

    productos = cursor.fetchall()
    conexion.close()

    resultado = []

    for producto in productos:

        resultado.append({
            "id": producto["id"],
            "titulo": producto["titulo"],
            "tomo": producto["tomo"],
            "precio": producto["precio"],
            "estado": producto["estado"],
            "descripcion": producto["descripcion"],
            "imagen": producto["imagen"]
        })

    return jsonify(resultado)


# =========================================================
# MOSTRAR UN PRODUCTO
# GET /api/productos/1
# =========================================================

@app.route("/api/productos/<int:id>", methods=["GET"])
def mostrar_producto(id):

    conexion = conectar_db()
    cursor = conexion.cursor()

    cursor.execute("""
        SELECT
            id,
            titulo,
            tomo,
            precio,
            estado,
            descripcion,
            imagen
        FROM productos
        WHERE id = ?
    """, (id,))

    producto = cursor.fetchone()
    conexion.close()

    if producto is None:

        return jsonify({
            "error": "Producto no encontrado"
        }), 404

    return jsonify({
        "id": producto["id"],
        "titulo": producto["titulo"],
        "tomo": producto["tomo"],
        "precio": producto["precio"],
        "estado": producto["estado"],
        "descripcion": producto["descripcion"],
        "imagen": producto["imagen"]
    })


# =========================================================
# AGREGAR PRODUCTO
# POST /api/productos
# =========================================================

@app.route("/api/productos", methods=["POST"])
def agregar_producto():

    if request.is_json:

        datos = request.get_json() or {}

        titulo = datos.get("titulo")
        tomo = datos.get("tomo")
        precio = datos.get("precio")
        estado = datos.get("estado")
        descripcion = datos.get("descripcion", "")

        archivo_imagen = None

    else:

        titulo = request.form.get("titulo")
        tomo = request.form.get("tomo")
        precio = request.form.get("precio")
        estado = request.form.get("estado")
        descripcion = request.form.get("descripcion", "")

        archivo_imagen = request.files.get("imagen")

    # Campos obligatorios
    campos_obligatorios = {
        "titulo": titulo,
        "tomo": tomo,
        "precio": precio,
        "estado": estado
    }

    for campo, valor in campos_obligatorios.items():

        if valor is None or str(valor).strip() == "":

            return jsonify({
                "error": f"Falta el campo: {campo}"
            }), 400

    # Imagen opcional
    nombre_imagen = ""

    if archivo_imagen and archivo_imagen.filename:

        nombre_original = secure_filename(
            archivo_imagen.filename
        )

        if not nombre_original:

            return jsonify({
                "error": "El nombre de la imagen no es válido."
            }), 400

        if not archivo_es_imagen(nombre_original):

            return jsonify({
                "error": "El archivo debe ser una imagen PNG, JPG, JPEG, WEBP o GIF."
            }), 400

        nombre_imagen = nombre_original

        ruta_imagen = os.path.join(
            CARPETA_IMAGENES,
            nombre_imagen
        )

        archivo_imagen.save(ruta_imagen)

    # Guardar en SQLite
    conexion = conectar_db()
    cursor = conexion.cursor()

    cursor.execute("""
        INSERT INTO productos
        (
            titulo,
            tomo,
            precio,
            estado,
            descripcion,
            imagen
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        titulo,
        tomo,
        precio,
        estado,
        descripcion,
        nombre_imagen
    ))

    conexion.commit()

    nuevo_id = cursor.lastrowid

    conexion.close()

    return jsonify({
        "mensaje": "Producto agregado correctamente",
        "id": nuevo_id,
        "imagen": nombre_imagen
    }), 201


# =========================================================
# MODIFICAR PRODUCTO
# PUT /api/productos/1
# =========================================================

@app.route("/api/productos/<int:id>", methods=["PUT"])
def modificar_producto(id):

    datos = request.get_json()

    if not datos:

        return jsonify({
            "error": "No se recibieron datos"
        }), 400

    conexion = conectar_db()
    cursor = conexion.cursor()

    cursor.execute("""
        UPDATE productos
        SET
            titulo = ?,
            tomo = ?,
            precio = ?,
            estado = ?,
            descripcion = ?,
            imagen = ?
        WHERE id = ?
    """, (
        datos["titulo"],
        datos["tomo"],
        datos["precio"],
        datos["estado"],
        datos.get("descripcion", ""),
        datos.get("imagen", ""),
        id
    ))

    conexion.commit()

    if cursor.rowcount == 0:

        conexion.close()

        return jsonify({
            "error": "Producto no encontrado"
        }), 404

    conexion.close()

    return jsonify({
        "mensaje": "Producto modificado correctamente"
    })


# =========================================================
# ELIMINAR PRODUCTO
# DELETE /api/productos/1
# =========================================================

@app.route("/api/productos/<int:id>", methods=["DELETE"])
def eliminar_producto(id):

    conexion = conectar_db()
    cursor = conexion.cursor()

    cursor.execute("""
        DELETE FROM productos
        WHERE id = ?
    """, (id,))

    conexion.commit()

    if cursor.rowcount == 0:

        conexion.close()

        return jsonify({
            "error": "Producto no encontrado"
        }), 404

    conexion.close()

    return jsonify({
        "mensaje": "Producto eliminado correctamente"
    })


# =========================================================
# INICIAR SERVIDOR
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
