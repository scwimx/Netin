// Windows usa el módulo nativo NetinNativo (windows/Netin/NetinNativo.h).
// La vista previa web resuelve index.web.ts en su lugar.
import { NativeModules } from 'react-native';
import { base64ABytes } from './base64';
import type { Plataforma } from './tipos';
export { base64ABytes, bytesABase64 } from './base64';

interface ModuloNativo {
  leerTexto(ruta: string): Promise<string | null>;
  escribirTexto(ruta: string, texto: string): Promise<void>;
  borrar(ruta: string): Promise<void>;
  aleatorioBase64(n: number): Promise<string>;
  tomarFoto(): Promise<string | null>;
  carpetaDatos(): Promise<string>;
  carpetaDocumentos(): Promise<string>;
  listarDocumentos(): Promise<string>;
  abrirDocumento(archivo: string): Promise<void>;
}

function moduloNativo(): ModuloNativo {
  const m = NativeModules.NetinNativo as ModuloNativo | undefined;
  if (!m) throw new Error('Falta el módulo nativo NetinNativo. Compila la app de Windows.');
  return m;
}

export const plataforma: Plataforma = {
  nombre: 'windows',
  leerTexto: (r) => moduloNativo().leerTexto(r),
  escribirTexto: (r, t) => moduloNativo().escribirTexto(r, t),
  borrar: (r) => moduloNativo().borrar(r),
  aleatorio: async (n) => base64ABytes(await moduloNativo().aleatorioBase64(n)),
  tomarFoto: () => moduloNativo().tomarFoto(),
  carpetaDatos: () => moduloNativo().carpetaDatos(),
  carpetaDocumentos: () => moduloNativo().carpetaDocumentos(),
  listarDocumentos: async () =>
    (JSON.parse(await moduloNativo().listarDocumentos()) as { archivo: string; bytes: number; modificado: string }[]).map((d) => ({
      ...d,
      modificado: new Date(Number(d.modificado) * 1000).toISOString(),
    })),
  abrirDocumento: (a) => moduloNativo().abrirDocumento(a),
};
