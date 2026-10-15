// =========================================================
// ReManga - Recuperación de contraseña
// =========================================================

// Espera a que el formulario exista para conectar la solicitud de recuperación.
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("recoveryForm");
    const emailInput = document.getElementById("email");
    const message = document.getElementById("authMessage");

    // ===== CONFIGURACIÓN DE AUTENTICACIÓN =====
    // Se necesita un cliente de Supabase para enviar el correo de recuperación.
    const config = window.REMANGA_SUPABASE_CONFIG;
    const supabaseClient = (config?.enabled && window.supabase && config.url && config.publishableKey)
        ? window.supabase.createClient(config.url, config.publishableKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
        : null;

    // ===== MENSAJES PARA EL USUARIO =====
    /**
     * Muestra el resultado de solicitar un correo de recuperación.
     * - texto: mensaje; tipo: clase visual.
     * - No devuelve valor.
     */
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

    // ===== SOLICITAR EL ENLACE =====
        // El correo contiene el enlace que devolverá al usuario a restablecer.html.
        form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Correo escrito por el usuario: Supabase lo usa para iniciar el flujo de recuperación.
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

        // Supabase envía el flujo de recuperación al correo. redirectTo define a qué página vuelve
    // el enlace; esa URL también debe estar permitida en la configuración de Auth del proyecto.
    // Solicita el correo de recuperación. redirectTo debe estar permitido en la configuración de URLs de Auth.
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
