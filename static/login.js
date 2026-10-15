// =========================================================
// ReManga - Autenticación con Supabase
// =========================================================

// DOMContentLoaded se dispara cuando el HTML ya fue convertido en nodos del DOM.
// Así getElementById y querySelector pueden encontrar los controles que declara login.html.
// El callback es async porque consulta la sesión remota con await antes de configurar
// algunos comportamientos de la página.
document.addEventListener("DOMContentLoaded", async () => {
    // Cada constante guarda una referencia a un elemento HTML por su atributo id.
    // Se buscan una vez y se reutilizan; si un elemento no existe, getElementById da null.
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");
    // Zona donde mostrar errores, mensajes informativos o confirmaciones sin crear
    // alertas del navegador que interrumpan la interacción.
    const authMessage = document.getElementById("authMessage");

    // ===== CLIENTE DE SUPABASE AUTH =====
    // Auth administra la sesión y valida las credenciales; este archivo solo coordina la interfaz.
    // config.js debe haberse cargado antes que este archivo; publica sus valores en window.
    // Si falta la configuración o la librería, no se puede iniciar sesión desde esta página.
    // config.js publica la configuración en window para que otros scripts la consulten.
    // const significa que no se reasigna la referencia config; el objeto aún podría contener
    // propiedades mutables. El cliente sí debe cambiar de null al objeto creado, por eso let.
    const config = window.REMANGA_SUPABASE_CONFIG;
    let supabaseClient = null;

    try {
        // El operador ?. consulta enabled sin lanzar un error si config es null/undefined.
        // La expresión condicional ? : crea el cliente solo cuando se cumplen las condiciones;
        // en caso contrario mantiene null para que el envío pueda explicar el problema.
        supabaseClient = (config?.enabled && window.supabase && config.url && config.publishableKey)
            ? window.supabase.createClient(config.url, config.publishableKey, {
                // Opciones del módulo Auth: mantener sesión, renovar el token cuando corresponde
                // y detectar datos de sesión en la URL durante los flujos que lo utilizan.
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            })
            : null;
    } catch (error) {
        console.error("Error creando el cliente de Supabase:", error);
    }

    // ===== MENSAJES DE ESTADO =====
    // Centraliza el texto y la clase visual del aviso para evitar repetir ese código.
    /**
     * Muestra un aviso dentro de la pantalla de acceso.
     * - mensaje: texto visible; tipo: clase visual.
     * - No devuelve valor.
     */
    // Parámetro tipo tiene valor predeterminado: si no se pasa, el mensaje se trata como error.
    // textContent inserta texto literal, en lugar de interpretar el mensaje como HTML.
    function mostrarMensaje(mensaje, tipo = "error") {
        if (!authMessage) return;
        authMessage.textContent = mensaje;
        // La plantilla literal con backticks combina texto fijo y el valor de tipo.
        // Al asignar className se reemplazan las clases anteriores por estas dos clases,
        // por ejemplo "auth-message error" o "auth-message info".
        authMessage.className = `auth-message ${tipo}`;
    }

    // Si ya existe una sesión real, no tiene sentido mostrar nuevamente el login.
    // Si el cliente no se pudo crear, se omite esta comprobación y el formulario mostrará
    // un aviso al intentar acceder. Si existe, consultamos la sesión antes de mostrar el login.
    if (supabaseClient) {
        try {
            // La desestructuración extrae data y error del objeto de respuesta del SDK.
            // await espera a que la promesa se resuelva y permite manejar la sesión existente.
            const { data, error } = await supabaseClient.auth.getSession();
            // Los errores de autenticación pueden significar credenciales incorrectas, cuenta no confirmada
    // u otro problema del proveedor. Se muestra un mensaje sin exponer detalles internos sensibles.
    if (error) {
                console.error("Error al recuperar la sesión:", error);
            }
            // ?. evita leer session cuando data no existe. Si ya hay sesión activa, replace
            // lleva al inicio y reemplaza esta entrada del historial del navegador, por lo que
            // volver atrás no suele regresar al formulario de login como entrada separada.
            if (data?.session) {
                window.location.replace("./index.html");
                return;
            }
        } catch (error) {
            console.error("No se pudo comprobar la sesión de Supabase:", error);
        }
    }

    // Mostrar / ocultar contraseña.
    // Se comprueba que existan ambos elementos: el botón necesita el campo para cambiarlo.
    // addEventListener registra la acción sin sobrescribir otros manejadores del botón.
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            // El tipo actual indica si la contraseña está expuesta como texto o enmascarada.
            // Se calcula el siguiente estado y se actualizan campo, símbolo y etiqueta accesible.
            const visible = passwordInput.type === "text";
            passwordInput.type = visible ? "password" : "text";
            togglePassword.textContent = visible ? "◉" : "○";
            togglePassword.setAttribute(
                "aria-label",
                visible ? "Mostrar contraseña" : "Ocultar contraseña"
            );
        });
    }

    // El enlace de recuperación es un link normal hacia recuperar.html.
    // No se intercepta con JavaScript para permitir la navegación.

    // ===== ACCESO COMO INVITADO =====
    // Esta ruta permite navegar sin iniciar una sesión autenticada.
    // Continuar como invitado.
    // Esta opción no crea un usuario de Supabase. Solo marca en sessionStorage que la
    // navegación continúa como invitado durante la sesión actual del navegador.
    if (guestButton) {
        guestButton.addEventListener("click", (event) => {
            event.preventDefault();
            // Primero elimina el valor anterior para dejar claro que el estado se establece
            // desde cero; luego guarda la cadena "true". sessionStorage se limita a la sesión
            // de pestaña/ventana, a diferencia de localStorage, que suele persistir entre visitas.
            sessionStorage.removeItem("remangaGuest");
            sessionStorage.setItem("remangaGuest", "true");
            window.location.replace("./index.html");
        });
    }

    // ===== ENVÍO DEL FORMULARIO =====
    // El evento de envío evita recargar la página y pasa el correo/contraseña a Supabase Auth.
    // Login real mediante Supabase Auth.
    // submit cubre tanto el clic en el botón como el envío desde el teclado, por ejemplo Enter.
    // Se comprueba que el formulario exista antes de registrar el listener.
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            // Evita la recarga convencional del formulario; la petición se administra aquí.
            event.preventDefault();

            // Si no hay cliente, no se puede llamar a Supabase Auth.
            if (!supabaseClient) {
                mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
                return;
            }

            // Se toma el control de correo por ID. El ternario contempla un HTML incompleto:
            // si no existe el campo, usa cadena vacía en lugar de acceder a .value de null.
            const usuarioEl = document.getElementById("usuario");
            // trim quita espacios solo al principio y al final del correo; no modifica la clave,
            // porque los espacios podrían formar parte de una contraseña válida.
            const email = usuarioEl ? usuarioEl.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            // Verificación básica del lado del cliente para dar respuesta rápida al usuario.
            // No sustituye la validación final que realiza el servicio de autenticación.
            if (!email || !password) {
                mostrarMensaje("Completá el correo electrónico y la contraseña.");
                return;
            }

            // Comprobación superficial para detectar correos claramente incompletos. includes
            // solo verifica la presencia de @; no demuestra que la dirección exista o sea válida.
            if (!email.includes("@")) {
                mostrarMensaje("Ingresá un correo electrónico válido.");
                return;
            }

            // Se busca el botón dentro de este formulario, no en todo el documento, para evitar
            // afectar a otro botón que por casualidad comparta la clase.
            const loginButton = loginForm.querySelector(".login-button");
            if (loginButton) {
                // Desactivar evita envíos repetidos mientras la petición está pendiente; cambiar
                // el texto comunica el estado de espera. Los caminos de error vuelven a habilitarlo.
                loginButton.disabled = true;
                loginButton.textContent = "INGRESANDO...";
            }
            mostrarMensaje("", "info");

            // let permite asignar la respuesta dentro del try y leerla después.
            // signInWithPassword envía correo y contraseña a Supabase Auth; no se compara la clave
            // en este archivo ni se debe guardar la contraseña en localStorage.
            let authResult;
            try {
                authResult = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
            } catch (error) {
                // catch gestiona fallos que lanzan una excepción, por ejemplo problemas de red.
                // Es distinto de una respuesta normal del SDK que contiene la propiedad error.
                console.error("Error de red o de Supabase al iniciar sesión:", error);
                mostrarMensaje("No se pudo conectar con Supabase. Revisá tu conexión e intentá nuevamente.");
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = "ENTRAR";
                }
                return;
            }

            // Aquí se trata el error que el SDK devuelve en su objeto de resultado, aunque la
            // promesa sí se haya resuelto. Por eso es distinto del catch anterior.
            const { error } = authResult;

            if (error) {
                // Se normaliza el mensaje a minúsculas para reconocer esa frase sin importar
                // sus mayúsculas. Si coincide, se muestra una traducción; de lo contrario se usa
                // el mensaje de error devuelto o un texto genérico como último respaldo.
                const mensaje = error.message?.toLowerCase().includes("invalid login credentials")
                    ? "El correo o la contraseña son incorrectos."
                    : error.message || "No se pudo iniciar sesión.";
                mostrarMensaje(mensaje);

                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = "ENTRAR";
                }
                return;
            }

            // Al iniciar sesión real se elimina la marca de invitado.
            sessionStorage.removeItem("remangaGuest");
            // Guarda una preferencia booleana como texto. Importante: en este archivo la opción
            // remember solo escribe/borra esta marca; el cliente de Supabase se creó arriba con
            // persistSession:true en ambos casos, así que esta bandera por sí sola no cambia la
            // persistencia real de la sesión de Supabase.
            if (rememberInput?.checked) {
                localStorage.setItem("remangaRemember", "true");
            } else {
                localStorage.removeItem("remangaRemember");
            }

            // La sesión ya quedó gestionada por Supabase; al volver al inicio, los otros módulos
            // pueden consultar la sesión guardada y mostrar la interfaz correspondiente.
            window.location.replace("./index.html");
        });
    }
});
