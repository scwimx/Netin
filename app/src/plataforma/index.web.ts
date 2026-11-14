// Solo para la vista previa del diseño en el navegador (npm run vista).
// Guarda en localStorage del navegador; no es el almacenamiento real de la app.
import type { Plataforma } from './tipos';
export { base64ABytes, bytesABase64 } from './base64';

const PREFIJO = 'netin-vista:';

export const plataforma: Plataforma = {
  nombre: 'web',
  async leerTexto(ruta) {
    return localStorage.getItem(PREFIJO + ruta);
  },
  async escribirTexto(ruta, texto) {
    localStorage.setItem(PREFIJO + ruta, texto);
  },
  async borrar(ruta) {
    for (const k of Object.keys(localStorage)) if (k === PREFIJO + ruta || k.startsWith(PREFIJO + ruta + '/')) localStorage.removeItem(k);
  },
  async aleatorio(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  },
  async tomarFoto() {
    throw new Error('La vista previa web no usa la cámara. Prueba la foto en la app de Windows.');
  },
  async carpetaDatos() {
    return 'localStorage del navegador (vista previa)';
  },
  async carpetaDocumentos() {
    return 'Disponible en la app de Windows';
  },
  async listarDocumentos() {
    return [];
  },
  async abrirDocumento() {},
};
