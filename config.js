/**
 * Configuración global para ReManga
 *
 * El sitio es 100% estático (GitHub Pages) y habla directamente con Supabase:
 * base de datos, autenticación e imágenes. Ya no hay servidor intermedio.
 */

// ===== CONFIGURACIÓN DE SUPABASE =====
// Valores compartidos por las páginas: URL del proyecto, clave pública, bucket y activación.
// Esta configuración se carga desde el navegador; no coloques aquí claves secretas de servidor.
const REMANGA_SUPABASE_CONFIG = {
    url: 'https://hhssfhcxlehuojuwacyy.supabase.co',
    publishableKey: 'sb_publishable_lM2qbj2jBEVgLboweAI_Xw_fxhcw-dM',
    bucket: 'imagenes',
    enabled: true
};

// Publicamos la configuración en window para que los demás scripts puedan leerla.
window.REMANGA_SUPABASE_CONFIG = REMANGA_SUPABASE_CONFIG;

// Sistema de marca global para las pantallas que utilizan esta configuración.
// ===== CARGA DEL ESTILO DE MARCA =====
// Inserta brand.css una sola vez, aunque más de un archivo solicite este estilo.
(function cargarEstilosDeMarca() {
    if (document.querySelector('link[data-remanga-brand]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'static/brand.css';
    link.dataset.remangaBrand = 'true';
    document.head.appendChild(link);
})();

// Permite reutilizar esta configuración desde entornos Node.js de prueba, si corresponde.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REMANGA_SUPABASE_CONFIG
    };
}
