// =========================================================
// ReManga - Login / navegación inicial
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");

    // Si el usuario ya inició sesión y marcó "Recordarme",
    // mostramos directamente el Home.
    const savedSession = localStorage.getItem("remangaLoggedIn");
    if (savedSession === "true") {
        mostrarHome();
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

    // Continuar sin iniciar sesión: también lleva al Home.
    if (guestButton) {
        guestButton.addEventListener("click", () => {
            sessionStorage.setItem("remangaGuest", "true");
            mostrarHome();
        });
    }

    // Login de demostración mientras no exista autenticación en backend.
    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const usuarioEl = document.getElementById("usuario");
            const usuario = usuarioEl ? usuarioEl.value.trim() : "";
            const password = passwordInput ? passwordInput.value.trim() : "";

            if (!usuario || !password) {
                alert("Completá todos los campos.");
                return;
            }

            if (rememberInput && rememberInput.checked) {
                localStorage.setItem("remangaLoggedIn", "true");
            } else {
                sessionStorage.setItem("remangaLoggedIn", "true");
            }

            mostrarHome();
        });
    }

    // Enlaces que todavía usan el antiguo comportamiento pueden utilizar
    // esta función sin provocar una redirección directa al catálogo.
    function mostrarHome() {
        document.body.classList.add("remanga-authenticated");
        document.title = "ReManga | Compra y Venta de Mangas";
        window.scrollTo(0, 0);
    }
});
