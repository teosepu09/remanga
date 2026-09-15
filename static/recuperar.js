// =========================================================
// ReManga - Recuperación de contraseña
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("recoveryForm");
    const emailInput = document.getElementById("email");
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

    if (!supabaseClient) {
        mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
        return;
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput?.value.trim() || "";

        if (!email || !email.includes("@")) {
            mostrarMensaje("Ingresá un correo electrónico válido.");
            return;
        }

        const button = form.querySelector(".login-button");
        if (button) {
            button.disabled = true;
            button.textContent = "ENVIANDO...";
        }
        mostrarMensaje("", "info");

        const redirectUrl = `${window.location.origin}${window.location.pathname.replace(/recuperar\.html$/, "restablecer.html")}`;

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            mostrarMensaje(error.message || "No se pudo enviar el enlace de recuperación.");
            if (button) {
                button.disabled = false;
                button.textContent = "ENVIAR ENLACE";
            }
            return;
        }

        mostrarMensaje(
            "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.",
            "success"
        );
        form.reset();

        if (button) {
            button.disabled = false;
            button.textContent = "ENVIAR ENLACE";
        }
    });
});
