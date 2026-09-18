// =========================================================
// ReManga - Autenticación con Supabase
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");
    const authMessage = document.getElementById("authMessage");

    const config = window.REMANGA_SUPABASE_CONFIG;
    let supabaseClient = null;

    try {
        supabaseClient = (config?.enabled && window.supabase && config.url && config.anonKey)
            ? window.supabase.createClient(config.url, config.anonKey, {
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

    function mostrarMensaje(mensaje, tipo = "error") {
        if (!authMessage) return;
        authMessage.textContent = mensaje;
        authMessage.className = `auth-message ${tipo}`;
    }

    // Si ya existe una sesión real, no tiene sentido mostrar nuevamente el login.
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.error("Error al recuperar la sesión:", error);
            }
            if (data?.session) {
                window.location.replace("./index.html");
                return;
            }
        } catch (error) {
            console.error("No se pudo comprobar la sesión de Supabase:", error);
        }
    }

    // Mostrar / ocultar contraseña.
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
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

    // Continuar como invitado.
    if (guestButton) {
        guestButton.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.removeItem("remangaGuest");
            sessionStorage.setItem("remangaGuest", "true");
            window.location.replace("./index.html");
        });
    }

    // Login real mediante Supabase Auth.
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!supabaseClient) {
                mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
                return;
            }

            const usuarioEl = document.getElementById("usuario");
            const email = usuarioEl ? usuarioEl.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!email || !password) {
                mostrarMensaje("Completá el correo electrónico y la contraseña.");
                return;
            }

            if (!email.includes("@")) {
                mostrarMensaje("Ingresá un correo electrónico válido.");
                return;
            }

            const loginButton = loginForm.querySelector(".login-button");
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = "INGRESANDO...";
            }
            mostrarMensaje("", "info");

            let authResult;
            try {
                authResult = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
            } catch (error) {
                console.error("Error de red o de Supabase al iniciar sesión:", error);
                mostrarMensaje("No se pudo conectar con Supabase. Revisá tu conexión e intentá nuevamente.");
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = "ENTRAR";
                }
                return;
            }

            const { error } = authResult;

            if (error) {
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

            sessionStorage.removeItem("remangaGuest");
            if (rememberInput?.checked) {
                localStorage.setItem("remangaRemember", "true");
            } else {
                localStorage.removeItem("remangaRemember");
            }

            window.location.replace("./index.html");
        });
    }
});
