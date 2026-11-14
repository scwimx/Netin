// Base64 sin dependencias (Hermes no trae atob/btoa en todas las versiones).
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ABytes(b64: string): Uint8Array {
  const limpio = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const salida = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let bits = 0;
  let valor = 0;
  let j = 0;
  for (let i = 0; i < limpio.length; i++) {
    valor = (valor << 6) | ALFABETO.indexOf(limpio[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida[j++] = (valor >> bits) & 0xff;
    }
  }
  return salida.subarray(0, j);
}
export function bytesABase64(bytes: Uint8Array): string {
  let s = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + ALFABETO[(n >> 6) & 63] + ALFABETO[n & 63];
  }
  const resto = bytes.length - i;
  if (resto === 1) {
    const n = bytes[i] << 16;
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + '==';
  } else if (resto === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + ALFABETO[(n >> 6) & 63] + '=';
  }
  return s;
}
