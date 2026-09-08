// =========================================================
// ReManga - Login / navegación inicial
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const guestButton = document.getElementById("guestBtn");
    const rememberInput = document.getElementById("remember");

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

    // Continuar sin iniciar sesión: entra al Home (index.html).
    if (guestButton) {
        guestButton.addEventListener("click", (event) => {
            event.preventDefault();
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

            if (rememberInput && rememberInput.checked) {
                localStorage.setItem("remangaLoggedIn", "true");
                sessionStorage.removeItem("remangaLoggedIn");
            } else {
                sessionStorage.setItem("remangaLoggedIn", "true");
            }

            // Después de iniciar sesión, el usuario entra al Home.
            window.location.replace("./index.html");
        });
    }
});
