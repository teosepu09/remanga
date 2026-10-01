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
    const username = user.user_metadata?.username || user.user_metadata?.name || (user.email ? user.email.split("@")[0] : "") || "Usuario ReManga";

    if (usernameElement) usernameElement.textContent = username;
    if (emailElement) emailElement.textContent = user.email || "Sin correo disponible";

    await cargarMisPublicaciones();


    // =========================================================
    // Mis publicaciones
    // =========================================================

    async function cargarMisPublicaciones() {
        if (!supabaseClient || !user) {
            renderizarPublicacionesPerfil([]);
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from("productos")
                .select("id,titulo,tomo,precio,estado,descripcion,imagen,vendedor_id")
                .eq("vendedor_id", user.id)
                .order("id", { ascending: false });

            if (error) {
                throw error;
            }

            renderizarPublicacionesPerfil(data || []);
        } catch (error) {
            console.error("No se pudieron cargar tus publicaciones:", error);
            renderizarPublicacionesPerfil([]);
            mostrarMensaje("No se pudieron cargar tus publicaciones.");
        }
    }

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



    // =========================================================
    // Cerrar sesión
    // =========================================================

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            mostrarMensaje("Cerrando sesión...", "info");

            try {
                const { error } = await supabaseClient.auth.signOut();

                if (error) {
                    throw error;
                }

                sessionStorage.removeItem("remangaGuest");
                localStorage.removeItem("remangaRemember");
                window.location.replace("./login.html");
            } catch (error) {
                console.error("No se pudo cerrar la sesión:", error);
                logoutButton.disabled = false;
                mostrarMensaje(
                    error?.message
                        ? "No se pudo cerrar la sesión: " + error.message
                        : "No se pudo cerrar la sesión. Intentá nuevamente."
                );
            }
        });
    }
