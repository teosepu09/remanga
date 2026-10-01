// =========================================================
// ReManga - Mi cuenta
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const config = window.REMANGA_SUPABASE_CONFIG;
    const usernameElement = document.getElementById("profileUsername");
    const emailElement = document.getElementById("profileEmail");
    const logoutButton = document.getElementById("logoutBtn");
    const messageElement = document.getElementById("profileMessage");

    const supabaseClient = (config?.enabled && window.supabase && config.url && config.publishableKey)
        ? window.supabase.createClient(config.url, config.publishableKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
        : null;

    function mostrarMensaje(texto, tipo = "error") {
        if (!messageElement) return;
        messageElement.textContent = texto;
        messageElement.className = `profile-message ${tipo}`;
    }

    if (!supabaseClient) {
        window.location.replace("./login.html");
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data?.session) {
        sessionStorage.removeItem("remangaGuest");
        window.location.replace("./login.html");
        return;
    }

    const user = data.session.user;
    const username = user.user_metadata?.username || "Usuario ReManga";

    if (usernameElement) usernameElement.textContent = username;
    if (emailElement) emailElement.textContent = user.email || "Sin correo disponible";

    renderizarPublicacionesPerfil(publicacionesDePrueba);


    // =========================================================
    // Mis publicaciones - render visual (Paso 2)
    // =========================================================

    function obtenerPrecioPublicacion(precio) {
        return "$" + (Number(precio) || 0).toLocaleString("es-AR");
    }

    function obtenerRutaImagenPublicacion(imagen) {
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

    function crearTarjetaPublicacion(producto) {
        var card = document.createElement("article");
        card.className = "profile-product-card";

        var image = document.createElement("img");
        image.className = "profile-product-image";
        image.src = obtenerRutaImagenPublicacion(producto.imagen);
        image.alt = producto.titulo || "Manga";

        var content = document.createElement("div");
        content.className = "profile-product-content";

        var state = document.createElement("span");
        state.className = "profile-product-state";
        state.textContent = String(producto.estado || "Disponible").toUpperCase();

        var title = document.createElement("h3");
        title.textContent = producto.titulo || "Sin título";

        var volume = document.createElement("p");
        volume.textContent = "Tomo " + (producto.tomo == null ? "-" : producto.tomo);

        var price = document.createElement("strong");
        price.textContent = obtenerPrecioPublicacion(producto.precio);

        content.append(state, title, volume, price);
        card.append(image, content);

        return card;
    }

    function actualizarContadorPublicaciones(cantidad) {
        var count = document.getElementById("publicationCount");
        if (count) count.textContent = cantidad;
    }

    function renderizarPublicacionesPerfil(productos) {
        var grid = document.getElementById("myProductsGrid");
        var empty = document.getElementById("publicationEmpty");

        if (!grid) return;

        var publicaciones = Array.isArray(productos) ? productos : [];

        grid.innerHTML = "";
        actualizarContadorPublicaciones(publicaciones.length);

        if (!publicaciones.length) {
            grid.style.display = "none";
            if (empty) empty.style.display = "flex";
            return;
        }

        if (empty) empty.style.display = "none";
        grid.style.display = "grid";

        publicaciones.forEach(function (producto) {
            grid.appendChild(crearTarjetaPublicacion(producto));
        });
    }

    // Datos temporales únicamente para comprobar el render antes de conectar Supabase.
    var publicacionesDePrueba = [
        {
            titulo: "Manga de prueba",
            tomo: 1,
            precio: 4500,
            estado: "Disponible",
            imagen: null
        },
        {
            titulo: "Otra publicación",
            tomo: 3,
            precio: 6200,
            estado: "Usado",
            imagen: null
        }
    ];

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CERRANDO...';
            mostrarMensaje("Cerrando sesión...", "info");

            const { error: logoutError } = await supabaseClient.auth.signOut();

            if (logoutError) {
                mostrarMensaje("No se pudo cerrar la sesión. Intentá nuevamente.");
                logoutButton.disabled = false;
                logoutButton.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
                return;
            }

            sessionStorage.removeItem("remangaGuest");
            localStorage.removeItem("remangaLoggedIn");
            sessionStorage.removeItem("remangaLoggedIn");

            window.location.replace("./login.html");
        });
    }
});
