// =========================================================
// ReManga - Login / navegación inicial
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");
    const forgotPassword = document.querySelector(".forgot-password");

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

    // Link temporal: evita saltar a # y deja clara la intención.
    if (forgotPassword) {
        forgotPassword.addEventListener("click", (event) => {
            event.preventDefault();
            alert("Todavía no está implementada la recuperación de contraseña.");
        });
    }

    // Continuar sin iniciar sesión: entra al Home (index.html).
    if (guestButton) {
        guestButton.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.removeItem("remangaLoggedIn");
            localStorage.removeItem("remangaLoggedIn");
            sessionStorage.setItem("remangaGuest", "true");
            window.location.replace("./index.html");
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

            sessionStorage.removeItem("remangaGuest");

            if (rememberInput && rememberInput.checked) {
                localStorage.setItem("remangaLoggedIn", "true");
                sessionStorage.removeItem("remangaLoggedIn");
            } else {
                sessionStorage.setItem("remangaLoggedIn", "true");
                localStorage.removeItem("remangaLoggedIn");
            }

            window.location.replace("./index.html");
        });
    }
});
