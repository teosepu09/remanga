/**
 * Configuración global para ReManga
 * Detecta automáticamente el entorno (desarrollo/producción)
 */

// Detectar si estamos en desarrollo o producción
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// URL base del API
const API_URL = (() => {
    // Si hay una variable global definida por el servidor
    if (typeof REMANGA_API_URL !== 'undefined') {
        return REMANGA_API_URL;
    }
    
    // Detectar automáticamente según el entorno
    if (isDevelopment) {
        return 'http://127.0.0.1:5000';
    } else {
        // En producción, usar la misma URL base que el sitio
        return window.location.origin.replace(/\/$/, '');
    }
})();

// Configuración de Supabase (si aplica)
const SUPABASE_CONFIG = {
    url: 'https://tu-proyecto.supabase.co',
    key: 'tu_anon_key_aqui',
    bucket: 'imagenes-mangas',
    enabled: false // Cambiar a true si usas Supabase
};

// Configuración de almacenamiento local
const CART_KEY = 'remangaCart';
const USER_KEY = 'remangaUser';

// Funciones de utilidad
const Config = {
    API_URL,
    isDevelopment,
    CART_KEY,
    USER_KEY,
    SUPABASE_CONFIG,
    
    /**
     * Obtiene la URL completa de una imagen
     * @param {string} nombreImagen - Nombre del archivo de imagen
     * @returns {string} URL completa de la imagen
     */
    getImageUrl(nombreImagen) {
        if (!nombreImagen) {
            return 'imagenes/onepiece1.webp';
        }
        
        // Si ya es una URL completa
        if (/^https?:\/\//i.test(nombreImagen)) {
            return nombreImagen;
        }
        
        // Si es una ruta relativa
        if (/^img\//i.test(nombreImagen)) {
            return nombreImagen;
        }
        
        // Si usamos Supabase Storage
        if (this.SUPABASE_CONFIG.enabled) {
            return `${this.SUPABASE_CONFIG.url}/storage/v1/object/public/${this.SUPABASE_CONFIG.bucket}/${nombreImagen}`;
        }
        
        // Ruta del API
        return `${API_URL}/imagenes/${encodeURIComponent(nombreImagen)}`;
    },
    
    /**
     * Hace una petición fetch al API
     * @param {string} endpoint - El endpoint del API
     * @param {object} options - Opciones de fetch
     * @returns {Promise}
     */
    async fetch(endpoint, options = {}) {
        const url = `${this.API_URL}${endpoint}`;
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Error ${response.status}`);
        }
        
        return response.json();
    }
};

// Exportar para uso en otros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
