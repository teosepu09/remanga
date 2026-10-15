/* =========================================================
   ReManga - script.js
   El sitio es estático y habla directamente con Supabase.
   ========================================================= */

const CART_KEY = "remangaCart";

/* ========================= INICIO ========================= */
// Espera a que el HTML esté listo y luego inicia solo los módulos presentes en la página actual.


// DOMContentLoaded se dispara cuando el navegador ya interpretó el HTML. Por eso los selectores
// de abajo pueden encontrar los controles de la página.
// Se llaman todos los inicializadores en todas las páginas, pero cada uno se protege comprobando
// si existe su elemento raíz: iniciarCarrito, por ejemplo, no hace nada si no hay carrito.html.
document.addEventListener("DOMContentLoaded", () => {
    iniciarHeader();
    iniciarBuscador();
    iniciarNewsletter();
    iniciarAnimaciones();
    iniciarCatalogo();
    iniciarProducto();
    iniciarCarrito();
    iniciarVender();
    actualizarContadorCarrito();
    iniciarHome();
});

/* ========================= GENERALES ========================= */
// Funciones auxiliares reutilizadas en varias vistas: formato, imágenes, parámetros y mensajes.


/**
 * Convierte el estado recibido a una representación consistente para poder compararlo sin diferencias por mayúsculas o espacios.
 * - estado: valor de estado recibido desde el producto o el formulario.
 * - texto normalizado, por ejemplo "nuevo" o "usado".
 */
function normalizarEstado(estado) {
    return String(estado || "").trim().toLowerCase();
}

/**
 * Convierte un valor numérico en texto con formato de precio argentino.
 * - precio: precio que se quiere mostrar. Puede llegar como número o como texto numérico.
 * - cadena con símbolo $ y separadores locales.
 */
function formatearPrecio(precio) {
    return `$${(Number(precio) || 0).toLocaleString("es-AR")}`;
}

/**
 * Resuelve qué URL debe usar el navegador para mostrar una imagen guardada localmente o en Supabase Storage.
 * - imagen: URL completa, ruta local, nombre de archivo de Storage o valor vacío.
 * - URL o ruta lista para asignar a img.src.
 */
function obtenerRutaImagen(imagen) {
    // El campo de imagen puede guardar tres formatos: vacío, una URL completa, una ruta local
    // del repositorio o el nombre de un objeto dentro de Supabase Storage.
    // imagen puede ser una URL completa, una ruta local o el nombre de un archivo en Storage.
    // Si falta, devolvemos una portada de reserva en lugar de construir una dirección inválida.
    if (!imagen) return "static/isotipo sin fondo.png";

    // Una URL que empieza con http:// o https:// ya contiene el host y la ruta completos.
    // test() verifica el patrón http:// o https:// al comienzo. La i final hace que la coincidencia ignore mayúsculas.
    if (/^https?:\/\//i.test(imagen)) {
        return imagen;
    }

    // Si comienza con img/, static/ o imagenes/, se considera una ruta del propio sitio.
    if (/^(img|static|imagenes)\//i.test(imagen)) {
        return imagen;
    }

    // Si solo quedó el nombre (por ejemplo "naruto1.webp"), construimos la URL pública de Storage.
    // encodeURIComponent evita que espacios y otros caracteres rompan el último segmento de la URL.
    // config contiene la URL del proyecto y el bucket publicados por config.js; se usa para formar la URL pública de la imagen.
    const config = window.REMANGA_SUPABASE_CONFIG;
    if (config?.enabled && config.url && config.bucket) {
        return config.url.replace(/\/$/, "") + "/storage/v1/object/public/" + config.bucket + "/" + encodeURIComponent(imagen);
    }

    return "static/isotipo sin fondo.png";
}

/**
 * Lee un parámetro de la cadena de consulta de la URL actual, por ejemplo ?id=12 o ?search=naruto.
 * - nombre: nombre exacto del parámetro que se desea leer.
 * - valor textual del parámetro o null si no existe.
 */
function obtenerParam(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

/**
 * Crea una notificación temporal en la página y le aplica una clase visual según el tipo.
 * - texto: mensaje que se mostrará al usuario.
 * - tipo: clase de estilo, normalmente success o warning.
 * - No devuelve un valor: modifica el DOM.
 */
function mostrarMensaje(texto, tipo = "success") {
    // Se quita el aviso anterior antes de crear otro, para que no se apilen notificaciones.
    // El ?. permite ejecutar remove() solo si el selector encontró un elemento.
    document.querySelector(".remanga-message")?.remove();

    // Crea un nodo para la notificación porque aparece solo después de una acción y no hace falta dejarlo fijo en el HTML.
    const mensaje = document.createElement("div");
    // La clase remanga-message aplica el estilo común; tipo añade una variante como success o warning.
    mensaje.className = `remanga-message ${tipo}`;
    // textContent inserta el mensaje como texto, sin interpretar etiquetas HTML.
    mensaje.textContent = texto;
    document.body.appendChild(mensaje);

    // Aplicamos "show" en el siguiente ciclo de pintura para que el navegador pueda animar
    // desde el estado inicial hasta el estado visible.
    requestAnimationFrame(() => mensaje.classList.add("show"));
    // El temporizador exterior decide cuándo ocultar el aviso; el interior espera a que termine la transición CSS antes de quitarlo del DOM.
    setTimeout(() => {
        mensaje.classList.remove("show");
        setTimeout(() => mensaje.remove(), 300);
    }, 3000);
}

/**
 * Comprueba de forma básica que una dirección tenga la estructura habitual de un correo.
 * - email: texto ingresado por el usuario.
 * - true si coincide con el patrón; false en caso contrario. No verifica que el buzón exista.
 */
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ========================= HEADER ========================= */
// Comportamiento compartido de la cabecera; algunas páginas pueden no tener todos sus elementos.


/**
 * Activa el cambio visual de la cabecera cuando el usuario se desplaza por la página.
 * - No recibe parámetros.
 * - No devuelve un valor; si la página no tiene #header, termina inmediatamente.
 */
function iniciarHeader() {
    const header = document.getElementById("header");
    if (!header) return;

    const actualizar = () => {
        header.classList.toggle("scrolled", window.scrollY > 50);
    };

    window.addEventListener("scroll", actualizar);
    actualizar();
}

/* ========================= BUSCADOR GLOBAL ========================= */
// Busca desde la cabecera y redirige al catálogo con el texto como parámetro de URL.


/**
 * Conecta los buscadores compartidos para que funcionen con clic o con la tecla Enter.
 * - No recibe parámetros; localiza los buscadores por la clase .search-box.
 * - No devuelve un valor; registra eventos en los controles encontrados.
 */
function iniciarBuscador() {
    document.querySelectorAll(".search-box").forEach((box) => {
        // Busca el campo dentro de esta .search-box particular, porque puede haber buscadores en varias páginas.
        const input = box.querySelector("input");
        // Guarda el botón de la caja actual para ejecutar la búsqueda cuando el usuario hace clic.
        const button = box.querySelector("button");
        if (!input || !button) return;

        const buscar = () => {
            // Lee el texto ingresado y elimina espacios externos para que una búsqueda formada solo por espacios cuente como vacía.
            const texto = input.value.trim();
            if (!texto) {
                mostrarMensaje("Escribí el nombre de un manga para buscar.", "warning");
                input.focus();
                return;
            }
            window.location.href = `catalogo.html?search=${encodeURIComponent(texto)}`;
        };

        button.addEventListener("click", buscar);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                buscar();
            }
        });
    });
}

/* ========================= NEWSLETTER ========================= */
// Gestiona la interfaz de suscripción del boletín; no confundir con un sistema de mailing externo.


/**
 * Valida el campo del boletín y muestra un mensaje local de confirmación.
 * - No recibe parámetros; busca .newsletter form en el HTML.
 * - No devuelve un valor. En este código la suscripción es una confirmación de interfaz: no se envía a un servicio externo.
 */
