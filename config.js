/**
 * Configuración global para ReManga
 * Detecta automáticamente desarrollo y producción.
 */

const remangaIsDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

// URL pública del backend Flask.
const REMANGA_API_URL = remangaIsDevelopment
    ? 'http://127.0.0.1:5000'
    : 'https://remanga.up.railway.app';

// Configuración pública de Supabase para las imágenes.
// La service_role key NO debe colocarse aquí.
const REMANGA_SUPABASE_CONFIG = {
    url: 'https://hhssfhcxlehuojuwacyy.supabase.co',
    bucket: 'imagenes',
    enabled: true
};

// Exponer configuración para scripts existentes sin duplicar const globales.
window.REMANGA_API_URL = REMANGA_API_URL;
window.REMANGA_SUPABASE_CONFIG = REMANGA_SUPABASE_CONFIG;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REMANGA_API_URL,
        REMANGA_SUPABASE_CONFIG
    };
}
