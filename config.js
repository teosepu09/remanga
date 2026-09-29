/**
 * Configuración global para ReManga
 *
 * El sitio es 100% estático (GitHub Pages) y habla directamente con Supabase:
 * base de datos, autenticación e imágenes. Ya no hay servidor intermedio.
 */

const REMANGA_SUPABASE_CONFIG = {
    url: 'https://hhssfhcxlehuojuwacyy.supabase.co',
    publishableKey: 'sb_publishable_lM2qbj2jBEVgLboweAI_Xw_fxhcw-dM',
    bucket: 'imagenes',
    enabled: true
};

window.REMANGA_SUPABASE_CONFIG = REMANGA_SUPABASE_CONFIG;

// Sistema de marca global para las pantallas que utilizan esta configuración.
(function cargarEstilosDeMarca() {
    if (document.querySelector('link[data-remanga-brand]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'static/brand.css';
    link.dataset.remangaBrand = 'true';
    document.head.appendChild(link);
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REMANGA_SUPABASE_CONFIG
    };
}
