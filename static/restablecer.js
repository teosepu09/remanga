// =========================================================
// ReManga - Restablecer contraseña
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("resetForm");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("passwordConfirm");
    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirm = document.getElementById("togglePasswordConfirm");
    const message = document.getElementById("authMessage");

    const config = window.REMANGA_SUPABASE_CONFIG;
    const supabaseClient = (config?.enabled && window.supabase && config.url && config.anonKey)
        ? window.supabase.createClient(config.url, config.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
    configurarToggle(toggleConfirm, confirmInput);

    if (!supabaseClient) {
        mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
        return;
    }

    let recoverySession = false;
    const { data: sessionData } = await supabaseClient.auth.getSession();
    recoverySession = !!sessionData?.session;

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) recoverySession = true;
    });

    if (!recoverySession) {
        mostrarMensaje("El enlace de recuperación no es válido o ya venció. Solicitá uno nuevo desde el login.");
        if (form) form.querySelector(".login-button").disabled = true;
        return;
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = passwordInput?.value || "";
        const confirm = confirmInput?.value || "";

        if (password.length < 6) {
            mostrarMensaje("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirm) {
            mostrarMensaje("Las contraseñas no coinciden.");
            return;
        }

        const button = form.querySelector(".login-button");
        if (button) {
            button.disabled = true;
            button.textContent = "GUARDANDO...";
        }
        mostrarMensaje("", "info");

        const { error } = await supabaseClient.auth.updateUser({ password });

        if (error) {
            mostrarMensaje(error.message || "No se pudo cambiar la contraseña.");
            if (button) {
                button.disabled = false;
                button.textContent = "CAMBIAR CONTRASEÑA";
            }
            return;
        }

        await supabaseClient.auth.signOut();
        mostrarMensaje("Contraseña actualizada correctamente. Ya podés iniciar sesión con tu nueva contraseña.", "success");
        form.reset();
        if (button) button.style.display = "none";
    });
});
