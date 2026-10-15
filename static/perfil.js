// =========================================================
// ReManga - Mi cuenta
// =========================================================

// DOMContentLoaded se dispara cuando el navegador ya construyó los elementos HTML.
// Esperarlo permite buscar los nodos del perfil sin ejecutarse antes de que existan.
// El callback es async porque más adelante espera respuestas de autenticación y productos.
document.addEventListener("DOMContentLoaded", async () => {
    // ===== SESIÓN Y DATOS DE CUENTA =====
    // El perfil requiere una sesión real; los visitantes invitados vuelven al inicio de sesión.
    // La página de perfil es privada: primero se prepara el cliente y luego se confirma
    // que exista una sesión válida antes de cargar los datos que se van a mostrar.
    const config = window.REMANGA_SUPABASE_CONFIG;
    // Cada constante guarda una referencia al elemento HTML que mostrará ese dato.
    // getElementById devuelve null si el ID no está presente en el documento.
    const usernameElement = document.getElementById("profileUsername");
    const emailElement = document.getElementById("profileEmail");
    const logoutButton = document.getElementById("logoutBtn");
    const messageElement = document.getElementById("profileMessage");

    // La expresión condicional crea el cliente únicamente cuando la configuración está
    // activa y la biblioteca de Supabase ya está cargada. ?. permite comprobar enabled
    // sin provocar un error si config no existe; si falta algo, el resultado será null.
    const supabaseClient = (config?.enabled && window.supabase && config.url && config.publishableKey)
        ? window.supabase.createClient(config.url, config.publishableKey, {
            // persistSession conserva la sesión; autoRefreshToken permite renovar el
            // token cuando corresponde; detectSessionInUrl reconoce datos de sesión
            // en la URL durante flujos de autenticación compatibles.
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
        : null;

    /**
     * Muestra un aviso dentro del perfil del usuario.
     * - texto: mensaje; tipo: clase visual.
     * - No devuelve valor.
     */
    // tipo es un parámetro con valor por defecto: si no se especifica, se usa error.
    // textContent introduce el mensaje como texto literal, no como código HTML.
    function mostrarMensaje(texto, tipo = "error") {
        if (!messageElement) return;
        messageElement.textContent = texto;
        // La plantilla literal combina el nombre base con la clase de estado, por ejemplo
        // profile-message error o profile-message info. className sustituye las clases previas.
        messageElement.className = `profile-message ${tipo}`;
    }

    // Sin cliente no se puede consultar la sesión. Se redirige al login y return detiene
    // el callback para que no continúe ejecutando lógica que necesita Supabase.
    if (!supabaseClient) {
        window.location.replace("./login.html");
        return;
    }

    // getSession consulta la sesión que mantiene el SDK. await espera la promesa; la
    // desestructuración extrae data y error del resultado en variables separadas.
    const { data, error } = await supabaseClient.auth.getSession();

    // Un error de consulta o la ausencia de session significa que no hay una sesión usable.
    // ?. evita intentar leer session si data es null o undefined.
    if (error || !data?.session) {
        sessionStorage.removeItem("remangaGuest");
        window.location.replace("./login.html");
        return;
    }

    // user contiene los datos de la cuenta que Supabase devuelve para la sesión.
    const user = data.session.user;
    // Se elige el primer valor no vacío disponible: username del perfil, name alternativo,
    // parte del correo anterior a @ y, como último respaldo, un nombre genérico.
    // user_metadata puede no contener esos campos, por eso se usa encadenamiento opcional.
    const username = user.user_metadata?.username || user.user_metadata?.name || (user.email ? user.email.split("@")[0] : "") || "Usuario ReManga";

    if (usernameElement) usernameElement.textContent = username;
    if (emailElement) emailElement.textContent = user.email || "Sin correo disponible";

    // La función se define más abajo, pero las declaraciones function son accesibles en
    // este ámbito. Se espera su finalización para iniciar y representar las publicaciones.
    await cargarMisPublicaciones();


    // =========================================================
    // Mis publicaciones
    // =========================================================

    // ===== PUBLICACIONES DEL USUARIO =====
    // Filtra en Supabase las publicaciones creadas por la cuenta actual.
    /**
     * Consulta los productos publicados por el usuario autenticado.
     * - No recibe parámetros.
     * - Actualiza la sección de publicaciones propias.
     */
    // Función asíncrona: consulta solo las publicaciones vinculadas a la cuenta actual.
    // Si faltan cliente o usuario, representa la lista vacía en lugar de lanzar una consulta.
    async function cargarMisPublicaciones() {
        if (!supabaseClient || !user) {
            renderizarPublicacionesPerfil([]);
            return;
        }

        try {
            /* Consulta encadenada a la tabla productos:
               - select enumera las columnas que necesita la pantalla.
               - eq filtra por vendedor_id de la cuenta activa.
               - order ordena por ID descendente, normalmente mostrando primero IDs altos.
               El filtro organiza la consulta, pero los permisos definitivos deben reforzarse
               con políticas RLS correctas en Supabase. */
            const { data, error } = await supabaseClient
                .from("productos")
                .select("id,titulo,tomo,precio,estado,descripcion,imagen,vendedor_id")
                .eq("vendedor_id", user.id)
                .order("id", { ascending: false });

            // El SDK puede devolver error como parte de una respuesta resuelta. throw lo
            // convierte en una excepción para que el catch centralice el mensaje y la UI.
            if (error) {
                throw error;
            }

            // Si data es null/undefined, || [] entrega un array vacío al renderizador.
            renderizarPublicacionesPerfil(data || []);
        } catch (error) {
            console.error("No se pudieron cargar tus publicaciones:", error);
            renderizarPublicacionesPerfil([]);
            mostrarMensaje("No se pudieron cargar tus publicaciones.");
        }
    }

    /**
     * Formatea el precio de una publicación para presentarlo en el perfil.
     * - precio: valor numérico o texto numérico.
     * - Devuelve texto de precio.
     */
    function obtenerPrecioPublicacion(precio) {
        // Number intenta convertir a valor numérico; || 0 usa cero si la conversión falla.
        // toLocaleString("es-AR") aplica el formato regional para presentar separadores.
        // Es solo formato de interfaz, no cálculo comercial ni validación del precio.
        return "$" + (Number(precio) || 0).toLocaleString("es-AR");
    }

    /**
     * Resuelve la ruta de imagen de una publicación para mostrarla en el perfil.
     * - imagen: URL, ruta local o nombre de archivo.
     * - Devuelve URL o ruta.
     */
    function obtenerRutaImagenPublicacion(imagen) {
        // Se contemplan distintos formatos del dato imagen porque puede venir de un archivo
        // local, una URL ya completa o un objeto público de Storage de Supabase.
        if (!imagen) {
            return "static/isotipo sin fondo.png";
        }

        // La expresión regular reconoce URL que comienzan con http:// o https://; la i
        // hace la comparación insensible a mayúsculas. Las URL completas se devuelven tal cual.
        if (/^https?:\/\//i.test(imagen)) {
            return imagen;
        }

        // Si empieza con una carpeta local conocida, se conserva la ruta relativa para que
        // el navegador resuelva el archivo desde la ubicación actual del sitio.
        if (/^(img|static|imagenes)\//i.test(imagen)) {
            return imagen;
        }

        var config = window.REMANGA_SUPABASE_CONFIG;

        // Si parece un nombre de archivo de Storage, se construye la URL pública del bucket.
        // replace(/\/$/, "") elimina una barra final de la URL base para no duplicarla; luego
        // encodeURIComponent codifica caracteres especiales del nombre de archivo.
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
     * Crea la tarjeta visual de una publicación del usuario.
     * - producto: registro del manga.
     * - Devuelve un elemento article.
     */
    function crearTarjetaPublicacion(producto) {
        // Se construye cada tarjeta con nodos DOM independientes. De esta forma los campos
        // del producto se asignan como texto y no se interpretan como una cadena HTML completa.
        var card = document.createElement("article");
        card.className = "profile-product-card";
        // role="link" anuncia a tecnologías de asistencia que la tarjeta se comporta como
        // un enlace. tabindex="0" permite enfocarla con Tab y activarla con teclado.
        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");
        card.addEventListener("click", function () {
            window.location.href = "producto.html?id=" + encodeURIComponent(producto.id);
        });
        // Además del clic, Enter y la barra espaciadora activan la tarjeta cuando está
        // enfocada. preventDefault evita que la barra espaciadora desplace la página al usarla.
        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.location.href = "producto.html?id=" + encodeURIComponent(producto.id);
            }
        });

        // La clase enlaza esta imagen con las reglas de perfil.css. alt aporta una descripción
        // textual útil si la imagen no carga o si se usa un lector de pantalla.
        var image = document.createElement("img");
        image.className = "profile-product-image";
        image.src = obtenerRutaImagenPublicacion(producto.imagen);
        image.alt = producto.titulo || "Manga";

        var content = document.createElement("div");
        content.className = "profile-product-content";

        // Estado, título, tomo y precio se rellenan con textContent: el navegador los trata
        // como texto normal, no como etiquetas HTML. Se usan valores de respaldo si faltan datos.
        var state = document.createElement("span");
        state.className = "profile-product-state";
        state.textContent = String(producto.estado || "Disponible").toUpperCase();

        var title = document.createElement("h3");
        title.textContent = producto.titulo || "Sin título";

        // La comparación == null contempla tanto null como undefined; si tomo no existe,
        // se muestra un guion. En caso contrario se concatena el número con la palabra Tomo.
        var volume = document.createElement("p");
        volume.textContent = "Tomo " + (producto.tomo == null ? "-" : producto.tomo);

        var price = document.createElement("strong");
        price.textContent = obtenerPrecioPublicacion(producto.precio);

        // append puede agregar varios nodos en una llamada. Primero se arma el bloque textual
        // y luego se insertan la imagen y el contenido dentro de la tarjeta principal.
        content.append(state, title, volume, price);
        card.append(image, content);

        return card;
    }

    /**
     * Actualiza el número de publicaciones que se muestra en el perfil.
     * - cantidad: número de publicaciones.
     * - No devuelve valor.
     */
    function actualizarContadorPublicaciones(cantidad) {
        // El contador se busca en el HTML por ID. La comprobación evita un error si una página
        // no incluye ese elemento; textContent actualiza solo el número visible.
        var count = document.getElementById("publicationCount");
        if (count) count.textContent = cantidad;
    }

    /**
     * Dibuja la lista de publicaciones recibida o muestra el estado vacío.
     * - productos: array de productos.
     * - No devuelve valor.
     */
    function renderizarPublicacionesPerfil(productos) {
        // grid contiene las tarjetas; empty contiene el mensaje alternativo cuando no hay datos.
        // Se consultan por separado porque el HTML puede tener uno sin el otro.
        var grid = document.getElementById("myProductsGrid");
        var empty = document.getElementById("publicationEmpty");

        if (!grid) return;

        // Se valida el tipo de entrada: solo se procesan arrays. Limpiar innerHTML elimina
        // las tarjetas anteriores antes de volver a pintar para no duplicarlas.
        var publicaciones = Array.isArray(productos) ? productos : [];

        grid.innerHTML = "";
        actualizarContadorPublicaciones(publicaciones.length);

        // Si la lista está vacía, se oculta la cuadrícula y se muestra el estado vacío.
        // Si sí hay publicaciones, se hace lo contrario y cada objeto se convierte en tarjeta.
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
    // Cerrar sesión// =========================================================
    // Cerrar sesión
    // =========================================================

    // El listener se registra solo si el botón existe en este HTML.
    // Al comenzar, se desactiva para evitar múltiples solicitudes de cierre de sesión.
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            mostrarMensaje("Cerrando sesión...", "info");

            try {
                // signOut pide al SDK que cierre la sesión. La respuesta también puede traer
                // un error sin lanzar una excepción, por eso se comprueba explícitamente.
                const { error } = await supabaseClient.auth.signOut();

                if (error) {
                    throw error;
                }

                // Limpia marcas locales que describen el modo invitado y la preferencia
                // recordarme. No elimina productos ni favoritos; limpia solo esas claves.
                sessionStorage.removeItem("remangaGuest");
                localStorage.removeItem("remangaRemember");
                window.location.replace("./login.html");
            } catch (error) {
                // Si el cierre falla, se habilita otra vez el botón para permitir reintentar.
                // error?.message consulta el texto solo cuando error contiene esa propiedad.
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
});
