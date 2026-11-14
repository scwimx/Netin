import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// Cada ejecución usa una carpeta de datos temporal: nunca toca datos reales.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "netin-prueba-"));
process.env.NETIN_DATOS = path.join(tmp, "datos");
process.env.NETIN_DOCUMENTOS = path.join(tmp, "documentos");
process.env.NETIN_SIN_ENV = "1";
process.env.NETIN_FECHA = "2026-11-10";

const { crearApp } = await import("../app.ts");
const db = await import("../db.ts");

let servidor: Server;
let base = "";

async function iniciar() {
  db.abrir();
  servidor = crearApp().listen(0, "127.0.0.1");
  await new Promise<void>((r) => servidor.once("listening", () => r()));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
}
async function detener() {
  await new Promise<void>((r) => servidor.close(() => r()));
  db.cerrar();
}

/** Cliente con su propia cookie de sesión, como un navegador distinto. */
function cliente() {
  let cookie = "";
  return async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: { ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const nueva = r.headers.get("set-cookie");
    if (nueva) cookie = nueva.split(";")[0];
    const tipo = r.headers.get("content-type") ?? "";
    const datos = tipo.includes("json") ? await r.json() : r.status === 204 ? null : await r.arrayBuffer();
    return { estado: r.status, datos: datos as any };
  };
}

// PNG mínimo válido (1x1) relleno hasta superar el tamaño mínimo aceptado.
const PNG =
  "data:image/png;base64," +
  Buffer.concat([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    Buffer.alloc(200),
  ]).toString("base64");

