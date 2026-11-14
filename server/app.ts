import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { INDICADORES, type Perfil } from "../compartido/catalogos.ts";
import { ahora, dirDocumentos, hoy, RAIZ } from "./config.ts";
import { bd } from "./db.ts";
import { ErrorApp, invalido, noEncontrado, texto } from "./errores.ts";
import * as perfiles from "./perfiles.ts";
import * as registros from "./registros.ts";
import { compararMotora, resumenChequeoAuto } from "./resumenes.ts";
import { encolar, estadoCola, marcarProcesados, pendientes } from "./salida-ia.ts";
import { nuevoId } from "./seguridad.ts";

const COOKIE = "netin_sesion";

declare module "express-serve-static-core" {
  interface Request {
    perfil?: Perfil;
    token?: string;
  }
}

function leerCookie(req: Request): string | undefined {
  const crudo = req.headers.cookie;
  if (!crudo) return undefined;
  for (const parte of crudo.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function ponerCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 14 * 864e5 });
}

/** Exige sesión. Todo lo que cuelga de aquí queda acotado a req.perfil. */
function sesion(req: Request, _res: Response, next: NextFunction) {
  const token = leerCookie(req);
  const perfil = perfiles.perfilDeToken(token);
  if (!perfil) return next(new ErrorApp(401, "Tu sesión terminó. Vuelve a entrar."));
  req.perfil = perfil;
  req.token = token;
  next();
}

const yo = (req: Request) => req.perfil!;

