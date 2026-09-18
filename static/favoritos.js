// =========================================================
// ReManga - Favoritos
// Persistencia local por usuario y funcionamiento para invitados.
// Más adelante esta capa puede migrarse a Supabase para sincronizar
// favoritos entre dispositivos.
// =========================================================

(function () {
    var FAVORITES_PREFIX = "remangaFavorites:";
    var GUEST_KEY = FAVORITES_PREFIX + "guest";

    var favoriteKey = GUEST_KEY;
    var favoriteIds = new Set();
    var productosCache = [];
    var initialized = false;

    function obtenerApiUrl() {
        if (typeof REMANGA_API_URL !== "undefined") {
            return REMANGA_API_URL;
        }

        return window.location.origin.replace(/\/$/, "");
    }

    async function obtenerClaveFavoritos() {
        var config = window.REMANGA_SUPABASE_CONFIG;

        if (!(config && config.enabled && window.supabase && config.url && config.anonKey)) {
            return GUEST_KEY;
        }

        try {
            var client = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });

            var resultado = await client.auth.getSession();
            var userId = resultado && resultado.data && resultado.data.session &&
                resultado.data.session.user ? resultado.data.session.user.id : null;

            return userId ? FAVORITES_PREFIX + userId : GUEST_KEY;
        } catch (error) {
            console.warn("No se pudo identificar la cuenta para favoritos:", error);
            return GUEST_KEY;
        }
    }

    function cargarFavoritos() {
        try {
            var datos = JSON.parse(localStorage.getItem(favoriteKey) || "[]");

            favoriteIds = Array.isArray(datos)
                ? new Set(datos.map(function (id) { return String(id); }).filter(Boolean))
                : new Set();
        } catch (error) {
            console.warn("No se pudieron cargar los favoritos:", error);
            favoriteIds = new Set();
        }
    }

    function guardarFavoritos() {
        localStorage.setItem(favoriteKey, JSON.stringify(Array.from(favoriteIds)));
    }

    function esFavorito(id) {
        return favoriteIds.has(String(id));
    }

    function configurarEstadoBoton(button) {
        if (!button) return;

        var id = button.dataset.productId;
        if (!id) return;

        var activo = esFavorito(id);
        var icon = button.querySelector("i");

        button.classList.toggle("active", activo);
        button.setAttribute(
            "aria-label",
            activo ? "Quitar de favoritos" : "Agregar a favoritos"
        );

        if (icon) {
            icon.classList.toggle("fa-solid", activo);
            icon.classList.toggle("fa-regular", !activo);
        }
    }

    function actualizarBotonesFavoritos() {
        document
            .querySelectorAll(".favorite-button, #productFavorite")
            .forEach(configurarEstadoBoton);
    }

    function mostrarAviso(texto) {
        if (typeof window.mostrarMensaje === "function") {
            window.mostrarMensaje(texto, "success");
            return;
        }

        var aviso = document.querySelector(".favorites-message");

        if (!aviso) {
            aviso = document.createElement("div");
            aviso.className = "favorites-message";
            document.body.appendChild(aviso);
        }

        aviso.textContent = texto;
        aviso.classList.add("show");

        clearTimeout(aviso._timer);
        aviso._timer = setTimeout(function () {
            aviso.classList.remove("show");
        }, 2200);
    }

    function obtenerPrecioFormateado(precio) {
        return "$" + (Number(precio) || 0).toLocaleString("es-AR");
    }

    function resolverIdDesdeTarjeta(card) {
        if (!card) return null;

        if (card.dataset.productId) {
            return String(card.dataset.productId);
        }

        var title = (card.querySelector("h3")?.textContent || "").trim().toLowerCase();
        var volume = (card.querySelector(".volume")?.textContent || "").trim().toLowerCase();
        var price = (card.querySelector(".product-bottom strong")?.textContent || "").trim();

        var producto = productosCache.find(function (item) {
            var itemTitle = String(item.titulo || "").trim().toLowerCase();
            var itemVolume = ("Tomo " + item.tomo).trim().toLowerCase();
            var itemPrice = obtenerPrecioFormateado(item.precio);

            return itemTitle === title && itemVolume === volume && itemPrice === price;
        });

        if (!producto) return null;

        card.dataset.productId = String(producto.id);
        return String(producto.id);
    }

    function alternarFavorito(id) {
        var key = String(id);

        if (favoriteIds.has(key)) {
            favoriteIds.delete(key);
            guardarFavoritos();
            actualizarBotonesFavoritos();
            renderizarFavoritosPerfil();
            mostrarAviso("Manga eliminado de favoritos.");
            return;
        }

        favoriteIds.add(key);
        guardarFavoritos();
        actualizarBotonesFavoritos();
        renderizarFavoritosPerfil();
        mostrarAviso("Manga agregado a favoritos.");
    }

    async function cargarProductos() {
        try {
            var respuesta = await fetch(obtenerApiUrl() + "/api/productos");
            if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

            var datos = await respuesta.json();
            productosCache = Array.isArray(datos) ? datos : [];
        } catch (error) {
            console.warn("No se pudieron cargar los productos para favoritos:", error);
            productosCache = [];
        }
    }

    function prepararTarjetasCatalogo() {
        document.querySelectorAll(".catalog-card").forEach(function (card) {
            var id = resolverIdDesdeTarjeta(card);
            var button = card.querySelector(".favorite-button");

            if (button && id) {
                button.dataset.productId = id;
                configurarEstadoBoton(button);
            }
        });
    }

    function prepararFavoritoProducto() {
        var button = document.getElementById("productFavorite");
        if (!button) return;

        var id = new URLSearchParams(window.location.search).get("id");
        if (!id) return;

        button.dataset.productId = id;
        configurarEstadoBoton(button);
    }

    function crearTarjetaFavorito(producto) {
        var card = document.createElement("article");
        card.className = "profile-favorite-card";

        var image = document.createElement("img");
        image.src = producto.imagen || "";
        image.alt = producto.titulo || "Manga";

        var content = document.createElement("div");
        content.className = "profile-favorite-content";

        var state = document.createElement("span");
        state.className = "profile-favorite-state";
        state.textContent = String(producto.estado || "Disponible").toUpperCase();

        var title = document.createElement("h3");
        title.textContent = producto.titulo || "Sin título";

        var volume = document.createElement("p");
        volume.textContent = "Tomo " + (producto.tomo == null ? "-" : producto.tomo);

        var price = document.createElement("strong");
        price.textContent = obtenerPrecioFormateado(producto.precio);

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "favorite-remove";
        remove.dataset.productId = String(producto.id);
        remove.setAttribute("aria-label", "Quitar de favoritos");
        remove.innerHTML = '<i class="fa-solid fa-heart"></i>';

        content.append(state, title, volume, price);
        card.append(image, content, remove);

        card.addEventListener("click", function (event) {
            if (event.target.closest(".favorite-remove")) return;
            window.location.href = "producto.html?id=" + producto.id;
        });

        return card;
    }

    function renderizarFavoritosPerfil() {
        var grid = document.getElementById("favoriteProducts");
        var empty = document.getElementById("favoriteEmpty");
        var count = document.getElementById("favoriteCount");

        if (!grid) return;

        var productosFavoritos = productosCache.filter(function (producto) {
            return favoriteIds.has(String(producto.id));
        });

        grid.innerHTML = "";

        if (count) {
            count.textContent = productosFavoritos.length;
        }

        if (!productosFavoritos.length) {
            grid.style.display = "none";
            if (empty) empty.style.display = "flex";
            return;
        }

        if (empty) empty.style.display = "none";
        grid.style.display = "grid";

        productosFavoritos.forEach(function (producto) {
            grid.appendChild(crearTarjetaFavorito(producto));
        });
    }

    function manejarClickFavorito(event) {
        var button = event.target.closest(
            ".favorite-button, #productFavorite, .favorite-remove"
        );

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        var id = button.dataset.productId;

        if (!id) {
            id = resolverIdDesdeTarjeta(button.closest(".catalog-card"));

            if (id) {
                button.dataset.productId = id;
            }
        }

        if (!id) {
            id = new URLSearchParams(window.location.search).get("id");
        }

        if (!id) {
            mostrarAviso("No se pudo identificar el manga.");
            return;
        }

        alternarFavorito(id);
    }

    async function inicializar() {
        if (initialized) return;
        initialized = true;

        favoriteKey = await obtenerClaveFavoritos();
        cargarFavoritos();
        await cargarProductos();

        prepararTarjetasCatalogo();
        prepararFavoritoProducto();
        actualizarBotonesFavoritos();
        renderizarFavoritosPerfil();

        document.addEventListener("click", manejarClickFavorito, true);

        var observer = new MutationObserver(function () {
            prepararTarjetasCatalogo();
            prepararFavoritoProducto();
            actualizarBotonesFavoritos();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    document.addEventListener("DOMContentLoaded", inicializar);
})();