function iniciarNewsletter() {
    const form = document.querySelector(".newsletter form");
    if (!form) return;

    const input = form.querySelector("input");
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = input?.value.trim() || "";

        if (!email) {
            mostrarMensaje("Ingresá tu correo electrónico.", "warning");
            input?.focus();
            return;
        }

        if (!validarEmail(email)) {
            mostrarMensaje("Ingresá un correo electrónico válido.", "warning");
            input?.focus();
            return;
        }

        mostrarMensaje("¡Te suscribiste correctamente a ReManga!", "success");
        input.value = "";
    });
}

/* ========================= ANIMACIONES ========================= */
// Activa animaciones cuando los elementos entran en pantalla y respeta el soporte del navegador.


/**
 * Prepara elementos visuales para que aparezcan cuando entran en la zona visible de la pantalla.
 * - No recibe parámetros.
 * - No devuelve un valor; configura estilos y un IntersectionObserver.
 */
function iniciarAnimaciones() {
    const elementos = document.querySelectorAll(
        ".benefit, .action-card, .card, .newsletter"
    );
    if (!elementos.length) return;

    if (!("IntersectionObserver" in window)) {
        elementos.forEach((elemento) => {
            elemento.style.opacity = "1";
        });
        return;
    }

    elementos.forEach((elemento) => {
        elemento.style.opacity = "0";
        elemento.style.transform = "translateY(25px)";
        elemento.style.transition = "opacity .7s ease, transform .7s ease";
    });

    // IntersectionObserver avisa cuando un elemento cruza el límite visible de la pantalla.
    // El threshold: 0.15 configurado más abajo significa que basta con ver aproximadamente el 15 %.
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            // Ya animado, dejamos de observarlo para no repetir la animación cada vez que se desplaza.
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.15 });

    elementos.forEach((elemento) => observer.observe(elemento));
}

/* ========================= API ========================= */
// IMPORTANTE: el nombre histórico 'api...' no significa que se esté llamando a Flask.
// En la versión actual estas operaciones se hacen desde el navegador directamente contra Supabase.


let remangaSupabaseClient = null;

// Construye el cliente oficial de Supabase usando la configuración compartida del proyecto.
/**
 * Crea una única instancia reutilizable del cliente JavaScript de Supabase para las consultas de productos.
 * - No recibe parámetros; usa REMANGA_SUPABASE_CONFIG publicada en window por config.js.
 * - Cliente de Supabase o null si falta la configuración o no se pudo crear.
 */
function obtenerClienteSupabaseDatos() {
    // Guardamos el cliente en una variable compartida y lo reutilizamos durante esta carga de página.
    // Evita crear repetidamente clientes con la misma URL y la misma sesión.
    if (remangaSupabaseClient) return remangaSupabaseClient;

    // Lee la configuración pública compartida por config.js.
    const config = window.REMANGA_SUPABASE_CONFIG;

    // Necesitamos tres piezas: configuración habilitada, librería cargada y URL/clave publicable.
    // La clave del navegador nunca debe ser una service_role key ni otro secreto del servidor.
    if (!(config?.enabled && window.supabase && config.url && config.publishableKey)) {
        return null;
    }

    try {
        // Guarda la instancia creada en una variable común para reutilizar cliente y sesión en las siguientes consultas.
        remangaSupabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        return remangaSupabaseClient;
    } catch (error) {
        console.warn("No se pudo crear el cliente de Supabase:", error);
        return null;
    }
}

// Lista centralizada de columnas para que catálogo, detalle y favoritos usen el mismo esquema.
const CAMPOS_PRODUCTO = "id,titulo,tomo,precio,estado,descripcion,imagen";

// Lee la colección de productos. El resultado se devuelve al resto del frontend para renderizarlo.
/**
 * Consulta los productos de la tabla productos y los ordena por identificador descendente.
 * - No recibe parámetros.
 * - Array de productos; lanza un Error si no puede consultar Supabase.
 */
async function apiGetProductos() {
    // Obtiene el cliente reutilizable; si devuelve null, no hay cliente disponible para hacer la consulta.
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // Consulta encadenada: tabla productos -> columnas necesarias -> ordenar por id descendente.
    // ascending:false quiere decir que los id más altos aparecen primero.
    // await espera la respuesta de Supabase sin congelar toda la interfaz; data y error se separan
    // mediante desestructuración del objeto de respuesta.
    // data contiene los registros si la consulta funciona; error informa un problema. await espera la respuesta de red sin bloquear toda la página.
    const { data, error } = await supabaseClient
        .from("productos")
        .select(CAMPOS_PRODUCTO)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error Supabase al cargar productos:", error);
        throw new Error(error.message || "No se pudieron cargar los productos.");
    }

    return Array.isArray(data) ? data : [];
}

// Busca un único producto por su identificador, usado en la página de detalle.
/**
 * Busca un único producto por su ID para llenar la página de detalle.
 * - id: identificador del producto obtenido de la URL.
 * - Objeto producto; lanza un Error si hay un problema o el registro no existe.
 */
async function apiGetProducto(id) {
    // Reutiliza el cliente común para consultar la tabla productos.
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // eq("id", id) agrega el filtro equivalente a WHERE id = idBuscado.
    // maybeSingle espera cero o una fila: si no existe, data queda vacío y podemos mostrar
    // un mensaje propio; si hubiera más de una fila para un id, Supabase devolvería un error.
    // maybeSingle() produce un registro o null en data, porque la consulta está buscando un ID único.
    const { data, error } = await supabaseClient
        .from("productos")
        .select(CAMPOS_PRODUCTO)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error Supabase al cargar producto:", error);
        throw new Error(error.message || "No se pudo cargar el producto.");
    }

    if (!data) {
        throw new Error("El producto no existe.");
    }

    return data;
}

/* ---------- Publicar un manga ---------- */
// La publicación requiere sesión, carga la imagen a Storage y luego inserta los datos del producto.


/**
 * Lee la sesión que mantiene Supabase Auth para saber si hay una cuenta autenticada.
 * - No recibe parámetros.
 * - Sesión actual o null si no se puede leer o no hay sesión.
 */
async function obtenerSesionActual() {
    // Necesita el cliente de Supabase para consultar la sesión administrada por Auth.
    const supabaseClient = obtenerClienteSupabaseDatos();
    if (!supabaseClient) return null;

    try {
        // getSession() devuelve un objeto con data y error; aquí solo se extrae data para consultar data.session.
        const { data } = await supabaseClient.auth.getSession();
        return data?.session || null;
    } catch (error) {
        console.warn("No se pudo leer la sesión:", error);
        return null;
    }
}

/**
 * Construye un nombre de archivo distinto para guardar una imagen sin reemplazar intencionalmente otra.
 * - archivo: objeto File elegido en el formulario; se utiliza su nombre para extraer la extensión.
 * - Cadena que combina tiempo actual, parte aleatoria y extensión.
 */
