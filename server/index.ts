import { crearApp } from "./app.ts";
import { dirDatos, PUERTO } from "./config.ts";
import { abrir } from "./db.ts";

abrir();
crearApp().listen(PUERTO, "127.0.0.1", () => {
  console.log(`Netin API en http://127.0.0.1:${PUERTO}`);
  console.log(`Datos en ${dirDatos()}`);
});
