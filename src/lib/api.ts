// Cliente HTTP de la API local. Lanza ErrorApi con el mensaje del servidor.

export class ErrorApi extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

let alExpirar: (() => void) | null = null;
/** La app registra aquí qué hacer cuando la sesión termina. */
export const alPerderSesion = (fn: () => void) => {
  alExpirar = fn;
};

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: "same-origin",
      headers: cuerpo !== undefined ? { "content-type": "application/json" } : undefined,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, "No hay conexión con el servidor de Netin. Revisa que esté encendido.");
  }
  if (r.status === 204) return undefined as T;
  const datos = r.headers.get("content-type")?.includes("json") ? await r.json() : null;
  if (!r.ok) {
    if (r.status === 401 && !ruta.startsWith("/sesion") && !ruta.includes("/perfiles")) alExpirar?.();
    throw new ErrorApi(r.status, datos?.error ?? `Error ${r.status}`);
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>("GET", ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>("POST", ruta, cuerpo ?? {}),
  put: <T>(ruta: string, cuerpo?: unknown) => pedir<T>("PUT", ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo?: unknown) => pedir<T>("PATCH", ruta, cuerpo ?? {}),
  del: <T>(ruta: string) => pedir<T>("DELETE", ruta),
};