describe("Netin API", () => {
  const ana = cliente();
  const beto = cliente();
  let anaId = "";
  let sintomaId = "";

  before(iniciar);
  after(async () => {
    await detener();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("crea perfiles y guarda la contraseña con hash", async () => {
    const r = await ana("POST", "/perfiles", { nombre: "Ana Prueba", rol: "Ingeniera de vuelo", clave: "luna-1234", etapa: "orbita" });
    assert.equal(r.estado, 201);
    anaId = r.datos.id;
    assert.equal(r.datos.etapa, "orbita");
    const b = await beto("POST", "/perfiles", { nombre: "Beto Prueba", clave: "marte-5678" });
    assert.equal(b.estado, 201);

    const fila = db.bd().prepare("SELECT clave_hash FROM perfiles WHERE id = ?").get(anaId) as { clave_hash: string };
    assert.match(fila.clave_hash, /^scrypt\$/);
    assert.ok(!fila.clave_hash.includes("luna-1234"));

    const corta = await cliente()("POST", "/perfiles", { nombre: "X", clave: "123" });
    assert.equal(corta.estado, 400);
  });

  it("la lista pública de perfiles no expone datos de salud ni hashes", async () => {
    const r = await cliente()("GET", "/perfiles");
    assert.equal(r.datos.length, 2);
    assert.deepEqual(Object.keys(r.datos[0]).sort(), ["archivado", "demo", "etapa", "id", "nombre", "rol"]);
  });

  it("rechaza contraseñas incorrectas y entra con la correcta", async () => {
    const otro = cliente();
    assert.equal((await otro("POST", "/sesion", { perfilId: anaId, clave: "incorrecta" })).estado, 401);
    assert.equal((await otro("GET", "/yo")).estado, 401);
    assert.equal((await otro("POST", "/sesion", { perfilId: anaId, clave: "luna-1234" })).estado, 200);
    assert.equal((await otro("GET", "/yo")).datos.id, anaId);
    assert.equal((await otro("DELETE", "/sesion")).estado, 204);
    assert.equal((await otro("GET", "/yo")).estado, 401);
  });

  it("pide la foto diaria primero, permite repetirla y guarda una por fecha", async () => {
    assert.equal((await ana("GET", "/dia")).datos.siguiente, "foto");
    assert.equal((await ana("POST", "/foto", { imagen: PNG })).estado, 201);
    assert.equal((await ana("POST", "/foto", { imagen: PNG })).estado, 201); // repetir
    const fotos = (await ana("GET", "/registros?tipo=foto")).datos;
    assert.equal(fotos.length, 1);
    assert.equal(fotos[0].etapa, "orbita");
    assert.ok(fs.existsSync(path.join(process.env.NETIN_DATOS!, "fotos", anaId, "2026-11-10.png")));
    assert.equal((await ana("GET", "/fotos/2026-11-10")).estado, 200);

    const dia = (await ana("GET", "/dia")).datos;
    assert.equal(dia.foto, "hecha");
    assert.equal(dia.siguiente, "chequeo");
  });

  it("permite seguir sin cámara", async () => {
    const r = await beto("POST", "/foto", { omitida: true, motivo: "Cámara no disponible" });
    assert.equal(r.estado, 201);
    assert.equal((await beto("GET", "/dia")).datos.foto, "omitida");
  });

  it("guarda el chequeo con síntomas nuevos y reanuda el siguiente paso", async () => {
    const entrada = {
      animo: 3, animoTexto: "Algo cansada", suenoHoras: 6, estres: 3, seguimiento: [], notas: "",
      nuevos: [{ zona: "hombro_der", manifestacion: "Tensión muscular", intensidad: 3, inicio: "hoy", notas: "Tras ejercicio resistivo" }],
    };
    const resumen = await ana("POST", "/chequeo/resumen", entrada);
    assert.equal(resumen.datos.origen, "automatico");
    assert.match(resumen.datos.texto, /hombro derecho/);

    const r = await ana("POST", "/chequeo", { ...entrada, resumen: { texto: resumen.datos.texto + " Editado.", origen: "automatico", editado: true } });
    assert.equal(r.estado, 201);
    sintomaId = r.datos.sintomasNuevos[0].id;
    assert.equal((await ana("GET", "/dia")).datos.siguiente, "motora");
    // El sueño del chequeo queda como medición manual
    const sueno = (await ana("GET", "/registros?tipo=vital")).datos;
    assert.equal(sueno[0].datos.indicador, "sueno");
    assert.equal(sueno[0].datos.origen, "manual");
  });

  it("aísla los datos entre perfiles", async () => {
    assert.equal((await beto("GET", `/registros/${sintomaId}`)).estado, 404);
    assert.equal((await beto("PATCH", `/registros/${sintomaId}`, { datos: {} })).estado, 404);
    assert.equal((await beto("DELETE", `/registros/${sintomaId}`)).estado, 404);
    assert.equal((await beto("GET", "/fotos/2026-11-10")).estado, 404);
    assert.equal((await beto("GET", "/registros?tipo=sintoma")).datos.length, 0);
    assert.equal((await beto("GET", "/chequeo/pendientes")).datos.length, 0);
    assert.ok((await beto("GET", "/ia/pendientes")).datos.every((e: any) => e.registroId !== sintomaId));
  });

  it("registra la prueba motora y la compara con la anterior", async () => {
    let r = await ana("POST", "/registros", { tipo: "motora", datos: { prueba: "reaccion_visual", intentos: [300, 320, 310, 330, 305], anticipos: 0 } });
    assert.equal(r.estado, 201);
    assert.equal(r.datos.datos.mediana, 310);
    r = await ana("POST", "/registros", { tipo: "motora", datos: { prueba: "reaccion_visual", intentos: [280, 290, 285, 300, 295], anticipos: 1, mediana: 1 } });
    assert.equal(r.datos.datos.mediana, 290, "la mediana se calcula en el servidor");
    const c = (await ana("GET", "/motora/comparacion")).datos;
    assert.equal(c.pruebas, 2);
    assert.equal(c.frenteAnterior, -20);
    assert.match(c.texto, /20 ms más rápida/);
  });

  it("guarda la bitácora tal como se escribió", async () => {
    const entrada = "Hoy vi la Tierra desde la cúpula.\nMe sentí tranquila.";
    const r = await ana("POST", "/registros", { tipo: "bitacora", datos: { entrada } });
    assert.equal(r.datos.datos.entrada, entrada);
    assert.equal(r.datos.datos.resumen, null);
    assert.equal((await ana("GET", "/dia")).datos.siguiente, null);
  });

  it("conserva los datos al reiniciar el servidor", async () => {
    await detener();
    await iniciar();
    const r = await ana("GET", "/registros");
    assert.equal(r.estado, 200, "la sesión sigue activa");
    assert.ok(r.datos.length >= 6);
    assert.equal((await ana("GET", "/dia")).datos.foto, "hecha");
  });

  it("al día siguiente pide foto otra vez y hace seguimiento del síntoma pendiente", async () => {
    process.env.NETIN_FECHA = "2026-11-11";
    assert.equal((await ana("GET", "/dia")).datos.siguiente, "foto");
    const pend = (await ana("GET", "/chequeo/pendientes")).datos;
    assert.equal(pend.length, 1);
    assert.equal(pend[0].id, sintomaId);

    const r = await ana("POST", "/chequeo", {
      animo: 4, animoTexto: "", suenoHoras: null, estres: 2, nuevos: [], notas: "",
      seguimiento: [{ sintomaId, zona: "hombro_der", manifestacion: "Tensión muscular", estado: "mejor", intensidad: 2 }],
      resumen: { texto: "Mejor del hombro.", origen: "automatico" },
    });
    assert.equal(r.estado, 201);
    const s = (await ana("GET", `/registros/${sintomaId}`)).datos;
    assert.equal(s.datos.intensidad, 2);
    assert.equal(s.datos.seguimientos.length, 1);
    assert.equal(s.revisiones, 1);

    await ana("POST", `/sintomas/${sintomaId}/seguimiento`, { estado: "resuelto" });
    assert.equal((await ana("GET", "/chequeo/pendientes")).datos.length, 0);
  });

  it("corrige reportes conservando el historial y elimina con confirmación del cliente", async () => {
    const s = (await ana("GET", `/registros/${sintomaId}`)).datos;
    const r = await ana("PATCH", `/registros/${sintomaId}`, { datos: { ...s.datos, zona: "hombro_izq" }, motivo: "Era el otro hombro" });
    assert.equal(r.datos.datos.zona, "hombro_izq");
    const hist = (await ana("GET", `/registros/${sintomaId}/revisiones`)).datos;
    assert.equal(hist[0].motivo, "Era el otro hombro");
    assert.equal(hist[0].datos.zona, "hombro_der");

    const tmpReg = (await ana("POST", "/registros", { tipo: "vital", datos: { indicador: "fc", valor: 64 } })).datos;
    assert.equal((await ana("DELETE", `/registros/${tmpReg.id}`)).estado, 204);
    assert.equal((await ana("GET", `/registros/${tmpReg.id}`)).estado, 404);
  });

  it("deja los reportes en la cola para la IA futura con lo reportado y lo medido separados", async () => {
    await ana("POST", "/mensajes", { texto: "Me duele un poco el hombro" });
    const estado = (await ana("GET", "/ia/estado")).datos;
    assert.equal(estado.integrada, false);
    assert.ok(estado.pendientes > 5);

    const ev = (await ana("GET", "/ia/pendientes")).datos;
    const sintoma = ev.find((e: any) => e.tipo === "sintoma" && e.accion === "creado");
    assert.equal(sintoma.datos.reportado.zonaNombre, "Hombro izquierdo");
    const motora = ev.find((e: any) => e.tipo === "motora");
    assert.equal(motora.datos.medido.unidad, "ms");
    assert.ok(ev.some((e: any) => e.accion === "corregido"));
    assert.ok(ev.some((e: any) => e.accion === "eliminado"));
    assert.ok(ev.some((e: any) => e.tipo === "mensaje" && e.datos.reportado.texto.includes("hombro")));

    const ultimo = ev.at(-1).evento;
    assert.equal((await ana("POST", "/ia/procesados", { hasta: ultimo })).datos.marcados, ev.length);
    assert.equal((await ana("GET", "/ia/estado")).datos.pendientes, 0);
  });

  it("valida los datos de entrada", async () => {
    assert.equal((await ana("POST", "/registros", { tipo: "vital", datos: { indicador: "fc", valor: 9999 } })).estado, 400);
    assert.equal((await ana("POST", "/registros", { tipo: "sintoma", datos: { zona: "ala", manifestacion: "x", intensidad: 3, inicio: "hoy" } })).estado, 400);
    assert.equal((await ana("POST", "/foto", { imagen: "data:text/html;base64,AAAA" })).estado, 400);
    assert.equal((await ana("GET", "/documentos/abrir?archivo=../datos/netin.db")).estado, 404);
  });

  it("importa mediciones desde CSV como «importada»", async () => {
    const r = await ana("POST", "/vitales/importar", { csv: "fecha,indicador,valor,valor2\n2026-11-09T08:00:00Z,fc,61\n2026-11-09T08:00:00Z,pa,115,75\nmal,fc,1" });
    assert.equal(r.datos.importadas, 2);
    assert.equal(r.datos.errores.length, 1);
    const v = (await ana("GET", "/registros?tipo=vital&fecha=2026-11-09")).datos;
    assert.ok(v.every((x: any) => x.datos.origen === "importada"));
  });

  it("archiva, restaura y elimina un perfil con su contraseña", async () => {
    const id = (await beto("GET", "/yo")).datos.id;
    const otro = cliente();
    assert.equal((await otro("POST", `/perfiles/${id}/archivar`, { clave: "mala-clave" })).estado, 401);
    assert.equal((await otro("POST", `/perfiles/${id}/archivar`, { clave: "marte-5678" })).estado, 204);
    assert.equal((await beto("GET", "/yo")).estado, 401, "archivar cierra la sesión");
    assert.equal((await otro("POST", "/sesion", { perfilId: id, clave: "marte-5678" })).estado, 403);
    assert.equal((await otro("POST", `/perfiles/${id}/restaurar`, { clave: "marte-5678" })).estado, 204);
    assert.equal((await otro("POST", `/perfiles/${id}/eliminar`, { clave: "marte-5678" })).estado, 204);
    assert.equal((await cliente()("GET", "/perfiles")).datos.length, 1);
    const quedan = db.bd().prepare("SELECT COUNT(*) AS n FROM registros WHERE perfil_id = ?").get(id) as { n: number };
    assert.equal(Number(quedan.n), 0);
  });
});
