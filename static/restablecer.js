// =========================================================
// ReManga - Restablecer contraseña
// =========================================================

// Prepara el formulario y espera a que Supabase procese la sesión de recuperación.
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("resetForm");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("passwordConfirm");
    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirm = document.getElementById("togglePasswordConfirm");
    const message = document.getElementById("authMessage");
    const submitButton = form?.querySelector(".login-button");

    // ===== CLIENTE Y SESIÓN DE RECUPERACIÓN =====
    // El enlace del correo contiene información que Supabase utiliza para autorizar el cambio.
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

    // ===== UTILIDADES VISUALES =====
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
            button.setAttribute(
                "aria-label",
                visible ? "Mostrar contraseña" : "Ocultar contraseña"
            );
        });
    }

    configurarToggle(togglePassword, passwordInput);
    configurarToggle(toggleConfirm, confirmInput);

    if (!supabaseClient) {
        mostrarMensaje("No se pudo conectar con el sistema de autenticación.");
        return;
    }

    if (!form || !submitButton) return;

    submitButton.disabled = true;
    mostrarMensaje("Verificando el enlace de recuperación...", "info");

    let recoveryReady = false;
    let recoveryEventReceived = false;

    // ===== DETECCIÓN DE LA SESIÓN TEMPORAL =====
    // Supabase puede establecer la sesión de recuperación de forma asíncrona// Supabase puede establecer la sesión de recuperación de forma asíncrona
    // mientras procesa el enlace recibido por correo. Escuchamos el evento
    // PASSWORD_RECOVERY antes de decidir que el enlace no es válido.
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
            recoveryEventReceived = true;
            recoveryReady = true;
            submitButton.disabled = false;
            mostrarMensaje("Enlace válido. Elegí tu nueva contraseña.", "info");
        }
    });

    // Si la sesión ya quedó disponible al cargar la página, también es válida.
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData?.session) {
        recoveryReady = true;
        submitButton.disabled = false;
        mostrarMensaje("Enlace válido. Elegí tu nueva contraseña.", "info");
    }

    // Damos tiempo a Supabase para procesar el token/hash antes de mostrar error.
    if (!recoveryReady) {
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    if (!recoveryReady) {
        mostrarMensaje(
            "El enlace de recuperación no es válido o ya venció. Solicitá uno nuevo desde el login."
        );
        submitButton.disabled = true;
        authListener?.subscription?.unsubscribe?.();
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!recoveryReady) {
            mostrarMensaje("Esperá un momento mientras se valida el enlace.");
            return;
        }

        // ===== VALIDAR Y GUARDAR LA NUEVA CONTRASEÑA =====
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

        submitButton.disabled = true;
        submitButton.textContent = "GUARDANDO...";
        mostrarMensaje("Actualizando tu contraseña...", "info");

        const { error } = await supabaseClient.auth.updateUser({ password });

        if (error) {
            mostrarMensaje(error.message || "No se pudo cambiar la contraseña.");
            submitButton.disabled = false;
            submitButton.textContent = "CAMBIAR CONTRASEÑA";
            return;
        }

        await supabaseClient.auth.signOut();
        mostrarMensaje(
            "Contraseña actualizada correctamente. Ya podés iniciar sesión con tu nueva contraseña.",
            "success"
        );
        form.reset();
        submitButton.style.display = "none";
    });
});