function nombreImagenUnico(archivo) {
    // split(".") separa el nombre por puntos y pop() toma la última parte como extensión.
    // Sumamos milisegundos actuales y una cadena aleatoria para reducir choques de nombres.
    // La aleatoriedad solo ayuda a distinguir archivos; no es criptográfica ni un mecanismo de seguridad.
    // archivo es un objeto File. split separa el nombre por puntos y pop toma el último segmento como extensión.
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase();
    // Pasa un decimal aleatorio a una cadena base 36 y toma una parte para diferenciar nombres. No sirve como mecanismo de seguridad.
    const aleatorio = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${aleatorio}.${extension}`;
}

// Sube el archivo seleccionado a Supabase Storage y obtiene la ruta que se guardará con el producto.
/**
 * Envía una imagen elegida por el usuario al bucket de Supabase Storage.
 * - archivo: objeto File, no una URL ni el nombre de archivo.
 * - Nombre del objeto almacenado; lanza un Error si la carga falla.
 */
async function subirImagenProducto(archivo) {
    // Cliente que expone el método storage.
    const supabaseClient = obtenerClienteSupabaseDatos();
    // La propiedad bucket indica el contenedor en el que se guardarán las portadas.
    const config = window.REMANGA_SUPABASE_CONFIG;

    if (!supabaseClient || !config?.bucket) {
        throw new Error("No se pudo conectar con el almacenamiento de imágenes.");
    }

    // Clave/ruta que Storage asignará al objeto de imagen dentro del bucket.
    const nombre = nombreImagenUnico(archivo);

    // storage.from(bucket) selecciona el bucket; upload(nombre, archivo) envía el archivo binario.
    // contentType comunica su formato MIME. upsert:false impide reemplazar otro archivo del mismo nombre.
    // En esta operación se comprueba error: upload comunica si Storage aceptó o rechazó el archivo.
    const { error } = await supabaseClient
        .storage
        .from(config.bucket)
        .upload(nombre, archivo, {
            contentType: archivo.type || "image/jpeg",
            upsert: false
        });

    if (error) {
        console.error("Error al subir la imagen:", error);
        throw new Error("No se pudo subir la imagen del manga.");
    }

    return nombre;
}

// Comprueba la sesión, prepara la imagen si existe e inserta el producto en la tabla correspondiente.
/**
 * Valida que haya sesión, sube una imagen si corresponde y crea el registro del manga en productos.
 * - producto: objeto con titulo, tomo, precio, estado, descripcion e imagen (File opcional).
 * - Registro insertado devuelto por Supabase; lanza un Error si falta sesión, falla Storage o falla la inserción.
 */
async function apiCrearProducto(producto) {
    // Cliente utilizado para comprobar autenticación e insertar la publicación.
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // Primero comprobamos quién publica. Esta validación mejora la experiencia, pero no es una
    // barrera de seguridad suficiente por sí sola: las políticas RLS de Supabase también deben
    // impedir inserciones no autorizadas.
    // Obtiene la sesión para asociar el manga a la cuenta que lo publica.
    const sesion = await obtenerSesionActual();

    if (!sesion?.user) {
        const aviso = new Error("Tenés que iniciar sesión para publicar un manga.");
        aviso.requiereLogin = true;
        throw aviso;
    }

    // Empieza vacío porque la imagen es opcional; después puede contener el nombre del archivo subido.
    let nombreImagen = "";
    // Puede ser el objeto File del formulario o null si el usuario no adjuntó portada.
    const archivo = producto.imagen;

    if (archivo && archivo.size > 0) {
        if (archivo.size > 5 * 1024 * 1024) {
            throw new Error("La imagen no puede superar los 5 MB.");
        }
        // La carga de imagen ocurre antes del INSERT. Si Storage funciona pero la inserción falla,
        // puede quedar un archivo sin producto asociado; esto podría limpiarse en una mejora futura.
        nombreImagen = await subirImagenProducto(archivo);
    }

    // Guardamos datos del manga más vendedor_id, el UUID del usuario autenticado.
    // select(...).single() pide que la respuesta incluya el registro recién creado como un objeto.
    // data recibe el registro creado; error informa el fallo si no se pudo insertar.
    const { data, error } = await supabaseClient
        .from("productos")
        .insert({
            titulo: producto.titulo,
            tomo: producto.tomo,
            precio: producto.precio,
            estado: producto.estado,
            descripcion: producto.descripcion,
            imagen: nombreImagen,
            vendedor_id: sesion.user.id
        })
        .select(CAMPOS_PRODUCTO)
        .single();

    if (error) {
        console.error("Error Supabase al publicar el manga:", error);
        throw new Error(error.message || "No se pudo publicar el manga.");
    }

    return data;
}

/* ========================= CARRITO: BASE ========================= */
// El carrito se conserva en localStorage del navegador; aquí no depende de una API Flask ni de Supabase.


/**
 * Copia el carrito de la clave de almacenamiento antigua a la clave actual, sin sobrescribir la nueva.
 * - No recibe parámetros.
 * - No devuelve un valor; se ejecuta como compatibilidad con versiones previas.
 */
function migrarCarritoAntiguo() {
    // Migración de compatibilidad: si ya existe la clave nueva, no se pisa con datos antiguos.
    // Solo se busca "remanga_carrito" cuando la clave actual todavía no existe.
    if (localStorage.getItem(CART_KEY)) return;

    const antiguo = localStorage.getItem("remanga_carrito");
    if (!antiguo) return;

    try {
        // localStorage guarda cadenas. JSON.parse reconstruye el valor y Array.isArray verifica
        // que realmente tenga la forma de lista que espera el carrito.
        const datos = JSON.parse(antiguo);
        if (Array.isArray(datos)) {
            localStorage.setItem(CART_KEY, JSON.stringify(datos));
        }
    } catch (error) {
        console.error("No se pudo migrar el carrito anterior:", error);
    }
}

// Convierte el texto JSON del almacenamiento local en un array utilizable por JavaScript.
/**
 * Lee el carrito persistido y lo convierte desde JSON a un array.
 * - No recibe parámetros.
 * - Array de líneas del carrito; devuelve [] si no hay datos válidos.
 */
function obtenerCarrito() {
    migrarCarritoAntiguo();
    // localStorage devuelve texto o null, no un array. JSON.parse convertirá esa cadena a un valor JavaScript.
    const datos = localStorage.getItem(CART_KEY);
    if (!datos) return [];

    try {
        // Reconstruye el valor guardado y luego Array.isArray verifica que tenga forma de lista.
        const carrito = JSON.parse(datos);
        return Array.isArray(carrito) ? carrito : [];
    } catch (error) {
        console.error("No se pudo leer el carrito:", error);
        return [];
    }
}

// Serializa el array del carrito para poder recuperarlo cuando el usuario cambie de página.
/**
 * Persiste el array del carrito en localStorage, convirtiéndolo primero a JSON.
 * - carrito: array de productos y cantidades que se debe guardar.
 * - No devuelve un valor.
 */
function guardarCarrito(carrito) {
    localStorage.setItem(CART_KEY, JSON.stringify(carrito));
}

/**
 * Suma las unidades de todos los renglones del carrito.
 * - carrito: array cuyos elementos tienen quantity.
 * - Número total de unidades; no es la cantidad de tipos distintos de manga.
 */
function cantidadTotalCarrito(carrito) {
    // reduce recorre cada fila y acumula las unidades. Ejemplo: cantidades 2 + 1 + 3 = 6.
    // El 0 del final es el valor inicial del acumulador "total".
    return carrito.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );
}

/**
 * Refleja el total de unidades en todos los contadores visibles del carrito.
 * - No recibe parámetros; lee el carrito almacenado.
 * - No devuelve un valor; actualiza texto y visibilidad de los contadores.
 */
function actualizarContadorCarrito() {
    // Obtiene todos los contadores de la página para que todos muestren el mismo total.
    const contadores = document.querySelectorAll(".cart-counter");
    if (!contadores.length) return;

    // Primero lee el estado guardado y después calcula la suma de unidades.
    const total = cantidadTotalCarrito(obtenerCarrito());
    // Recorre cada nodo encontrado y actualiza su número y visibilidad.
    contadores.forEach((contador) => {
        contador.textContent = total;
        contador.style.display = total > 0 ? "flex" : "none";
    });
}

/**
 * Añade un manga al carrito o suma unidades si ese ID ya estaba presente.
 * - producto: datos del manga, que se normalizan a un formato común.
 * - cantidad: unidades a añadir; por defecto 1.
 * - No devuelve un valor; guarda el carrito y refresca su contador.
 */
function agregarProductoAlCarrito(producto, cantidad = 1) {
    // Lee la lista ya guardada para no perder los productos agregados previamente.
    const carrito = obtenerCarrito();
    // Normaliza el ID a número para que "12" y 12 coincidan al comparar.
    const id = Number(producto.id);

    // find devuelve la primera fila cuyo id coincide; si no encuentra ninguna, devuelve undefined.
    // Convertimos ambos id a Number para que "12" y 12 se consideren el mismo producto.
    // Busca una fila del mismo manga; find devuelve el primer objeto coincidente o undefined.
    const existente = carrito.find(
        (item) => Number(item.id) === id
    );

    // Las páginas pueden entregar nombres de propiedades distintos: titulo/tomo/precio o
    // title/volume/price. Este objeto traduce las variantes a un único formato interno del carrito.
    // Crea un formato común de carrito aunque el producto venga con propiedades como titulo/tomo o title/volume.
    const normalizado = {
        id: producto.id,
        title: producto.titulo ?? producto.title ?? "Manga",
        volume: producto.tomo ?? producto.volume ?? "",
        price: Number(producto.precio ?? producto.price ?? 0),
        image: obtenerRutaImagen(producto.imagen ?? producto.image ?? ""),
        state: producto.estado ?? producto.state ?? "",
        quantity: Number(cantidad) || 1
    };

    // Si existe, sumamos unidades en la misma fila; si no, incorporamos una nueva fila.
    // Luego guardamos el array actualizado en localStorage y sincronizamos el contador visual.
    if (existente) {
        existente.quantity = Number(existente.quantity || 0) + normalizado.quantity;
    } else {
        carrito.push(normalizado);
    }

    guardarCarrito(carrito);
    actualizarContadorCarrito();
}

/* ========================= HOME ========================= */
// Obtiene y dibuja los productos destacados de la página de inicio.


/**
 * Carga los productos para la portada si existe el contenedor específico de la página de inicio.
 * - No recibe parámetros.
 * - No devuelve un valor; maneja la carga, los errores y la representación de tarjetas.
 */
async function iniciarHome() {

    const cardsContainer =
        document.getElementById("homeProducts");

    if (!cardsContainer) {
        return;
    }


    try {

        const productos =
            await apiGetProductos();


        mostrarProductosHome(
            productos
        );


        iniciarCarruselRecomendados();


    } catch (error) {

        console.error(
            "Error al cargar productos de Home:",
            error
        );


        cardsContainer.innerHTML = `
            <p class="home-products-error">
                No se pudieron cargar los mangas.
            </p>
        `;

    }

}


/* =========================================================
   MOSTRAR PRODUCTOS EN HOME
   ========================================================= */

   /**
    * Reemplaza el contenido del contenedor de inicio por tarjetas creadas para los productos recibidos.
    * - productos: array de registros de productos.
    * - No devuelve un valor; modifica el DOM.
    */
   function mostrarProductosHome(productos) {

    const cardsContainer =
        document.getElementById("homeProducts");

    if (!cardsContainer) {
        return;
    }


    cardsContainer.innerHTML = "";


    productos.forEach(
        (producto) => {

            const card =
                crearCardHome(
                    producto
                );

            cardsContainer.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   CREAR CARD DE HOME
   ========================================================= */

   /**
    * Construye una tarjeta visual para un manga de la página de inicio y conecta sus acciones.
    * - producto: objeto con los datos del manga que se mostrarán.
    * - Elemento HTML article ya preparado para insertarse en la página.
    */
   function crearCardHome(
    producto
) {

    const card =
        document.createElement("article");

    card.className =
        "card";


    /* =====================================================
       IMAGEN
       ===================================================== */

    const image =
        document.createElement("img");

    image.src =
        obtenerRutaImagen(
            producto.imagen
        );

    image.alt =
        producto.titulo ||
        "Manga";


    /* =====================================================
       CONTENIDO
       ===================================================== */

    const content =
        document.createElement("div");

    content.className =
        "card-content";


    const title =
        document.createElement("h3");

    title.textContent =
        producto.titulo ||
        "Sin título";


    const volume =
        document.createElement("span");

    volume.textContent =
        `Tomo ${producto.tomo}`;


    const price =
        document.createElement("h4");

    price.textContent =
        formatearPrecio(
            producto.precio
        );

    const favorite =
        document.createElement("button");

    favorite.type = "button";
    favorite.className = "favorite-button home-favorite-button";
    favorite.dataset.productId = String(producto.id);
    favorite.setAttribute("aria-label", "Agregar a favoritos");
    favorite.innerHTML = '<i class="fa-regular fa-heart"></i>';

    const button =
        document.createElement("button");

    button.type =
        "button";

    button.textContent =
        "Comprar";


    /* =====================================================
       BOTÓN COMPRAR
       ===================================================== */

    button.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();


            agregarProductoAlCarrito(
                producto,
                1
            );


            mostrarMensaje(
                `${producto.titulo} agregado al carrito.`,
                "success"
            );

        }
    );


    /* =====================================================
       CLICK EN TODA LA TARJETA
       ===================================================== */

    card.addEventListener(
        "click",
        () => {

            window.location.href =
                `producto.html?id=${producto.id}`;

        }
    );


    /* =====================================================
       ARMAR CARD
       ===================================================== */

    content.appendChild(
        title
    );

    content.appendChild(
        volume
    );

    content.appendChild(
        price
    );

    content.appendChild(
        button
    );


    card.appendChild(
        image
    );

    card.appendChild(
        favorite
    );

    card.appendChild(
        content
    );


    card.style.cursor =
        "pointer";


    return card;

}
/**
 * Activa los controles de desplazamiento de la sección de recomendados cuando existe ese carrusel.
 * - No recibe parámetros.
 * - No devuelve un valor; asocia los botones anterior y siguiente con el contenedor desplazable.
 */
function iniciarCarruselRecomendados() {

    const carousel =
        document.querySelector(
            ".recommended-carousel"
        );

    const container =
        document.getElementById(
            "homeProducts"
        );

    const prev =
        document.getElementById(
            "recommendedPrev"
        );

    const next =
        document.getElementById(
            "recommendedNext"
        );


    if (
        !carousel ||
        !container
    ) {
        return;
    }


    /* =====================================================
       CANTIDAD DE DESPLAZAMIENTO
       ===================================================== */

    /**
     * Calcula cuánto debe avanzar el carrusel tomando como referencia el ancho de una tarjeta y su separación.
     * - No recibe parámetros; consulta el primer elemento de tarjeta y el espacio entre tarjetas.
     * - Cantidad de píxeles que debe desplazarse el carrusel.
     */
    function obtenerDesplazamiento() {

        const card =
            container.querySelector(".card");

        if (!card) {
            return 0;
        }


        const gap =
            parseFloat(
                getComputedStyle(
                    container
                ).gap
            ) || 0;


        return (
            card.offsetWidth +
            gap
        ) * 2;

    }


    /* =====================================================
       IZQUIERDA
       ===================================================== */

    if (prev) {

        prev.addEventListener(
            "click",
            () => {

                carousel.scrollBy({
                    left:
                        -obtenerDesplazamiento(),

                    behavior:
                        "smooth"
                });

            }
        );

    }


    /* =====================================================
       DERECHA
       ===================================================== */

    if (next) {

        next.addEventListener(
            "click",
            () => {

                carousel.scrollBy({
                    left:
                        obtenerDesplazamiento(),

                    behavior:
                        "smooth"
                });

            }
        );

    }

}

/* ========================= CATÁLOGO ========================= */
// Coordina la carga, representación, búsqueda, filtros, orden y mensajes de estado del catálogo.


let productosCatalogo = [];

/**
 * Carga una vez los productos del catálogo y conecta los filtros y el ordenamiento de resultados.
 * - No recibe parámetros; busca #catalogGrid para identificar la página de catálogo.
 * - No devuelve un valor; actualiza la lista global productosCatalogo y la interfaz.
 */
async function iniciarCatalogo() {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    mostrarCargaCatalogo(true);

    try {
        productosCatalogo = await apiGetProductos();
        aplicarBusquedaInicialCatalogo();
        configurarBusquedaCatalogo();
        configurarFiltrosCatalogo();
        configurarPrecioCatalogo();
        configurarOrdenamientoCatalogo();
        configurarLimpiarFiltros();
        configurarResetResultados();
        mostrarProductosFiltrados();
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
        mostrarErrorCatalogo();
    } finally {
        mostrarCargaCatalogo(false);
    }
}

/**
 * Lee el parámetro search de la URL y lo coloca en los campos de búsqueda del catálogo.
 * - No recibe parámetros.
 * - No devuelve un valor; sincroniza los campos al abrir enlaces de búsqueda.
 */
function aplicarBusquedaInicialCatalogo() {
    const search = obtenerParam("search");
    if (!search) return;

    const filtro = document.getElementById("filterSearch");
    const header = document.getElementById("catalogSearch");
    if (filtro) filtro.value = search;
    if (header) header.value = search;
}

/**
 * Construye una tarjeta del catálogo con imagen, estado, título, tomo, precio y botones.
 * - producto: objeto con los datos del manga.
 * - Elemento article listo para agregarse a la cuadrícula.
 */
function crearCardProducto(producto) {
    const article = document.createElement("article");
    article.className = "catalog-card";

    const imageContainer = document.createElement("div");
    imageContainer.className = "catalog-image-container";

    const image = document.createElement("img");
    image.src = obtenerRutaImagen(producto.imagen);
    image.alt = producto.titulo || "Manga";

    const state = document.createElement("span");
    state.className = `product-state ${normalizarEstado(producto.estado) === "usado" ? "used" : "new"}`;
    state.textContent = normalizarEstado(producto.estado) === "usado" ? "Usado" : "Nuevo";

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "favorite-button";
    favorite.dataset.productId = String(producto.id);
    favorite.setAttribute("aria-label", "Agregar a favoritos");
    favorite.innerHTML = `<i class="fa-regular fa-heart"></i>`;

    imageContainer.append(image, state, favorite);

    const content = document.createElement("div");
    content.className = "catalog-card-content";

    const type = document.createElement("span");
    type.className = "product-type";
    type.textContent = "MANGA";

    const title = document.createElement("h3");
    title.textContent = producto.titulo || "Sin título";

    const volume = document.createElement("p");
    volume.className = "volume";
    volume.textContent = `Tomo ${producto.tomo}`;

    const bottom = document.createElement("div");
    bottom.className = "product-bottom";

    const price = document.createElement("strong");
    price.textContent = formatearPrecio(producto.precio);

    const buyButton = document.createElement("button");
    buyButton.type = "button";
    buyButton.className = "add-cart";
    buyButton.textContent = "Comprar";

    bottom.append(price, buyButton);
    content.append(type, title, volume, bottom);
    article.append(imageContainer, content);

    const abrir = () => {
        window.location.href = `producto.html?id=${producto.id}`;
    };

    imageContainer.addEventListener("click", (event) => {
        if (!event.target.closest(".favorite-button")) abrir();
    });

    title.addEventListener("click", abrir);

    favorite.addEventListener("click", (event) => {
        event.stopPropagation();
        const icon = favorite.querySelector("i");
        const active = favorite.classList.toggle("active");

        if (active) {
            icon.classList.replace("fa-regular", "fa-solid");
            mostrarMensaje("Manga agregado a favoritos.", "success");
        } else {
            icon.classList.replace("fa-solid", "fa-regular");
            mostrarMensaje("Manga eliminado de favoritos.", "success");
        }
    });

    buyButton.addEventListener("click", (event) => {
        event.stopPropagation();
        agregarProductoAlCarrito(producto, 1);
        mostrarMensaje(`${producto.titulo} fue agregado al carrito.`, "success");
    });

    return article;
}

/**
 * Dibuja la lista que se le entrega en la cuadrícula del catálogo.
 * - productos: array ya filtrado u ordenado.
 * - No devuelve un valor; vacía el contenedor y agrega una tarjeta por producto.
 */
function mostrarProductos(productos) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    grid.innerHTML = "";
    productos.forEach((producto) => {
        grid.appendChild(crearCardProducto(producto));
    });
}

/**
 * Lee y normaliza el texto del filtro de búsqueda del catálogo.
 * - No recibe parámetros.
 * - Texto en minúsculas y sin espacios externos; cadena vacía si no hay campo.
 */
function obtenerTextoBusquedaCatalogo() {
    return (
        document.getElementById("filterSearch")?.value || ""
    ).trim().toLowerCase();
}

/**
 * Lee el límite superior del precio configurado en el control deslizante.
 * - No recibe parámetros.
 * - Número máximo permitido o Infinity cuando el filtro no existe.
 */
function obtenerPrecioMaximoCatalogo() {
    const filtro = document.getElementById("priceFilter");
    return filtro ? Number(filtro.value) : Infinity;
}

/**
 * Reúne los estados que el usuario marcó como filtro (nuevo y/o usado).
 * - No recibe parámetros.
 * - Array de estados normalizados; [] significa que no se restringe por estado.
 */
function obtenerEstadosCatalogo() {
    const estados = [];
    if (document.getElementById("filterNuevo")?.checked) estados.push("nuevo");
    if (document.getElementById("filterUsado")?.checked) estados.push("usado");
    return estados;
}

/**
 * Ordena una copia de los productos según el orden seleccionado, sin modificar el array original.
 * - productos: array que se desea ordenar.
 * - orden: modo seleccionado, como price-low, price-high, name o default.
 * - Array ordenado.
 */
function ordenarProductosCatalogo(productos, orden) {
    // sort modifica el array recibido. El spread [...productos] crea una copia para no alterar
    // productosCatalogo, que se necesita intacto para volver a filtrar desde el conjunto completo.
    const copia = [...productos];

    if (orden === "price-low") {
        return copia.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
    }

    if (orden === "price-high") {
        return copia.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
    }

    if (orden === "name") {
        return copia.sort((a, b) =>
            String(a.titulo || "").localeCompare(
                String(b.titulo || ""),
                "es",
                { sensitivity: "base" }
            )
        );
    }

    return copia;
}

// Aplica los criterios elegidos por el usuario al conjunto de productos ya cargados.
/**
 * Combina texto, estado y precio; luego ordena y vuelve a dibujar los resultados.
 * - No recibe parámetros; toma los valores actuales de los controles de la página.
 * - No devuelve un valor; actualiza tarjetas, contador y aviso sin resultados.
 */
function mostrarProductosFiltrados() {
    const texto = obtenerTextoBusquedaCatalogo();
    const maxPrecio = obtenerPrecioMaximoCatalogo();
    const estados = obtenerEstadosCatalogo();

    // filter crea una lista nueva con los productos que cumplan los tres grupos de condiciones.
    // Si no hay texto o no se marcó ningún estado, ese criterio queda abierto y no restringe.
    let productos = productosCatalogo.filter((producto) => {
        const nombre = String(producto.titulo || "").trim().toLowerCase();
        const estado = normalizarEstado(producto.estado);
        const precio = Number(producto.precio) || 0;

        // Cada expresión "(!filtro || cumple)" significa: si no se pidió ese filtro, pasa;
        // si se pidió, solo pasa cuando coincide. Los && exigen cumplir todos los criterios activos.
        return (
            (!texto || nombre.includes(texto)) &&
            (!estados.length || estados.includes(estado)) &&
            precio <= maxPrecio
        );
    });

    const orden = document.getElementById("sortProducts")?.value || "default";
    productos = ordenarProductosCatalogo(productos, orden);

    mostrarProductos(productos);
    actualizarContadorResultados(productos.length);
    mostrarSinResultados(productos.length);
}

/**
 * Sincroniza el buscador lateral con el de cabecera y vuelve a filtrar cuando cambia el texto.
 * - No recibe parámetros.
 * - No devuelve un valor; registra listeners si los campos existen.
 */
function configurarBusquedaCatalogo() {
    const filtro = document.getElementById("filterSearch");
    const header = document.getElementById("catalogSearch");
    const button = document.getElementById("searchButton");

    filtro?.addEventListener("input", () => {
        if (header) header.value = filtro.value;
        mostrarProductosFiltrados();
    });

    header?.addEventListener("input", () => {
        if (filtro) filtro.value = header.value;
        mostrarProductosFiltrados();
    });

    button?.addEventListener("click", mostrarProductosFiltrados);
}

/**
 * Conecta las casillas de estado para recalcular el catálogo cuando se marcan o desmarcan.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function configurarFiltrosCatalogo() {
    [
        document.getElementById("filterNuevo"),
        document.getElementById("filterUsado")
    ].filter(Boolean).forEach((filtro) => {
        filtro.addEventListener("change", mostrarProductosFiltrados);
    });
}

/**
 * Conecta el control deslizante de precio y actualiza tanto el valor mostrado como los resultados.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function configurarPrecioCatalogo() {
    const filtro = document.getElementById("priceFilter");
    const display = document.getElementById("priceDisplay");
    if (!filtro) return;

    filtro.addEventListener("input", () => {
        if (display) display.textContent = formatearPrecio(filtro.value);
        mostrarProductosFiltrados();
    });
}

/**
 * Hace que cambiar el selector de orden vuelva a mostrar el catálogo ordenado.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function configurarOrdenamientoCatalogo() {
    document.getElementById("sortProducts")
        ?.addEventListener("change", mostrarProductosFiltrados);
}

/**
 * Muestra una etiqueta singular o plural con la cantidad de resultados encontrados.
 * - cantidad: número de tarjetas coincidentes.
 * - No devuelve un valor; actualiza el texto del contador.
 */
function actualizarContadorResultados(cantidad) {
    const contador = document.getElementById("resultsCount");
    if (!contador) return;
    contador.textContent = cantidad === 1
        ? "1 producto encontrado"
        : `${cantidad} productos encontrados`;
}

/**
 * Activa o desactiva el mensaje de búsqueda vacía según la cantidad de resultados.
 * - cantidad: total de productos filtrados.
 * - No devuelve un valor.
 */
function mostrarSinResultados(cantidad) {
    const mensaje = document.getElementById("noResults");
    if (!mensaje) return;
    mensaje.classList.toggle("show", cantidad === 0);
}

/**
 * Restablece los campos de búsqueda, casillas, precio y orden a sus valores iniciales.
 * - No recibe parámetros.
 * - No devuelve un valor; vuelve a aplicar los filtros después de resetearlos.
 */
function limpiarFiltros() {
    const filtro = document.getElementById("filterSearch");
    const header = document.getElementById("catalogSearch");
    const nuevo = document.getElementById("filterNuevo");
    const usado = document.getElementById("filterUsado");
    const precio = document.getElementById("priceFilter");
    const display = document.getElementById("priceDisplay");
    const orden = document.getElementById("sortProducts");

    if (filtro) filtro.value = "";
    if (header) header.value = "";
    if (nuevo) nuevo.checked = false;
    if (usado) usado.checked = false;
    if (precio) precio.value = 50000;
    if (display) display.textContent = "$50.000";
    if (orden) orden.value = "default";

    mostrarProductosFiltrados();
}

/**
 * Conecta el botón de limpiar filtros con la función que restaura los valores iniciales.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function configurarLimpiarFiltros() {
    document.getElementById("clearFilters")
        ?.addEventListener("click", limpiarFiltros);
}

/**
 * Conecta el botón de reiniciar búsqueda con la misma función de limpieza de filtros.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function configurarResetResultados() {
    document.getElementById("resetSearch")
        ?.addEventListener("click", limpiarFiltros);
}

/**
 * Muestra u oculta el indicador de carga del catálogo.
 * - mostrar: booleano; true muestra el indicador y false lo oculta.
 * - No devuelve un valor.
 */
function mostrarCargaCatalogo(mostrar) {
    const loading = document.getElementById("catalogLoading");
    if (loading) loading.style.display = mostrar ? "flex" : "none";
}

/**
 * Limpia la cuadrícula y cambia el mensaje de estado cuando no se pueden cargar los productos.
 * - No recibe parámetros.
 * - No devuelve un valor.
 */
function mostrarErrorCatalogo() {
    const grid = document.getElementById("catalogGrid");
    const noResults = document.getElementById("noResults");

    if (grid) grid.innerHTML = "";
    if (!noResults) return;

    noResults.classList.add("show");
    noResults.querySelector("h2")?.replaceChildren(
        document.createTextNode("No pudimos cargar los mangas")
    );
    noResults.querySelector("p")?.replaceChildren(
        document.createTextNode("Comprobá que la API de ReManga esté funcionando.")
    );
}

/* ========================= PRODUCTO ========================= */
// Lee el identificador del producto desde la URL y prepara la vista de detalle y productos relacionados.


/**
 * Valida el parámetro id de la URL, obtiene el producto y carga sus productos relacionados.
 * - No recibe parámetros.
 * - No devuelve un valor; muestra carga o error según el resultado.
 */
async function iniciarProducto() {
    // Este inicializador corre en cualquier página, pero solo sigue si existe el contenedor del detalle.
    // El identificador de la URL indica a Supabase qué producto debe devolver.
    const detail = document.getElementById("productDetail");
    if (!detail) return;

    // URLSearchParams lee el valor de ?id=... como texto; Number lo convierte a número.
    // Validamos que sea entero positivo antes de enviar una consulta a Supabase.
    const id = Number(obtenerParam("id"));
    if (!Number.isInteger(id) || id <= 0) {
        mostrarErrorProducto("No se recibió un ID de producto válido.");
        return;
    }

    mostrarCargaProducto(true);

    try {
        const producto = await apiGetProducto(id);
        mostrarProducto(producto);
        iniciarControlesProducto(producto);
        await cargarProductosRelacionados(producto.id);
    } catch (error) {
        console.error("Error al cargar producto:", error);
        mostrarErrorProducto(error.message);
    } finally {
        // finally ocurre tanto si la consulta termina bien como si falla, así que apagamos
        // el estado de carga en ambos casos y evitamos dejar la pantalla semitransparente.
        mostrarCargaProducto(false);
    }
}

/**
 * Copia los datos del producto recibido a los campos de la página de detalle.
 * - producto: objeto devuelto por Supabase.
 * - No devuelve un valor; actualiza texto, imagen, estado y título del documento.
 */
function mostrarProducto(producto) {
    const image = document.getElementById("productImage");
    const title = document.getElementById("productTitle");
    const volume = document.getElementById("productVolume");
    const category = document.getElementById("productCategory");
    const price = document.getElementById("productPrice");
    const state = document.getElementById("productState");
    const availability = document.getElementById("productAvailability");
    const shortDescription = document.getElementById("productShortDescription");
    const description = document.getElementById("productDescription");
    const estado = normalizarEstado(producto.estado);
    const textoDescripcion = producto.descripcion || "Este producto no tiene una descripción.";

    if (image) {
        image.src = obtenerRutaImagen(producto.imagen);
        image.alt = producto.titulo || "Manga";
    }
    if (title) title.textContent = producto.titulo || "Sin título";
    if (volume) volume.textContent = `Tomo ${producto.tomo}`;
    if (category) category.textContent = "MANGA";
    if (price) price.textContent = formatearPrecio(producto.precio);

    if (state) {
        state.textContent = estado ? estado.toUpperCase() : "SIN ESTADO";
        state.classList.remove("new", "used");
        state.classList.add(estado === "usado" ? "used" : "new");
    }

    if (availability) availability.textContent = "Disponible";
    if (shortDescription) shortDescription.textContent = textoDescripcion;
    if (description) description.textContent = textoDescripcion;
    document.title = `${producto.titulo || "Producto"} | ReManga`;
}

/**
 * Conecta cantidad, agregar al carrito, comprar ahora y el botón de favorito del detalle.
 * - producto: producto que se está mostrando.
 * - No devuelve un valor; registra los eventos de los botones.
 */
function iniciarControlesProducto(producto) {
    const quantity = { value: 1 };
    const display = document.getElementById("productQuantity");
    const minus = document.getElementById("quantityMinus");
    const plus = document.getElementById("quantityPlus");
    const addButton = document.getElementById("addProductToCart");
    const buyNow = document.getElementById("buyNow");
    const favorite = document.getElementById("productFavorite");

    const actualizarCantidad = () => {
        if (display) display.textContent = quantity.value;
    };

    plus && (plus.onclick = () => {
        quantity.value++;
        actualizarCantidad();
    });

    minus && (minus.onclick = () => {
        if (quantity.value > 1) {
            quantity.value--;
            actualizarCantidad();
        }
    });

    addButton && (addButton.onclick = () => {
        agregarProductoAlCarrito(producto, quantity.value);
        const original = addButton.innerHTML;
        addButton.innerHTML = `<i class="fa-solid fa-check"></i> Agregado al carrito`;
        setTimeout(() => { addButton.innerHTML = original; }, 1500);
    });

    buyNow && (buyNow.onclick = () => {
        agregarProductoAlCarrito(producto, quantity.value);
        window.location.href = "carrito.html";
    });

    favorite && (favorite.onclick = () => {
        const active = favorite.classList.toggle("active");
        const icon = favorite.querySelector("i");
        if (!icon) return;
        icon.classList.toggle("fa-solid", active);
        icon.classList.toggle("fa-regular", !active);
    });
}

/**
 * Obtiene otros productos para la sección de recomendaciones del detalle.
 * - productoActualId: ID del manga abierto, que debe excluirse de la lista.
 * - No devuelve un valor; administra el estado de carga y representa resultados.
 */
async function cargarProductosRelacionados(productoActualId) {
    const grid = document.getElementById("relatedGrid");
    const loading = document.getElementById("relatedLoading");
    const empty = document.getElementById("relatedEmpty");
    if (!grid) return;

    if (loading) loading.style.display = "flex";
    if (empty) empty.style.display = "none";

    try {
        const productos = await apiGetProductos();
        // Primero excluimos el producto que ya está abierto. Después slice(0, 5) toma hasta
        // cinco resultados. Hoy no hay relación por autor o género: son otros productos recientes.
        const relacionados = productos
            .filter((producto) => Number(producto.id) !== Number(productoActualId))
            .slice(0, 5);

        mostrarProductosRelacionados(relacionados);
    } catch (error) {
        console.error("Error al cargar productos relacionados:", error);
        grid.innerHTML = "";
        if (empty) empty.style.display = "block";
    } finally {
        if (loading) loading.style.display = "none";
    }
}

/**
 * Dibuja las tarjetas recibidas en la cuadrícula de recomendados.
 * - productos: array de productos relacionados.
 * - No devuelve un valor.
 */
function mostrarProductosRelacionados(productos) {
    const grid = document.getElementById("relatedGrid");
    const empty = document.getElementById("relatedEmpty");
    if (!grid) return;

    grid.innerHTML = "";

    if (!productos.length) {
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";
    productos.forEach((producto) => {
        grid.appendChild(crearCardRelacionado(producto));
    });
}

/**
 * Construye la tarjeta para un producto recomendado en la página de detalle.
 * - producto: objeto del manga recomendado.
 * - Elemento HTML article con evento de navegación al detalle.
 */
function crearCardRelacionado(producto) {
    const card = document.createElement("article");
    card.className = "related-card";
    card.style.cursor = "pointer";

    const imageContainer = document.createElement("div");
    imageContainer.className = "related-image";

    const image = document.createElement("img");
    image.src = obtenerRutaImagen(producto.imagen);
    image.alt = producto.titulo || "Manga";
    imageContainer.appendChild(image);

    const content = document.createElement("div");
    content.className = "related-content";

    const state = document.createElement("span");
    state.textContent = (normalizarEstado(producto.estado) || "disponible").toUpperCase();

    const title = document.createElement("h3");
    title.textContent = producto.titulo || "Sin título";

    const volume = document.createElement("p");
    volume.textContent = `Tomo ${producto.tomo}`;

    const price = document.createElement("strong");
    price.textContent = formatearPrecio(producto.precio);

    content.append(state, title, volume, price);
    card.append(imageContainer, content);

    card.addEventListener("click", () => {
        window.location.href = `producto.html?id=${producto.id}`;
    });

    return card;
}

/**
 * Atenúa u oculta visualmente el estado de carga del detalle.
 * - mostrar: booleano que indica si está cargando.
 * - No devuelve un valor.
 */
function mostrarCargaProducto(mostrar) {
    const detail = document.getElementById("productDetail");
    if (detail) detail.style.opacity = mostrar ? "0.5" : "1";
}

/**
 * Sustituye el detalle por un aviso de error y un enlace para volver al catálogo.
 * - mensaje: descripción del problema que se mostrará.
 * - No devuelve un valor.
 */
function mostrarErrorProducto(mensaje) {
    const detail = document.getElementById("productDetail");
    if (!detail) return;

    detail.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:100px 20px;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:35px;color:var(--accent);margin-bottom:20px;"></i>
            <h2>No pudimos cargar el producto</h2>
            <p>${mensaje}</p>
            <a href="catalogo.html" class="btn-primary" style="margin-top:20px;">Volver al catálogo</a>
        </div>
    `;
}

