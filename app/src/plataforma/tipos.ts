/** Acceso al sistema: archivos, azar seguro, cámara y documentos. */
export interface Plataforma {
  nombre: 'windows' | 'web';
  /** Rutas relativas a la carpeta de datos de Netin. */
  leerTexto(ruta: string): Promise<string | null>;
  /** Escritura atómica (archivo temporal + reemplazo). */
  escribirTexto(ruta: string, texto: string): Promise<void>;
  borrar(ruta: string): Promise<void>;
  aleatorio(n: number): Promise<Uint8Array>;
  /** Toma una foto con la cámara predeterminada. Devuelve JPEG en base64, o null si se canceló. */
  tomarFoto(): Promise<string | null>;
  carpetaDatos(): Promise<string>;
  carpetaDocumentos(): Promise<string>;
  listarDocumentos(): Promise<{ archivo: string; bytes: number; modificado: string }[]>;
  abrirDocumento(archivo: string): Promise<void>;
}
