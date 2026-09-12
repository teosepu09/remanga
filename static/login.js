// =========================================================
// ReManga - Autenticación con Supabase
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");
    const forgotPassword = document.querySelector(".forgot-password");
    const authMessage = document.getElementById("authMessage");

    const config = window.REMANGA_SUPABASE_CONFIG;
    const supabaseClient = (config?.enabled && window.supabase && config.url && config.anonKey)
        ? window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
        : null;

    function mostrarMensaje(mensaje, tipo = "error") {
        if (!authMessage) return;
        authMessage.textContent = mensaje;
        authMessage.className = `auth-message ${tipo}`;
    }

    // Si ya existe una sesión real, no tiene sentido mostrar nuevamente el login.
    if (supabaseClient) {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session) {
            window.location.replace("./index.html");
            return;
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

    // Recuperación de contraseña: todavía se implementará en el siguiente paso.
    if (forgotPassword) {
        forgotPassword.addEventListener("click", (event) => {
            event.preventDefault();
            mostrarMensaje("La recuperación de contraseña la agregaremos en el próximo paso.", "info");
        });
    }

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

            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

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
