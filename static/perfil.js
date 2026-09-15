// =========================================================
// ReManga - Mi cuenta
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const config = window.REMANGA_SUPABASE_CONFIG;
    const usernameElement = document.getElementById("profileUsername");
    const emailElement = document.getElementById("profileEmail");
    const logoutButton = document.getElementById("logoutBtn");
    const messageElement = document.getElementById("profileMessage");

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
    const username = user.user_metadata?.username || "Usuario ReManga";

    if (usernameElement) usernameElement.textContent = username;
    if (emailElement) emailElement.textContent = user.email || "Sin correo disponible";

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CERRANDO...';
            mostrarMensaje("Cerrando sesión...", "info");

            const { error: logoutError } = await supabaseClient.auth.signOut();

            if (logoutError) {
                mostrarMensaje("No se pudo cerrar la sesión. Intentá nuevamente.");
                logoutButton.disabled = false;
                logoutButton.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
                return;
            }

            sessionStorage.removeItem("remangaGuest");
            localStorage.removeItem("remangaLoggedIn");
            sessionStorage.removeItem("remangaLoggedIn");

            window.location.replace("./login.html");
        });
    }
});
