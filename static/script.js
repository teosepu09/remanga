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


function normalizarEstado(estado) {
    return String(estado || "").trim().toLowerCase();
}

function formatearPrecio(precio) {
    return `$${(Number(precio) || 0).toLocaleString("es-AR")}`;
}

function obtenerRutaImagen(imagen) {
    // El campo de imagen puede guardar tres formatos: vacío, una URL completa, una ruta local
    // del repositorio o el nombre de un objeto dentro de Supabase Storage.
    if (!imagen) return "static/isotipo sin fondo.png";

    // Una URL que empieza con http:// o https:// ya contiene el host y la ruta completos.
    if (/^https?:\/\//i.test(imagen)) {
        return imagen;
    }

    // Si comienza con img/, static/ o imagenes/, se considera una ruta del propio sitio.
    if (/^(img|static|imagenes)\//i.test(imagen)) {
        return imagen;
    }

    // Si solo quedó el nombre (por ejemplo "naruto1.webp"), construimos la URL pública de Storage.
    // encodeURIComponent evita que espacios y otros caracteres rompan el último segmento de la URL.
    const config = window.REMANGA_SUPABASE_CONFIG;
    if (config?.enabled && config.url && config.bucket) {
        return config.url.replace(/\/$/, "") + "/storage/v1/object/public/" + config.bucket + "/" + encodeURIComponent(imagen);
    }

    return "static/isotipo sin fondo.png";
}

