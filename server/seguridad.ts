import crypto from "node:crypto";

// Contraseñas: scrypt con sal aleatoria por perfil. Nunca se guarda el texto.
const N = 16384;
const LARGO = 64;

export function hashClave(clave: string): string {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave.normalize("NFKC"), sal, LARGO, { N });
  return `scrypt$${N}$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [alg, n, sal, hash] = guardado.split("$");
  if (alg !== "scrypt" || !n || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const obtenido = crypto.scryptSync(clave.normalize("NFKC"), Buffer.from(sal, "base64"), esperado.length, {
    N: Number(n),
  });
  return crypto.timingSafeEqual(esperado, obtenido);
}

export const nuevoToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
export const nuevoId = () => crypto.randomUUID();

// Freno simple contra intentos repetidos de contraseña (en memoria).
const intentos = new Map<string, { n: number; hasta: number }>();
export function bloqueado(clave: string): number {
  const i = intentos.get(clave);
  if (!i || i.hasta < Date.now()) return 0;
  return Math.ceil((i.hasta - Date.now()) / 1000);
}
export function anotarFallo(clave: string) {
  const i = intentos.get(clave) ?? { n: 0, hasta: 0 };
  i.n += 1;
  if (i.n >= 5) i.hasta = Date.now() + Math.min(300, 15 * (i.n - 4)) * 1000;
  intentos.set(clave, i);
}
export const limpiarFallos = (clave: string) => intentos.delete(clave);
