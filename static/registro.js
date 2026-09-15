// =========================================================
// ReManga - Registro real con Supabase Auth
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("registerForm");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const passwordConfirmInput = document.getElementById("passwordConfirm");
    const togglePassword = document.getElementById("togglePassword");
    const togglePasswordConfirm = document.getElementById("togglePasswordConfirm");
    const message = document.getElementById("authMessage");

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

    function mostrarMensaje(texto, tipo = "error") {
        if (!message) return;
        message.textContent = texto;
        message.className = `auth-message ${tipo}`;
    }

    function configurarToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener("click", () => {
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            button.textContent = visible ? "◉" : "○";
            button.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
        });
    }

    configurarToggle(togglePassword, passwordInput);
    configurarToggle(togglePasswordConfirm, passwordConfirmInput);

    if (!supabaseClient) {
        mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
        return;
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData?.session) {
        window.location.replace("./index.html");
        return;
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        mostrarMensaje("", "info");

        const username = usernameInput?.value.trim() || "";
        const email = emailInput?.value.trim() || "";
        const password = passwordInput?.value || "";
        const passwordConfirm = passwordConfirmInput?.value || "";

        if (username.length < 3 || username.length > 30) {
            mostrarMensaje("El nombre de usuario debe tener entre 3 y 30 caracteres.");
            return;
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
            mostrarMensaje("El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo.");
            return;
        }

        if (!email || !email.includes("@")) {
            mostrarMensaje("Ingresá un correo electrónico válido.");
            return;
        }

        if (password.length < 6) {
            mostrarMensaje("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== passwordConfirm) {
            mostrarMensaje("Las contraseñas no coinciden.");
            return;
        }

        const submitButton = form.querySelector(".login-button");
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "CREANDO...";
        }

        const redirectUrl = `${window.location.origin}${window.location.pathname.replace(/registro\.html$/, "index.html")}`;

        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    username
                }
            }
        });

        if (error) {
            const raw = (error.message || "").toLowerCase();
            let mensaje = error.message || "No se pudo crear la cuenta.";

            if (raw.includes("already registered") || raw.includes("user already registered")) {
                mensaje = "Ese correo ya tiene una cuenta registrada.";
            } else if (raw.includes("duplicate key") || raw.includes("profiles_username_key")) {
                mensaje = "Ese nombre de usuario ya está en uso.";
            } else if (raw.includes("password")) {
                mensaje = "La contraseña no cumple los requisitos de Supabase.";
            }

            mostrarMensaje(mensaje);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "CREAR CUENTA";
            }
            return;
        }

        mostrarMensaje(
            "Cuenta creada. Revisá tu correo electrónico y confirmá la cuenta antes de iniciar sesión.",
            "success"
        );

        form.reset();

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "CREAR CUENTA";
        }
    });
});