function obtenerParam(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

function mostrarMensaje(texto, tipo = "success") {
    // Se quita el aviso anterior antes de crear otro, para que no se apilen notificaciones.
    // El ?. permite ejecutar remove() solo si el selector encontró un elemento.
    document.querySelector(".remanga-message")?.remove();

    const mensaje = document.createElement("div");
    mensaje.className = `remanga-message ${tipo}`;
    // textContent inserta el mensaje como texto, sin interpretar etiquetas HTML.
    mensaje.textContent = texto;
    document.body.appendChild(mensaje);

    // Aplicamos "show" en el siguiente ciclo de pintura para que el navegador pueda animar
    // desde el estado inicial hasta el estado visible.
    requestAnimationFrame(() => mensaje.classList.add("show"));
    setTimeout(() => {
        mensaje.classList.remove("show");
        setTimeout(() => mensaje.remove(), 300);
    }, 3000);
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ========================= HEADER ========================= */
// Comportamiento compartido de la cabecera; algunas páginas pueden no tener todos sus elementos.


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


function iniciarBuscador() {
    document.querySelectorAll(".search-box").forEach((box) => {
        const input = box.querySelector("input");
        const button = box.querySelector("button");
        if (!input || !button) return;

        const buscar = () => {
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
function obtenerClienteSupabaseDatos() {
    // Guardamos el cliente en una variable compartida y lo reutilizamos durante esta carga de página.
    // Evita crear repetidamente clientes con la misma URL y la misma sesión.
    if (remangaSupabaseClient) return remangaSupabaseClient;

    const config = window.REMANGA_SUPABASE_CONFIG;

    // Necesitamos tres piezas: configuración habilitada, librería cargada y URL/clave publicable.
    // La clave del navegador nunca debe ser una service_role key ni otro secreto del servidor.
    if (!(config?.enabled && window.supabase && config.url && config.publishableKey)) {
        return null;
    }

    try {
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
async function apiGetProductos() {
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // Consulta encadenada: tabla productos -> columnas necesarias -> ordenar por id descendente.
    // ascending:false quiere decir que los id más altos aparecen primero.
    // await espera la respuesta de Supabase sin congelar toda la interfaz; data y error se separan
    // mediante desestructuración del objeto de respuesta.
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
async function apiGetProducto(id) {
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // eq("id", id) agrega el filtro equivalente a WHERE id = idBuscado.
    // maybeSingle espera cero o una fila: si no existe, data queda vacío y podemos mostrar
    // un mensaje propio; si hubiera más de una fila para un id, Supabase devolvería un error.
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


async function obtenerSesionActual() {
    const supabaseClient = obtenerClienteSupabaseDatos();
    if (!supabaseClient) return null;

    try {
        const { data } = await supabaseClient.auth.getSession();
        return data?.session || null;
    } catch (error) {
        console.warn("No se pudo leer la sesión:", error);
        return null;
    }
}

function nombreImagenUnico(archivo) {
    // split(".") separa el nombre por puntos y pop() toma la última parte como extensión.
    // Sumamos milisegundos actuales y una cadena aleatoria para reducir choques de nombres.
    // La aleatoriedad solo ayuda a distinguir archivos; no es criptográfica ni un mecanismo de seguridad.
    const extension = (archivo.name.split(".").pop() || "jpg").toLowerCase();
    const aleatorio = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${aleatorio}.${extension}`;
}

// Sube el archivo seleccionado a Supabase Storage y obtiene la ruta que se guardará con el producto.
async function subirImagenProducto(archivo) {
    const supabaseClient = obtenerClienteSupabaseDatos();
    const config = window.REMANGA_SUPABASE_CONFIG;

    if (!supabaseClient || !config?.bucket) {
        throw new Error("No se pudo conectar con el almacenamiento de imágenes.");
    }

    const nombre = nombreImagenUnico(archivo);

    // storage.from(bucket) selecciona el bucket; upload(nombre, archivo) envía el archivo binario.
    // contentType comunica su formato MIME. upsert:false impide reemplazar otro archivo del mismo nombre.
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
async function apiCrearProducto(producto) {
    const supabaseClient = obtenerClienteSupabaseDatos();

    if (!supabaseClient) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    // Primero comprobamos quién publica. Esta validación mejora la experiencia, pero no es una
    // barrera de seguridad suficiente por sí sola: las políticas RLS de Supabase también deben
    // impedir inserciones no autorizadas.
    const sesion = await obtenerSesionActual();

    if (!sesion?.user) {
        const aviso = new Error("Tenés que iniciar sesión para publicar un manga.");
        aviso.requiereLogin = true;
        throw aviso;
    }

    let nombreImagen = "";
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
function obtenerCarrito() {
    migrarCarritoAntiguo();
    const datos = localStorage.getItem(CART_KEY);
    if (!datos) return [];

    try {
        const carrito = JSON.parse(datos);
        return Array.isArray(carrito) ? carrito : [];
    } catch (error) {
        console.error("No se pudo leer el carrito:", error);
        return [];
    }
}

// Serializa el array del carrito para poder recuperarlo cuando el usuario cambie de página.
function guardarCarrito(carrito) {
    localStorage.setItem(CART_KEY, JSON.stringify(carrito));
}

function cantidadTotalCarrito(carrito) {
    // reduce recorre cada fila y acumula las unidades. Ejemplo: cantidades 2 + 1 + 3 = 6.
    // El 0 del final es el valor inicial del acumulador "total".
    return carrito.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );
}

function actualizarContadorCarrito() {
    const contadores = document.querySelectorAll(".cart-counter");
    if (!contadores.length) return;

    const total = cantidadTotalCarrito(obtenerCarrito());
    contadores.forEach((contador) => {
        contador.textContent = total;
        contador.style.display = total > 0 ? "flex" : "none";
    });
}

function agregarProductoAlCarrito(producto, cantidad = 1) {
    const carrito = obtenerCarrito();
    const id = Number(producto.id);

    // find devuelve la primera fila cuyo id coincide; si no encuentra ninguna, devuelve undefined.
    // Convertimos ambos id a Number para que "12" y 12 se consideren el mismo producto.
    const existente = carrito.find(
        (item) => Number(item.id) === id
    );

    // Las páginas pueden entregar nombres de propiedades distintos: titulo/tomo/precio o
    // title/volume/price. Este objeto traduce las variantes a un único formato interno del carrito.
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

function aplicarBusquedaInicialCatalogo() {
    const search = obtenerParam("search");
    if (!search) return;

    const filtro = document.getElementById("filterSearch");
    const header = document.getElementById("catalogSearch");
    if (filtro) filtro.value = search;
    if (header) header.value = search;
}

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

function mostrarProductos(productos) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    grid.innerHTML = "";
    productos.forEach((producto) => {
        grid.appendChild(crearCardProducto(producto));
    });
}

function obtenerTextoBusquedaCatalogo() {
    return (
        document.getElementById("filterSearch")?.value || ""
    ).trim().toLowerCase();
}

function obtenerPrecioMaximoCatalogo() {
    const filtro = document.getElementById("priceFilter");
    return filtro ? Number(filtro.value) : Infinity;
}

function obtenerEstadosCatalogo() {
    const estados = [];
    if (document.getElementById("filterNuevo")?.checked) estados.push("nuevo");
    if (document.getElementById("filterUsado")?.checked) estados.push("usado");
    return estados;
}

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

function configurarFiltrosCatalogo() {
    [
        document.getElementById("filterNuevo"),
        document.getElementById("filterUsado")
    ].filter(Boolean).forEach((filtro) => {
        filtro.addEventListener("change", mostrarProductosFiltrados);
    });
}

function configurarPrecioCatalogo() {
    const filtro = document.getElementById("priceFilter");
    const display = document.getElementById("priceDisplay");
    if (!filtro) return;

    filtro.addEventListener("input", () => {
        if (display) display.textContent = formatearPrecio(filtro.value);
        mostrarProductosFiltrados();
    });
}

function configurarOrdenamientoCatalogo() {
    document.getElementById("sortProducts")
        ?.addEventListener("change", mostrarProductosFiltrados);
}

function actualizarContadorResultados(cantidad) {
    const contador = document.getElementById("resultsCount");
    if (!contador) return;
    contador.textContent = cantidad === 1
        ? "1 producto encontrado"
        : `${cantidad} productos encontrados`;
}

function mostrarSinResultados(cantidad) {
    const mensaje = document.getElementById("noResults");
    if (!mensaje) return;
    mensaje.classList.toggle("show", cantidad === 0);
}

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

function configurarLimpiarFiltros() {
    document.getElementById("clearFilters")
        ?.addEventListener("click", limpiarFiltros);
}

function configurarResetResultados() {
    document.getElementById("resetSearch")
        ?.addEventListener("click", limpiarFiltros);
}

function mostrarCargaCatalogo(mostrar) {
    const loading = document.getElementById("catalogLoading");
    if (loading) loading.style.display = mostrar ? "flex" : "none";
}

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

function mostrarCargaProducto(mostrar) {
    const detail = document.getElementById("productDetail");
    if (detail) detail.style.opacity = mostrar ? "0.5" : "1";
}

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