/* ========================= CARRITO.HTML ========================= */
// Presenta el contenido guardado en localStorage y conecta los controles de cantidad y eliminación.


/**
 * Inicia el renderizado del carrito y conecta sus acciones generales y buscador.
 * - No recibe parámetros.
 * - No devuelve un valor; solo actúa cuando existe el contenedor del carrito.
 */
function iniciarCarrito() {
    const cartItems = document.getElementById("cartItems");
    if (!cartItems) return;

    renderCarrito();

    document.getElementById("checkoutButton")?.addEventListener("click", () => {
        if (obtenerCarrito().length) {
            alert("La compra estará disponible próximamente.");
        }
    });

    const search = document.getElementById("cartSearch");
    const searchButton = document.getElementById("cartSearchButton");

    const buscar = () => {
        const texto = search?.value.trim();
        if (!texto) return;
        window.location.href = `catalogo.html?search=${encodeURIComponent(texto)}`;
    };

    searchButton?.addEventListener("click", buscar);
    search?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            buscar();
        }
    });
}

/**
 * Lee el carrito guardado, decide si mostrar el estado vacío y calcula cantidades y subtotales.
 * - No recibe parámetros.
 * - No devuelve un valor; reescribe la interfaz y vuelve a enlazar los botones.
 */
function renderCarrito() {
    const container = document.getElementById("cartItems");
    if (!container) return;

    const empty = document.getElementById("emptyCart");
    const count = document.getElementById("cartItemsCount");
    const subtotalElement = document.getElementById("summarySubtotal");
    const shippingElement = document.getElementById("summaryShipping");
    const totalElement = document.getElementById("summaryTotal");

    const carrito = obtenerCarrito();
    actualizarContadorCarrito();

    if (!carrito.length) {
        container.innerHTML = "";
        container.style.display = "none";
        if (empty) empty.style.display = "flex";
        if (count) count.textContent = "0 productos";
        if (subtotalElement) subtotalElement.textContent = "$0";
        if (shippingElement) shippingElement.textContent = "A calcular";
        if (totalElement) totalElement.textContent = "$0";
        return;
    }

    container.style.display = "flex";
    if (empty) empty.style.display = "none";

    // map transforma cada objeto del carrito en un fragmento HTML; join("") concatena los fragmentos.
    // IMPORTANTE: los campos se insertan dentro de HTML. Como localStorage puede modificarse desde
    // el navegador, conviene escapar los datos o crear nodos con textContent para evitar inyección XSS.
    container.innerHTML = carrito
        .map((item, index) => crearItemCarrito(item, index))
        .join("");

    const totalItems = cantidadTotalCarrito(carrito);
    const subtotal = carrito.reduce(
        (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
        0
    );

    if (count) {
        count.textContent = totalItems === 1
            ? "1 producto"
            : `${totalItems} productos`;
    }

    if (subtotalElement) subtotalElement.textContent = formatearPrecio(subtotal);
    if (shippingElement) shippingElement.textContent = "A calcular";
    if (totalElement) totalElement.textContent = formatearPrecio(subtotal);

    configurarBotonesCarritoPagina();
}

/**
 * Genera el HTML de una fila del carrito con controles de cantidad y eliminar.
 * - item: objeto normalizado guardado en el carrito.
 * - index: posición de la fila en el array, usada para identificarla al hacer clic.
 * - Cadena HTML de una fila.
 */
function crearItemCarrito(item, index) {
    const precio = Number(item.price) || 0;
    const cantidad = Number(item.quantity) || 1;

    return `
        <article class="cart-item" data-index="${index}">
            <div class="cart-item-image">
                <img src="${obtenerRutaImagen(item.image)}" alt="${item.title || "Manga"}">
            </div>
            <div class="cart-item-info">
                <span class="cart-item-state">${item.state || "Disponible"}</span>
                <h3>${item.title || "Manga"}</h3>
                <p class="cart-item-volume">${item.volume || ""}</p>
                <span class="cart-item-price">${formatearPrecio(precio)}</span>
            </div>
            <div class="cart-item-controls">
                <div class="cart-quantity">
                    <button type="button" class="quantity-minus" data-index="${index}"><i class="fa-solid fa-minus"></i></button>
                    <span>${cantidad}</span>
                    <button type="button" class="quantity-plus" data-index="${index}"><i class="fa-solid fa-plus"></i></button>
                </div>
                <strong class="cart-item-subtotal">${formatearPrecio(precio * cantidad)}</strong>
                <button type="button" class="cart-remove" data-index="${index}" aria-label="Eliminar producto"><i class="fa-solid fa-trash"></i></button>
            </div>
        </article>
    `;
}

/**
 * Conecta los botones de aumentar, disminuir y eliminar de las filas actuales.
 * - No recibe parámetros.
 * - No devuelve un valor; al cambiar una fila guarda y redibuja el carrito.
 */
function configurarBotonesCarritoPagina() {
    // renderCarrito reemplaza las tarjetas al cambiar cantidades; por eso los botones nuevos necesitan
    // que sus eventos se conecten otra vez después de cada representación.
    document.querySelectorAll(".quantity-minus").forEach((button) => {
        button.addEventListener("click", () => {
            // data-index enlaza el botón con la posición de su fila en el array del carrito.
            // Volvemos a leer el estado antes de cambiarlo y verificamos que esa posición siga existiendo.
            const index = Number(button.dataset.index);
            const carrito = obtenerCarrito();
            if (!carrito[index]) return;
            if (Number(carrito[index].quantity) > 1) carrito[index].quantity--;
            guardarCarrito(carrito);
            renderCarrito();
        });
    });

    document.querySelectorAll(".quantity-plus").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.index);
            const carrito = obtenerCarrito();
            if (!carrito[index]) return;
            carrito[index].quantity++;
            guardarCarrito(carrito);
            renderCarrito();
        });
    });

    document.querySelectorAll(".cart-remove").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.index);
            const carrito = obtenerCarrito();
            carrito.splice(index, 1);
            guardarCarrito(carrito);
            renderCarrito();
        });
    });
}

