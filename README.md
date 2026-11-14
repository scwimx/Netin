# Netin

Netin es una app de escritorio para Windows que monitorea la salud de la tripulación en Tierra, en órbita, en tránsito y en Marte. La hicimos para NASA Space Apps con React Native for Windows. La interfaz es amigable y animada, con estética de consola espacial, pero no es un juego: no hay puntos, niveles ni premios.

Cada día, el tripulante completa un registro de cuatro pasos: foto, chequeo, prueba de reacción y bitácora. Además, puede anotar síntomas en un mapa corporal y revisar sus mediciones y tendencias.

Todo se guarda en el equipo, cifrado con la contraseña de cada perfil.

> La versión web anterior (Node + Vite) quedó en el historial de git, commit `ad27085`.

## Requisitos para compilar (Windows)

React Native for Windows 0.85 necesita:

- **Visual Studio 2026** con las cargas de trabajo «Desarrollo para el escritorio con C++», «Desarrollo de la Plataforma universal de Windows» y «Desarrollo de escritorio de .NET», más el Windows SDK 10.0.22621.
- **.NET 10 SDK.**
- **Node.js 22 o superior** y **Yarn**.
- Modo de desarrollador y rutas largas activados.

Para instalar todo de una vez, abre **PowerShell como administrador** dentro de `app` y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File node_modules\react-native-windows\scripts\rnw-dependencies.ps1 -Install
```

Si en tu PATH hay un Node antiguo (por ejemplo, el de Brackets), pon `C:\Program Files\nodejs` antes que él.

## Cómo ejecutar

Todos los comandos se ejecutan dentro de `app`:

```powershell
cd app
npm install
```

Generar el proyecto de Windows (solo la primera vez, ver «Primer armado del proyecto de Windows»):

```powershell
npx react-native init-windows --overwrite
```

Ejecutar en modo desarrollo:

```powershell
npm run windows
```

Generar el ejecutable de lanzamiento:

```powershell
npm run windows:release
```

El ejecutable queda en `app\windows\x64\Release\Netin\`. Para crear un paquete instalable, abre `app\windows\Netin.sln` en Visual Studio y usa **Proyecto > Publicar > Crear paquetes de aplicación**.

### Vista previa del diseño en el navegador

Sirve para revisar la interfaz sin compilar. Guarda los datos en el navegador, no usa la cámara y no es la app real.

```powershell
npm run vista
```

Abre http://127.0.0.1:5180.

### Tripulante de demostración

En la pantalla de selección, el botón «Cargar tripulante de demostración» crea a **Astra Demo** (contraseña `demo-netin`) con 14 días de datos ficticios. El perfil queda marcado como «Datos ficticios» y sus mediciones como «Simulada». No se generan fotos, y estos datos no entran en la cola para la IA.

## Dónde se guarda cada cosa

| Qué | Dónde |
| --- | --- |
| Lista de perfiles (nombre, rol, etapa, sal y verificador de la contraseña) | `%LOCALAPPDATA%\Netin\datos\perfiles.json` |
| Bóveda de cada perfil: registros, historial de correcciones, borradores, conversación y cola para la IA | `%LOCALAPPDATA%\Netin\datos\perfiles\<id>\boveda.json` (cifrada) |
| Fotos diarias | `%LOCALAPPDATA%\Netin\datos\perfiles\<id>\fotos\<fecha>.json` (cifradas) |
| Documentos de la misión (PDF y textos) | `%LOCALAPPDATA%\Netin\documentos\` |

La clave de cifrado sale de la contraseña con scrypt y nunca se guarda. La bóveda y las fotos se cifran con AES-256-GCM. Sin la contraseña de un perfil no se pueden leer sus datos, y cambiar la contraseña vuelve a cifrar todo.

## Estructura del código (`app/`)

```
App.tsx                 rutas: acceso, registro diario y pantallas principales
src/datos/              lógica local, sin servidor
  boveda.ts               perfiles, contraseñas, cifrado y sesión
  registros.ts            validación, correcciones, síntomas, chequeo, foto y cola para la IA
  pendientes.ts           alertas que salen de los registros
  demo.ts                 tripulante de demostración
  catalogos.ts            etapas, zonas del cuerpo, indicadores y tipos
src/plataforma/         acceso a Windows: index.ts (módulo nativo) e index.web.ts (vista previa)
src/hud/                sistema visual: tema, paneles, medidores, fondo animado, mapa corporal y gráficas
src/pantallas/          Acceso, registro diario, Inicio, Salud, Registros, Asistente, Documentos y Ajustes
windows-nativo/         módulo nativo en C++ (archivos, azar seguro, cámara, documentos)
vista/                  configuración de la vista previa web
```

### Primer armado del proyecto de Windows

`init-windows` necesita el .NET SDK, así que la carpeta `app/windows` todavía no existe en el repositorio. Después de generarla:

1. Copia `windows-nativo/NetinNativo.h` a `windows/Netin/`.
2. En el archivo del `ReactPackageProvider` de la app, incluye `NetinNativo.h` y registra los módulos con `AddAttributedModules`.
3. Compila con `npm run windows`.

## Conectar la IA más adelante

La IA no está integrada. Cada registro que se crea, corrige o elimina, y cada mensaje del Asistente, deja un evento en `colaIA` dentro de la bóveda del perfil.

- `pendientesIA(sesion)` en `src/datos/registros.ts` devuelve cada evento con un paquete que separa lo **reportado** por la persona de lo **medido** y del contexto (fecha y etapa).
- `marcarProcesados(sesion, hasta)` marca los eventos como leídos.
- Los resúmenes llevan `origen` (`automatico`, `ia` o `simulado`) y la interfaz los etiqueta según ese campo.

El asistente deberá distinguir lo reportado, lo medido y lo que dice una fuente; no inventar diagnósticos, umbrales, dosis ni protocolos; y remitir al responsable médico de la misión cuando falte respaldo.

## Estado

**Verificado:**

- Revisión de tipos (`npm run typecheck`).
- En la vista previa web: crear y elegir perfil, entrar con contraseña, cargar el tripulante de demostración y completar el registro diario.

**Pendiente de verificar:**

- Compilar y ejecutar el `.exe`, que espera a que se instalen Visual Studio 2026 con sus cargas de trabajo y el .NET 10 SDK.
- El módulo nativo en C++, incluida la cámara, que todavía no se ha compilado.

**Simulado:** las mediciones del botón «Simular» y las del tripulante de demostración. La guía del chequeo usa preguntas fijas y no es IA.

**Pendiente de integración:**

- Asistente con IA: la conversación se guarda, pero todavía no responde.
- Interpretaciones en Mental y Habilidades motoras.
- Posibles explicaciones con respaldo en el mapa corporal.
- Guías por indicador: la app muestra «Sin documento de respaldo».
- Búsqueda en los documentos.
- Avisos compartidos con la tripulación.
- ARCHeR, que aparece marcado como «Integración futura».
