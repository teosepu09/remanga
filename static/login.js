// =========================================================
// ELEMENTOS
// =========================================================

const loginForm = document.getElementById("loginForm");

const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");


// =========================================================
// MOSTRAR / OCULTAR CONTRASEÑA
// =========================================================

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "◉";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "◉";

    }

});


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener("submit", (event) => {

    event.preventDefault();


    const usuario = document.getElementById("usuario").value.trim();

    const password = passwordInput.value.trim();


    // -----------------------------------------------------
    // VALIDACIÓN BÁSICA
    // -----------------------------------------------------

    if (usuario === "" || password === "") {

        alert("Completá todos los campos.");

        return;

    }


    // -----------------------------------------------------
    // POR AHORA NO HAY BASE DE DATOS
    // -----------------------------------------------------

    window.location.href = "index.html";

});