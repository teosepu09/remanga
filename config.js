/**
 * Configuración global para ReManga
 * Detecta automáticamente desarrollo y producción.
 */

const remangaIsDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const REMANGA_API_URL = remangaIsDevelopment
    ? 'http://127.0.0.1:5000'
    : 'https://remanga.up.railway.app';

const REMANGA_SUPABASE_CONFIG = {
    url: 'https://hhssfhcxlehuojuwacyy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoc3NmaGN4bGVodW9qdXdhY3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzkyODQsImV4cCI6MjEwMzUxNTI4NH0.MiGy10ZMe1mv1LE-PcSj0wAEJON2jgWqq-cWXnhy-c4',
    bucket: 'imagenes',
    enabled: true
};

window.REMANGA_API_URL = REMANGA_API_URL;
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
        REMANGA_API_URL,
        REMANGA_SUPABASE_CONFIG
    };
}
