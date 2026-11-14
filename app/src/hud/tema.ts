import { Platform } from 'react-native';
import type { EtapaId } from '../datos/catalogos';

// Estética de HUD de videojuego: fondo de espacio profundo, paneles con
// esquinas marcadas, medidores segmentados y un acento que cambia con la etapa.

export const color = {
  espacio: '#03050c',
  panel: 'rgba(9, 17, 34, 0.86)',
  panelAlto: 'rgba(18, 32, 60, 0.9)',
  linea: '#1b2f52',
  lineaSuave: 'rgba(80, 130, 200, 0.18)',
  tinta: '#eaf3ff',
  suave: '#9cb2d6',
  tenue: '#5d7398',
  // Estados reservados (siempre con ícono y etiqueta)
  bien: '#4cf08a',
  aviso: '#ffd23f',
  serio: '#ff8a3d',
  critico: '#ff3b5c',
  info: '#5aa8ff',
  // Series de gráficas (validadas sobre el panel oscuro)
  serie1: '#2a9cc8',
  serie2: '#d0782e',
};

export const ACENTO: Record<EtapaId, { base: string; oscuro: string; nombre: string }> = {
  tierra: { base: '#2ef2c4', oscuro: '#032b22', nombre: 'Tierra' },
  orbita: { base: '#38e8ff', oscuro: '#032630', nombre: 'Órbita' },
  transito: { base: '#b48bff', oscuro: '#1a0f3a', nombre: 'Tránsito' },
  marte: { base: '#ff9d4a', oscuro: '#331604', nombre: 'Marte' },
};

const web = Platform.OS === 'web';
export const fuente = {
  hud: web ? 'Bahnschrift, "Barlow Semi Condensed", "Segoe UI", sans-serif' : 'Bahnschrift',
  texto: web ? '"Segoe UI Variable Text", "Segoe UI", sans-serif' : 'Segoe UI',
  iconos: web ? '"Segoe Fluent Icons", "Segoe MDL2 Assets"' : 'Segoe MDL2 Assets',
};

/** Glifos de Segoe MDL2 Assets (incluida en Windows 10 y 11). */
export const icono = {
  inicio: '',
  asistente: '',
  salud: '',
  registros: '',
  documentos: '',
  ajustes: '',
  camara: '',
  alerta: '',
  ok: '',
  cerrar: '',
  atras: '',
  adelante: '',
  agregar: '',
  borrar: '',
  editar: '',
  historial: '',
  candado: '',
  persona: '',
  personas: '',
  tierra: '',
  orbita: '',
  transito: '',
  marte: '',
  estrella: '',
  estrellaVacia: '',
  rayo: '',
  cronometro: '',
  libro: '',
  mente: '',
  cuerpo: '',
  grafica: '',
  enviar: '',
  actualizar: '',
  jugar: '',
  carpeta: '',
  abrir: '',
  salir: '',
  archivar: '',
  llave: '',
  sirena: '',
  satelite: '',
  info: '',
};
