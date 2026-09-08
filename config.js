/**
 * Configuración global para ReManga
 * Detecta automáticamente desarrollo y producción.
 */

const isDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

// En producción esta variable se reemplazará por la URL pública de la API.
// No guardar claves secretas de Supabase en este archivo.
const REMANGA_PRODUCTION_API_URL = '';

const API_URL = (() => {
    if (typeof REMANGA_API_URL !== 'undefined' && REMANGA_API_URL) {
        return REMANGA_API_URL.replace(/\/$/, '');
    }

    if (isDevelopment) {
        return 'http://127.0.0.1:5000';
    }

    return REMANGA_PRODUCTION_API_URL.replace(/\/$/, '');
})();

const SUPABASE_CONFIG = {
    url: 'https://hhssfhcxlehuojuwacyy.supabase.co',
    bucket: 'imagenes-mangas',
    enabled: true
};

const CART_KEY = 'remangaCart';
const USER_KEY = 'remangaUser';

const Config = {
    API_URL,
    isDevelopment,
    CART_KEY,
    USER_KEY,
    SUPABASE_CONFIG,

    getImageUrl(nombreImagen) {
        if (!nombreImagen) {
            return 'imagenes/onepiece1.webp';
        }

        if (/^https?:\/\//i.test(nombreImagen)) {
            return nombreImagen;
        }

        if (/^img\//i.test(nombreImagen)) {
            return nombreImagen;
        }

        if (this.SUPABASE_CONFIG.enabled) {
            return `${this.SUPABASE_CONFIG.url}/storage/v1/object/public/${this.SUPABASE_CONFIG.bucket}/public/${nombreImagen}`;
        }

        return `${API_URL}/imagenes/${encodeURIComponent(nombreImagen)}`;
    },

    async fetch(endpoint, options = {}) {
        if (!this.API_URL) {
            throw new Error('La URL de la API de producción todavía no está configurada.');
        }

        const url = `${this.API_URL}${endpoint}`;
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Error ${response.status}`);
        }

        return response.json();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
