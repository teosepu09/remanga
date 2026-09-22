// =========================================================
// ReManga - Favoritos
// Favoritos por cuenta en Supabase + favoritos de invitado en localStorage.
// =========================================================

(function () {
    var FAVORITES_PREFIX = "remangaFavorites:";
    var GUEST_KEY = FAVORITES_PREFIX + "guest";
    var TABLE = "favoritos";

    var favoriteKey = GUEST_KEY;
    var favoriteIds = new Set();
    var productosCache = [];
    var initialized = false;
    var supabaseClient = null;
    var currentUser = null;
    var usingDatabase = false;

    function obtenerApiUrl() {
        if (typeof REMANGA_API_URL !== "undefined") {
            return REMANGA_API_URL;
        }

        return window.location.origin.replace(/\/$/, "");
    }

    function crearClienteSupabase() {
        var config = window.REMANGA_SUPABASE_CONFIG;

        if (!(config && config.enabled && window.supabase && config.url && config.anonKey)) {
            return null;
        }

        try {
            return window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        } catch (error) {
            console.warn("No se pudo crear el cliente de Supabase para favoritos:", error);
            return null;
        }
    }

    async function identificarUsuario() {
        supabaseClient = crearClienteSupabase();

        if (!supabaseClient) {
            usingDatabase = false;
            currentUser = null;
            favoriteKey = GUEST_KEY;
            return;
        }

        try {
            var resultado = await supabaseClient.auth.getSession();
            var session = resultado && resultado.data ? resultado.data.session : null;

            if (!session || !session.user) {
                usingDatabase = false;
                currentUser = null;
                favoriteKey = GUEST_KEY;
                return;
            }

            currentUser = session.user;
            usingDatabase = true;
            favoriteKey = FAVORITES_PREFIX + currentUser.id;
        } catch (error) {
            console.warn("No se pudo identificar la sesión para favoritos:", error);
            usingDatabase = false;
            currentUser = null;
            favoriteKey = GUEST_KEY;
        }
    }

    function cargarFavoritosLocales() {
        try {
            var datos = JSON.parse(localStorage.getItem(favoriteKey) || "[]");

            favoriteIds = Array.isArray(datos)
                ? new Set(datos.map(function (id) { return String(id); }).filter(Boolean))
                : new Set();
        } catch (error) {
            console.warn("No se pudieron cargar los favoritos locales:", error);
            favoriteIds = new Set();
        }
    }

    function obtenerFavoritosLocalesDeUsuario() {
        if (!currentUser) return [];

        try {
            var datos = JSON.parse(
                localStorage.getItem(FAVORITES_PREFIX + currentUser.id) || "[]"
            );

            return Array.isArray(datos)
                ? Array.from(new Set(datos.map(function (id) { return String(id); }).filter(Boolean)))
                : [];
        } catch (error) {
            return [];
        }
    }

    function guardarFavoritosLocales() {
        localStorage.setItem(
            favoriteKey,
            JSON.stringify(Array.from(favoriteIds))
        );
    }

    async function cargarFavoritosDesdeSupabase() {
        if (!usingDatabase || !supabaseClient || !currentUser) {
            cargarFavoritosLocales();
            return;
        }

        try {
            var resultado = await supabaseClient
                .from(TABLE)
                .select("producto_id")
                .eq("user_id", currentUser.id);

            if (resultado.error) {
                throw resultado.error;
            }

            favoriteIds = new Set(
                (resultado.data || []).map(function (row) {
                    return String(row.producto_id);
                })
            );

            await migrarFavoritosLocales();
        } catch (error) {
            console.error("Error al cargar favoritos desde Supabase:", error);
            mostrarAviso("No se pudieron cargar tus favoritos guardados.", "error");
            favoriteIds = new Set();
        }
    }

    async function migrarFavoritosLocales() {
        var locales = obtenerFavoritosLocalesDeUsuario();

        if (!locales.length || !currentUser || !supabaseClient) {
            return;
        }

        var productosValidos = locales.filter(function (id) {
            return productosCache.some(function (producto) {
                return String(producto.id) === String(id);
            });
        });

        if (!productosValidos.length) {
            localStorage.removeItem(FAVORITES_PREFIX + currentUser.id);
            return;
        }

        var huboError = false;

        for (var i = 0; i < productosValidos.length; i++) {
            var productoId = Number(productosValidos[i]);

            if (favoriteIds.has(String(productoId))) {
                continue;
            }

            var resultado = await supabaseClient
                .from(TABLE)
                .insert({
                    user_id: currentUser.id,
                    producto_id: productoId
                });

            if (resultado.error && resultado.error.code !== "23505") {
                huboError = true;
                console.warn("No se pudo migrar el favorito " + productoId + ":", resultado.error);
                break;
            }

            favoriteIds.add(String(productoId));
        }

        if (!huboError) {
            localStorage.removeItem(FAVORITES_PREFIX + currentUser.id);
        }
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
        button.title = activo ? "Quitar de favoritos" : "Agregar a favoritos";

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

    function mostrarAviso(texto, tipo) {
        if (typeof window.mostrarMensaje === "function") {
            window.mostrarMensaje(texto, tipo || "success");
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

    async function agregarFavoritoSupabase(id) {
        var resultado = await supabaseClient
            .from(TABLE)
            .insert({
                user_id: currentUser.id,
                producto_id: Number(id)
            });

        if (resultado.error && resultado.error.code !== "23505") {
            throw resultado.error;
        }
    }

    async function eliminarFavoritoSupabase(id) {
        var resultado = await supabaseClient
            .from(TABLE)
            .delete()
            .eq("user_id", currentUser.id)
            .eq("producto_id", Number(id));

        if (resultado.error) {
            throw resultado.error;
        }
    }

    async function alternarFavorito(id) {
        var key = String(id);
        var activoAntes = favoriteIds.has(key);

        // Actualizamos después de confirmar la operación remota cuando la cuenta
        // está conectada a Supabase. Así la interfaz no muestra un estado falso.
        try {
            if (usingDatabase && supabaseClient && currentUser) {
                if (activoAntes) {
                    await eliminarFavoritoSupabase(id);
                    favoriteIds.delete(key);
                    mostrarAviso("Manga eliminado de favoritos.");
                } else {
                    await agregarFavoritoSupabase(id);
                    favoriteIds.add(key);
                    mostrarAviso("Manga agregado a favoritos.");
                }
            } else {
                if (activoAntes) {
                    favoriteIds.delete(key);
                    mostrarAviso("Manga eliminado de favoritos.");
                } else {
                    favoriteIds.add(key);
                    mostrarAviso("Manga agregado a favoritos.");
                }

                guardarFavoritosLocales();
            }

            actualizarBotonesFavoritos();
            renderizarFavoritosPerfil();
        } catch (error) {
            console.error("No se pudo modificar el favorito:", error);
            mostrarAviso(
                "No se pudo guardar el favorito. Revisá tu sesión y conexión.",
                "error"
            );
        }
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

    function prepararTarjetasHome() {
        document.querySelectorAll(".card").forEach(function (card) {
            var button = card.querySelector(".home-favorite-button, .favorite-button");

            if (!button || button.dataset.productId) {
                if (button) configurarEstadoBoton(button);
                return;
            }

            var cards = document.querySelectorAll("#homeProducts .card");
            var indice = Array.prototype.indexOf.call(cards, card);
            var producto = productosCache[indice];

            if (producto) {
                button.dataset.productId = String(producto.id);
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
        remove.title = "Quitar de favoritos";
        remove.innerHTML = '<i class="fa-solid fa-heart"></i>';

        content.append(state, title, volume, price);
        card.append(image, content, remove);

        card.addEventListener("click", function (event) {
            if (event.target.closest(".favorite-remove")) return;
            window.location.href = "producto.html?id=" + producto.id;
        });

        return card;
    }

    function actualizarContadorPerfil(cantidad) {
        var count = document.getElementById("favoriteCount");
        var label = document.getElementById("favoriteCountLabel");

        if (count) count.textContent = cantidad;
        if (label) label.textContent = cantidad;
    }

    function renderizarFavoritosPerfil() {
        var grid = document.getElementById("favoriteProducts");
        var empty = document.getElementById("favoriteEmpty");

        if (!grid) return;

        var productosFavoritos = productosCache.filter(function (producto) {
            return favoriteIds.has(String(producto.id));
        });

        grid.innerHTML = "";
        actualizarContadorPerfil(productosFavoritos.length);

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
            mostrarAviso("No se pudo identificar el manga.", "error");
            return;
        }

        alternarFavorito(id);
    }

    async function inicializar() {
        if (initialized) return;
        initialized = true;

        await identificarUsuario();
        await cargarProductos();

        if (usingDatabase) {
            await cargarFavoritosDesdeSupabase();
        } else {
            cargarFavoritosLocales();
        }

        prepararTarjetasCatalogo();
        prepararTarjetasHome();
        prepararFavoritoProducto();
        actualizarBotonesFavoritos();
        renderizarFavoritosPerfil();

        document.addEventListener("click", manejarClickFavorito, true);

        if (document.body) {
            var observer = new MutationObserver(function () {
                prepararTarjetasCatalogo();
                prepararTarjetasHome();
                prepararFavoritoProducto();
                actualizarBotonesFavoritos();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        if (supabaseClient) {
            supabaseClient.auth.onAuthStateChange(async function (event, session) {
                var nuevoUserId = session && session.user ? session.user.id : null;
                var actualUserId = currentUser ? currentUser.id : null;

                if (nuevoUserId === actualUserId) return;

                currentUser = session ? session.user : null;
                usingDatabase = !!currentUser;
                favoriteKey = currentUser
                    ? FAVORITES_PREFIX + currentUser.id
                    : GUEST_KEY;

                if (usingDatabase) {
                    await cargarFavoritosDesdeSupabase();
                } else {
                    cargarFavoritosLocales();
                }

                actualizarBotonesFavoritos();
                renderizarFavoritosPerfil();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", inicializar);
})();