/* ========================= VENDER ========================= */
// Sincroniza la vista previa del formulario y valida los campos antes de enviar la publicación a Supabase.


/**
 * Conecta el formulario para vender, sincroniza su vista previa y valida los datos antes de publicarlos.
 * - No recibe parámetros; localiza los campos mediante sus ID HTML.
 * - No devuelve un valor; registra eventos de entrada y envío.
 */
function iniciarVender() {
    const form = document.getElementById("sellForm");
    if (!form) return;

    const imageInput = document.getElementById("mangaImage");
    const imagePreview = document.getElementById("imagePreview");
    const title = document.getElementById("mangaTitle");
    const volume = document.getElementById("mangaVolume");
    const state = document.getElementById("mangaState");
    const price = document.getElementById("mangaPrice");
    const description = document.getElementById("mangaDescription");

    const summaryImage = document.getElementById("summaryImage");
    const summaryTitle = document.getElementById("summaryTitle");
    const summaryVolume = document.getElementById("summaryVolume");
    const summaryState = document.getElementById("summaryState");
    const summaryPrice = document.getElementById("summaryPrice");

    title?.addEventListener("input", () => {
        summaryTitle.textContent = title.value.trim() || "Nombre del manga";
    });

    volume?.addEventListener("input", () => {
        summaryVolume.textContent = volume.value.trim()
            ? `Tomo ${volume.value.trim()}`
            : "Tomo -";
    });

    state?.addEventListener("change", () => {
        summaryState.textContent = state.value || "Estado -";
    });

    price?.addEventListener("input", () => {
        summaryPrice.textContent = Number(price.value) > 0
            ? formatearPrecio(price.value)
            : "$0";
    });

    imageInput?.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Por favor seleccioná un archivo de imagen.");
            imageInput.value = "";
            return;
        }

        // Crea una URL temporal local para mostrar una vista previa antes de subir el archivo.
    // No es la URL pública de Storage y no se debe guardar en la columna imagen.
    const url = URL.createObjectURL(file);

        if (imagePreview) {
            imagePreview.innerHTML = `<img src="${url}" alt="Vista previa del manga">`;
            imagePreview.style.display = "block";
        }

        if (summaryImage) {
            summaryImage.innerHTML = `<img src="${url}" alt="Vista previa del manga">`;
        }
    });

    description?.addEventListener("input", () => {
        const counter = description.parentElement?.querySelector(".character-count");
        if (counter) counter.textContent = `${description.value.length}/500 caracteres`;
    });

    form.addEventListener("submit", async (event) => {
        // Evita la recarga tradicional del formulario: la publicación se hará con JavaScript y await.
        event.preventDefault();

        const titulo = title.value.trim();
        const tomo = Number(volume.value);
        const precio = Number(price.value);
        const estado = state.value;
        const descripcion = description.value.trim();

        if (!titulo) {
            alert("Ingresá el título del manga.");
            title.focus();
            return;
        }

        if (!tomo || tomo < 1) {
            alert("Ingresá un número de tomo válido.");
            volume.focus();
            return;
        }

        if (!estado) {
            alert("Seleccioná el estado del manga.");
            state.focus();
            return;
        }

        if (!precio || precio <= 0) {
            alert("Ingresá un precio válido.");
            price.focus();
            return;
        }

        // Creamos un objeto con los datos ya normalizados y validados. La imagen sigue siendo un File,
        // porque primero debe subirse como archivo a Storage y después se guarda su nombre en la tabla.
        const producto = {
            titulo: titulo,
            tomo: tomo,
            precio: precio,
            estado: estado,
            descripcion: descripcion,
            imagen: imageInput?.files?.[0] || null
        };

        try {
            const datos = await apiCrearProducto(producto);

            alert(
                "¡Manga publicado correctamente!\n\n" +
                `ID de publicación: ${datos.id}`
            );

            form.reset();
            summaryTitle.textContent = "Nombre del manga";
            summaryVolume.textContent = "Tomo -";
            summaryState.textContent = "Estado -";
            summaryPrice.textContent = "$0";

            if (summaryImage) {
                summaryImage.innerHTML = `<i class="fa-solid fa-book-open"></i>`;
            }

            if (imagePreview) {
                imagePreview.innerHTML = "";
                imagePreview.style.display = "none";
            }

        } catch (error) {
            if (error.requiereLogin) {
                alert(error.message);
                window.location.href = "./login.html";
                return;
            }
            console.error("Error al publicar el manga:", error);
            alert(`No se pudo publicar el manga.\n\n${error.message}`);
        }
    });
}
