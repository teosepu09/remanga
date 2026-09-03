// =========================================================
// Login script — safer: wait DOMContentLoaded and guard nulls
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    if (!loginForm) return; // nothing to do

    // Mostrar / ocultar contraseña (si existe el botón)
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.textContent = "◉";
            } else {
                passwordInput.type = "password";
                togglePassword.textContent = "◉";
            }
        });
    }

    // Manejo del envío del formulario
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const usuarioEl = document.getElementById("usuario");
        const usuario = usuarioEl ? usuarioEl.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        if (usuario === "" || password === "") {
            alert("Completá todos los campos.");
            return;
        }

        // Por ahora no hay backend: redirigimos a la página principal
        // usamos replace para no dejar el login en el historial
        window.location.replace('index.html');
    });
});