export function crearApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8mb" }));

  const api = express.Router();

  // ---------- Perfiles y sesión ----------

  api.get("/perfiles", (_req, res) => {
    res.json(perfiles.listar());
  });

  api.post("/perfiles", (req, res) => {
    const perfil = perfiles.crear(req.body ?? {});
    ponerCookie(res, perfiles.abrirSesion(perfil.id));
    res.status(201).json(perfil);
  });

  api.post("/sesion", (req, res) => {
    const { token, perfil } = perfiles.iniciarSesion(texto(req.body?.perfilId, 60, "el perfil", true), req.body?.clave);
    ponerCookie(res, token);
    res.json(perfil);
  });

  api.delete("/sesion", (req, res) => {
    perfiles.cerrarSesion(leerCookie(req));
    res.clearCookie(COOKIE, { path: "/" });
    res.status(204).end();
  });

  // Archivar, restaurar y eliminar piden la contraseña del perfil afectado,
  // así se pueden gestionar desde la pantalla de selección o desde Ajustes.
  api.post("/perfiles/:id/archivar", (req, res) => {
    perfiles.archivar(req.params.id, req.body?.clave);
    res.status(204).end();
  });
  api.post("/perfiles/:id/restaurar", (req, res) => {
    perfiles.restaurar(req.params.id, req.body?.clave);
    res.status(204).end();
  });
  api.post("/perfiles/:id/eliminar", (req, res) => {
    perfiles.eliminar(req.params.id, req.body?.clave);
    res.status(204).end();
  });

  api.use(sesion);

  api.get("/yo", (req, res) => {
    res.json(yo(req));
  });
  api.patch("/yo", (req, res) => {
    res.json(perfiles.actualizar(yo(req).id, req.body ?? {}));
  });
  api.post("/yo/clave", (req, res) => {
    perfiles.cambiarClave(yo(req).id, req.body?.actual, req.body?.nueva);
    // Se cerraron todas las sesiones; se abre una nueva para este navegador.
    ponerCookie(res, perfiles.abrirSesion(yo(req).id));
    res.status(204).end();
  });

  // ---------- Día y foto ----------

  api.get("/dia", (req, res) => {
    res.json(registros.estadoDia(yo(req).id));
  });

  api.post("/foto", (req, res) => {
    res.status(201).json(registros.guardarFoto(yo(req).id, yo(req).etapa, req.body));
  });

  api.get("/fotos/:fecha", (req, res) => {
    const ruta = registros.rutaFoto(yo(req).id, req.params.fecha);
    if (!ruta) throw noEncontrado("No hay foto para esa fecha.");
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(ruta);
  });

  // ---------- Borradores ----------

  api.get("/borradores/:clave", (req, res) => {
    res.json(registros.leerBorrador(yo(req).id, req.params.clave));
  });
  api.put("/borradores/:clave", (req, res) => {
    registros.guardarBorrador(yo(req).id, req.params.clave, req.body?.datos);
    res.status(204).end();
  });
  api.delete("/borradores/:clave", (req, res) => {
    registros.borrarBorrador(yo(req).id, req.params.clave);
    res.status(204).end();
  });

  // ---------- Chequeo diario ----------

  api.get("/chequeo/pendientes", (req, res) => {
    res.json(registros.sintomasActivos(yo(req).id));
  });

  api.post("/chequeo/resumen", (req, res) => {
    const { resumen: _r, ...d } = registros.validarChequeo({ ...req.body, resumen: { texto: "-", origen: "automatico" } });
    res.json({ texto: resumenChequeoAuto(d), origen: "automatico" });
  });

  api.post("/chequeo", (req, res) => {
    res.status(201).json(registros.guardarChequeo(yo(req).id, yo(req).etapa, req.body));
  });

  // ---------- Registros ----------

  api.get("/registros", (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json(registros.listar(yo(req).id, { tipo: q.tipo, desde: q.desde, hasta: q.hasta, fecha: q.fecha, limite: q.limite ? Number(q.limite) : undefined }));
  });
  api.post("/registros", (req, res) => {
    res.status(201).json(registros.crear(yo(req).id, yo(req).etapa, req.body?.tipo, req.body?.datos));
  });
  api.get("/registros/:id", (req, res) => {
    res.json(registros.obtener(yo(req).id, req.params.id));
  });
  api.get("/registros/:id/revisiones", (req, res) => {
    res.json(registros.revisiones(yo(req).id, req.params.id));
  });
  api.patch("/registros/:id", (req, res) => {
    res.json(registros.corregir(yo(req).id, req.params.id, req.body?.datos, req.body?.motivo));
  });
  api.delete("/registros/:id", (req, res) => {
    registros.eliminar(yo(req).id, req.params.id);
    res.status(204).end();
  });

  api.post("/sintomas/:id/seguimiento", (req, res) => {
    res.json(registros.seguirSintoma(yo(req).id, req.params.id, req.body ?? {}));
  });

  // ---------- Prueba motora ----------

  api.get("/motora/comparacion", (req, res) => {
    res.json(compararMotora(yo(req).id));
  });

  // ---------- Mediciones ----------

  api.post("/vitales/importar", (req, res) => {
    res.json(registros.importarVitales(yo(req).id, yo(req).etapa, req.body?.csv));
  });

  /**
   * Genera una medición simulada por indicador para probar la interfaz.
   * Quedan marcadas con origen «simulada». Los valores salen de rangos de
   * demostración fijos, no de criterios clínicos.
   */
  api.post("/vitales/simular", (req, res) => {
    const demo: Record<string, [number, number]> = { fc: [58, 82], spo2: [96, 99], temp: [36.2, 37.0], peso: [68, 72], sueno: [5.5, 8] };
    const azar = (a: number, b: number, dec = 0) => Number((a + Math.random() * (b - a)).toFixed(dec));
    const creados = INDICADORES.map((ind) => {
      const datos: Record<string, unknown> = { indicador: ind.id, origen: "simulada", medidoEn: ahora() };
      if (ind.id === "pa") Object.assign(datos, { valor: azar(108, 124), valor2: azar(68, 80) });
      else Object.assign(datos, { valor: azar(...demo[ind.id], ind.id === "temp" || ind.id === "sueno" || ind.id === "peso" ? 1 : 0) });
      return registros.crear(yo(req).id, yo(req).etapa, "vital", datos);
    });
    res.status(201).json(creados);
  });

  // ---------- Conversación (se guarda para la IA futura) ----------

  api.get("/mensajes", (req, res) => {
    const filas = bd()
      .prepare("SELECT id, autor, texto, meta, creado FROM mensajes WHERE perfil_id = ? ORDER BY creado LIMIT 500")
      .all(yo(req).id) as unknown as { id: string; autor: string; texto: string; meta: string; creado: string }[];
    res.json(filas.map((f) => ({ ...f, meta: JSON.parse(f.meta) })));
  });
  api.post("/mensajes", (req, res) => {
    const t = texto(req.body?.texto, 4000, "el mensaje", true);
    const id = nuevoId();
    const creado = ahora();
    const meta = { etapa: yo(req).etapa, fecha: hoy() };
    bd().prepare("INSERT INTO mensajes(id, perfil_id, autor, texto, meta, creado) VALUES(?,?,?,?,?,?)").run(id, yo(req).id, "usuario", t, JSON.stringify(meta), creado);
    encolar(yo(req).id, id, "mensaje", "creado");
    res.status(201).json({ id, autor: "usuario", texto: t, meta, creado });
  });

  // ---------- Salida hacia la IA futura ----------

  api.get("/ia/estado", (req, res) => {
    res.json({ integrada: false, ...estadoCola(yo(req).id) });
  });
  api.get("/ia/pendientes", (req, res) => {
    res.json(pendientes(yo(req).id, Number(req.query.limite ?? 200)));
  });
  api.post("/ia/procesados", (req, res) => {
    const hasta = Number(req.body?.hasta);
    if (!Number.isInteger(hasta) || hasta < 1) throw invalido("Indica hasta qué evento se procesó.");
    res.json({ marcados: marcarProcesados(yo(req).id, hasta) });
  });

  // ---------- Documentos locales (solo lectura) ----------

  api.get("/documentos", (_req, res) => {
    const base = dirDocumentos();
    fs.mkdirSync(base, { recursive: true });
    const lista: { archivo: string; titulo: string; tipo: string; bytes: number; modificado: string }[] = [];
    const recorrer = (sub: string) => {
      for (const e of fs.readdirSync(path.join(base, sub), { withFileTypes: true })) {
        const rel = sub ? `${sub}/${e.name}` : e.name;
        if (e.isDirectory()) recorrer(rel);
        else if (/\.(pdf|txt|md)$/i.test(e.name) && e.name.toLowerCase() !== "leeme.md") {
          const st = fs.statSync(path.join(base, rel));
          lista.push({ archivo: rel, titulo: e.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), tipo: e.name.split(".").pop()!.toLowerCase(), bytes: st.size, modificado: st.mtime.toISOString() });
        }
      }
    };
    recorrer("");
    res.json({ carpeta: base, documentos: lista.sort((a, b) => a.titulo.localeCompare(b.titulo)) });
  });
  api.get("/documentos/abrir", (req, res) => {
    const base = dirDocumentos();
    const ruta = path.resolve(base, String(req.query.archivo ?? ""));
    if (!ruta.startsWith(base + path.sep) || !fs.existsSync(ruta)) throw noEncontrado("Ese documento no está en la carpeta.");
    res.sendFile(ruta);
  });

  app.use("/api", api);
  app.use("/api", (_req, _res, next) => next(noEncontrado("Esa ruta no existe.")));

  // En producción se sirve la interfaz compilada.
  const dist = path.join(RAIZ, "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErrorApp) return res.status(err.estado).json({ error: err.message });
    if (err instanceof SyntaxError) return res.status(400).json({ error: "La petición no es JSON válido." });
    if ((err as { type?: string })?.type === "entity.too.large") return res.status(413).json({ error: "El archivo es demasiado grande." });
    console.error(err);
    res.status(500).json({ error: "Algo falló en el servidor. Revisa la terminal." });
  });

  return app;
}
