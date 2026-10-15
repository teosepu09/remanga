// =========================================================
// ReManga - Favoritos
// Favoritos por cuenta en Supabase + favoritos de invitado en localStorage.
// =========================================================

// Este módulo se encapsula en una función para no llenar el ámbito global con variables auxiliares.
// Los favoritos de invitados se guardan localmente; los de una cuenta se sincronizan con Supabase.
(function () {
    var FAVORITES_PREFIX = "remangaFavorites:";
    var GUEST_KEY = FAVORITES_PREFIX + "guest";
    var TABLE = "favoritos";

    // favoriteKey indica dónde se guarda la lista local según el visitante o usuario autenticado.
    // Set mantiene IDs únicos: agregar dos veces el mismo ID no duplica el favorito.
    var favoriteKey = GUEST_KEY;
    var favoriteIds = new Set();
    var productosCache = [];
    var initialized = false;
    var supabaseClient = null;
    var currentUser = null;
    var usingDatabase = false;

    // Prepara un cliente de Supabase solo si la configuración pública está disponible y activada.
/**
 * Crea el cliente de Supabase solo si la configuración pública y la librería están disponibles.
 * - No recibe parámetros.
 * - Cliente reutilizable o null si no se puede conectar.
 */
function crearClienteSupabase() {
        var config = window.REMANGA_SUPABASE_CONFIG;

        if (!(config && config.enabled && window.supabase && config.url && config.publishableKey)) {
            return null;
        }

        try {
            return window.supabase.createClient(config.url, config.publishableKey, {
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

    // Determina si hay una sesión real; esa decisión define si usamos la tabla remota o el almacenamiento local.
/**
 * Lee la sesión actual y decide si los favoritos se gestionan para invitado o usuario autenticado.
 * - No recibe parámetros.
 * - Actualiza currentUser, favoriteKey y usingDatabase.
 */
async function identificarUsuario() {
        supabaseClient = crearClienteSupabase();

        if (!supabaseClient) {
            usingDatabase = false;
            currentUser = null;
            favoriteKey = GUEST_KEY;
            return;
        }

        try {
            // getSession lee la sesión que el SDK conserva; no valida una contraseña manualmente.
            // Esperamos la respuesta porque la inicialización depende de saber quién es el usuario.
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

    // Lee y reconstruye la lista de identificadores guardada en localStorage.
/**
 * Lee los IDs desde localStorage y los convierte en un Set para evitar duplicados.
 * - No recibe parámetros.
 * - Actualiza favoriteIds.
 */
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

    /**
     * Recupera los favoritos locales guardados para la cuenta identificada.
     * - No recibe parámetros.
     * - Devuelve un array de IDs.
     */
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

    /**
     * Serializa favoriteIds a JSON y lo guarda en la clave local activa.
     * - No recibe parámetros.
     * - No devuelve valor.
     */
    function guardarFavoritosLocales() {
        localStorage.setItem(
            favoriteKey,
            JSON.stringify(Array.from(favoriteIds))
        );
    }

    // Consulta los favoritos vinculados al usuario autenticado.
/**
 * Consulta la tabla favoritos y reconstruye los IDs del usuario actual.
 * - No recibe parámetros.
 * - Actualiza favoriteIds o informa un error.
 */
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

            // La tabla devuelve filas { producto_id: ... }. map extrae cada ID y String normaliza
            // tipos numéricos/textuales; Set elimina duplicados y permite consultar con .has() rápido.
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

    // Si el visitante inicia sesión, intenta trasladar sus favoritos locales a su cuenta.
/**
 * Importa a la cuenta los favoritos locales válidos cuando el usuario inicia sesión.
 * - No recibe parámetros.
 * - Inserta los registros que falten.
 */
async function migrarFavoritosLocales() {
        var locales = obtenerFavoritosLocalesDeUsuario();

        if (!locales.length || !currentUser || !supabaseClient) {
            return;
        }

        // No migramos IDs a ciegas: solo se copian los que todavía existen en productosCache.
        // Esto evita intentar guardar favoritos de publicaciones borradas.
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

            // PostgreSQL 23505 significa violación de unicidad: el favorito ya existe.
            // Ese caso no se trata como fallo de migración; otros errores sí detienen el proceso.
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

    /**
     * Comprueba si el conjunto actual contiene el ID indicado.
     * - id: identificador del producto.
     * - Devuelve true o false.
     */
    function esFavorito(id) {
        return favoriteIds.has(String(id));
    }

    /**
     * Actualiza el aspecto y los atributos del botón según si el producto es favorito.
     * - button: elemento HTML del botón.
     * - No devuelve valor.
     */
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

    /**
     * Sincroniza todos los botones visibles con el estado de favoriteIds.
     * - No recibe parámetros.
     * - No devuelve valor.
     */
    function actualizarBotonesFavoritos() {
        document
            .querySelectorAll(".favorite-button, #productFavorite")
            .forEach(configurarEstadoBoton);
    }

    /**
     * Muestra una notificación para comunicar el resultado de una acción.
     * - texto: mensaje; tipo: categoría visual.
     * - No devuelve valor.
     */
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

    /**
     * Normaliza un precio para mostrarlo en las tarjetas.
     * - precio: valor de precio.
     * - Devuelve texto formateado.
     */
    function obtenerPrecioFormateado(precio) {
        return "$" + (Number(precio) || 0).toLocaleString("es-AR");
    }

    /**
     * Relaciona una tarjeta visual con un producto comparando título, tomo y precio.
     * - card: tarjeta HTML que puede no contener el ID real.
     * - Devuelve el ID o una cadena vacía.
     */
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

    // INSERT en favoritos: user_id y producto_id forman la asociación entre cuenta y manga.
    /**
     * Inserta en favoritos la relación entre el usuario y el manga.
     * - id: ID del manga.
     * - No devuelve valor.
     */
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

    // DELETE solo elimina la fila que coincide con ambos campos; así no se quita el favorito de otra cuenta.
    /**
     * Elimina de favoritos la relación del usuario actual con el manga.
     * - id: ID del manga.
     * - No devuelve valor.
     */
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

    // Agrega o quita un producto y después actualiza la interfaz con el estado confirmado.
/**
 * Agrega o quita el favorito y mantiene sincronizados estado, almacenamiento e interfaz.
 * - id: ID del producto.
 * - Actualiza favoriteIds y los botones.
 */
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

    // Obtiene los productos necesarios para construir las tarjetas de favoritos.
/**
 * Obtiene de Supabase los productos necesarios para las tarjetas de favoritos.
 * - No recibe parámetros.
 * - Actualiza productosCache.
 */
async function cargarProductos() {
        if (!supabaseClient) {
            productosCache = [];
            return;
        }

        try {
            var resultado = await supabaseClient
                .from("productos")
                .select("id,titulo,tomo,precio,estado,descripcion,imagen")
                .order("id", { ascending: false });

            if (resultado.error) throw resultado.error;

            productosCache = Array.isArray(resultado.data) ? resultado.data : [];
        } catch (error) {
            console.warn("No se pudieron cargar los productos para favoritos:", error);
            productosCache = [];
        }
    }

    /**
     * Relaciona las tarjetas del catálogo con sus IDs reales y prepara sus botones.
     * - No recibe parámetros.
     * - No devuelve valor.
     */
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

    /**
     * Relaciona tarjetas de inicio con productos y prepara sus botones de favorito.
     * - No recibe parámetros.
     * - No devuelve valor.
     */
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

    /**
     * Lee el ID de la URL de detalle y configura el botón de ese manga.
     * - No recibe parámetros.
     * - No devuelve valor.
     */
    function prepararFavoritoProducto() {
        var button = document.getElementById("productFavorite");
        if (!button) return;

        var id = new URLSearchParams(window.location.search).get("id");
        if (!id) return;

        button.dataset.productId = id;
        configurarEstadoBoton(button);
    }

    /**
     * Resuelve el campo imagen a una ruta que el navegador pueda mostrar.
     * - imagen: URL, ruta local o nombre de Storage.
     * - Devuelve URL o ruta.
     */
    function obtenerRutaImagenFavorito(imagen) {
        if (!imagen) {
            return "static/isotipo sin fondo.png";
        }

        if (/^https?:\/\//i.test(imagen)) {
            return imagen;
        }

        if (/^(img|static|imagenes)\//i.test(imagen)) {
            return imagen;
        }

        var config = window.REMANGA_SUPABASE_CONFIG;

        if (config && config.enabled && config.url && config.bucket) {
            return config.url.replace(/\/$/, "")
                + "/storage/v1/object/public/"
                + config.bucket
                + "/"
                + encodeURIComponent(imagen);
        }

        return "static/isotipo sin fondo.png";
    }

    /**
     * Construye una tarjeta de manga para el perfil.
     * - producto: registro del manga.
     * - Devuelve un elemento article.
     */
    function crearTarjetaFavorito(producto) {
        var card = document.createElement("article");
        card.className = "profile-favorite-card";

        var image = document.createElement("img");
        image.src = obtenerRutaImagenFavorito(producto.imagen);
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

    /**
     * Actualiza el contador visual de favoritos.
     * - cantidad: número de favoritos.
     * - No devuelve valor.
     */
    function actualizarContadorPerfil(cantidad) {
        var count = document.getElementById("favoriteCount");
        var label = document.getElementById("favoriteCountLabel");

        if (count) count.textContent = cantidad;
        if (label) label.textContent = cantidad;
    }

    // Pinta el bloque de favoritos dentro de la página de perfil.
/**
 * Filtra productosCache con favoriteIds y dibuja los resultados del perfil.
 * - No recibe parámetros.
 * - No devuelve valor.
 */
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

    // Escucha clics sobre botones de favorito, incluso en tarjetas creadas dinámicamente.
/**
 * Identifica el botón que originó el clic delegado y ejecuta la acción correspondiente.
 * - event: evento de clic del navegador.
 * - No devuelve valor.
 */
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

    // Punto de arranque: detecta usuario, carga los datos y enlaza los botones existentes.
/**
 * Coordina cliente, sesión, productos, botones y escuchas del módulo.
 * - No recibe parámetros.
 * - Configura los listeners y estado inicial.
 */
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

        // Delegación de eventos: un solo listener en document también recibe clics en botones
        // que se creen más tarde. El true activa la fase de captura, antes de listeners internos.

        if (document.body) {
            // MutationObserver detecta tarjetas que otros scripts agregan o reemplazan en el DOM.
            // Cuando cambian, volvemos a asignar IDs y clases visuales a los botones de favorito.
            // Observa cambios del DOM para reconocer botones en tarjetas generadas dinámicamente.
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
            // Escucha login/logout y otros cambios de sesión. Al cambiar el usuario, se vuelve a
            // cargar la lista correcta para no mezclar favoritos de cuentas diferentes.
            // Al entrar o salir de una cuenta, vuelve a seleccionar el conjunto de favoritos correspondiente.
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