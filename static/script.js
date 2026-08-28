/* =========================================================
   ReManga - script.js refactorizado
   Unifica lógica repetida y organiza todo por funciones.
   ========================================================= */

const API_URL = "http://127.0.0.1:5000";
const CART_KEY = "remangaCart";

/* ========================= INICIO ========================= */

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

function normalizarEstado(estado) {
    return String(estado || "").trim().toLowerCase();
}

function formatearPrecio(precio) {
    return `$${(Number(precio) || 0).toLocaleString("es-AR")}`;
}

function obtenerRutaImagen(imagen) {
    if (!imagen) return "imagenes/onepiece1.webp";

    if (/^https?:\/\//i.test(imagen)) {
        return imagen;
    }

    if (/^img\//i.test(imagen)) {
        return imagen;
    }

    return `${API_URL}/imagenes/${encodeURIComponent(imagen)}`;
}

function obtenerParam(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

function mostrarMensaje(texto, tipo = "success") {
    document.querySelector(".remanga-message")?.remove();

    const mensaje = document.createElement("div");
    mensaje.className = `remanga-message ${tipo}`;
    mensaje.textContent = texto;
    document.body.appendChild(mensaje);

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

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.15 });

    elementos.forEach((elemento) => observer.observe(elemento));
}

/* ========================= API ========================= */

async function apiGetProductos() {
    const respuesta = await fetch(`${API_URL}/api/productos`);
    if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
    const datos = await respuesta.json();
    if (!Array.isArray(datos)) throw new Error("La API no devolvió una lista de productos.");
    return datos;
}

async function apiGetProducto(id) {
    const respuesta = await fetch(`${API_URL}/api/productos/${id}`);
    if (!respuesta.ok) {
        if (respuesta.status === 404) throw new Error("El producto no existe.");
        throw new Error(`Error HTTP: ${respuesta.status}`);
    }
    return await respuesta.json();
}

async function apiCrearProducto(producto) {

    const opciones = {
        method: "POST"
    };

    if (producto instanceof FormData) {

        opciones.body = producto;

    } else {

        opciones.headers = {
            "Content-Type": "application/json"
        };

        opciones.body = JSON.stringify(producto);
    }

    const respuesta =
        await fetch(`${API_URL}/api/productos`, opciones);

    const datos =
        await respuesta.json();

    if (!respuesta.ok) {

        throw new Error(
            datos.error ||
            "No se pudo publicar el manga."
        );
    }

    return datos;
}

/* ========================= CARRITO: BASE ========================= */

function migrarCarritoAntiguo() {
    if (localStorage.getItem(CART_KEY)) return;

    const antiguo = localStorage.getItem("remanga_carrito");
    if (!antiguo) return;

    try {
        const datos = JSON.parse(antiguo);
        if (Array.isArray(datos)) {
            localStorage.setItem(CART_KEY, JSON.stringify(datos));
        }
    } catch (error) {
        console.error("No se pudo migrar el carrito anterior:", error);
    }
}

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

function guardarCarrito(carrito) {
    localStorage.setItem(CART_KEY, JSON.stringify(carrito));
}

function cantidadTotalCarrito(carrito) {
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

    const existente = carrito.find(
        (item) => Number(item.id) === id
    );

    const normalizado = {
        id: producto.id,
        title: producto.titulo ?? producto.title ?? "Manga",
        volume: producto.tomo ?? producto.volume ?? "",
        price: Number(producto.precio ?? producto.price ?? 0),
        image: obtenerRutaImagen(producto.imagen ?? producto.image ?? ""),
        state: producto.estado ?? producto.state ?? "",
        quantity: Number(cantidad) || 1
    };

    if (existente) {
        existente.quantity = Number(existente.quantity || 0) + normalizado.quantity;
    } else {
        carrito.push(normalizado);
    }

    guardarCarrito(carrito);
    actualizarContadorCarrito();
}

/* ========================= HOME ========================= */

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

function mostrarProductosFiltrados() {
    const texto = obtenerTextoBusquedaCatalogo();
    const maxPrecio = obtenerPrecioMaximoCatalogo();
    const estados = obtenerEstadosCatalogo();

    let productos = productosCatalogo.filter((producto) => {
        const nombre = String(producto.titulo || "").trim().toLowerCase();
        const estado = normalizarEstado(producto.estado);
        const precio = Number(producto.precio) || 0;

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

async function iniciarProducto() {
    const detail = document.getElementById("productDetail");
    if (!detail) return;

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
    const dataTitle = document.getElementById("dataTitle");
    const dataVolume = document.getElementById("dataVolume");
    const dataState = document.getElementById("dataState");

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
    if (dataTitle) dataTitle.textContent = producto.titulo || "-";
    if (dataVolume) dataVolume.textContent = producto.tomo ?? "-";
    if (dataState) dataState.textContent = producto.estado || "-";

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

    iniciarPestanasProducto();
}

function iniciarPestanasProducto() {
    const tabs = document.querySelectorAll(".product-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");
        });
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
        const relacionados = productos
            .filter((producto) => Number(producto.id) !== Number(productoActualId))
            .slice(0, 3);

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
    document.querySelectorAll(".quantity-minus").forEach((button) => {
        button.addEventListener("click", () => {
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

        const producto = new FormData();

        producto.append("titulo", titulo);
        producto.append("tomo", tomo);
        producto.append("precio", precio);
        producto.append("estado", estado);
        producto.append("descripcion", descripcion);

        if (
            imageInput &&
            imageInput.files &&
            imageInput.files.length > 0
        ) {
            producto.append("imagen", imageInput.files[0]);
        }

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
            console.error("Error al conectar con la API:", error);
            alert(`No se pudo publicar el manga.\n\n${error.message}`);
        }
    });
}
