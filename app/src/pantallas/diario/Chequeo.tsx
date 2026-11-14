import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorNetin } from '../../datos/boveda';
import {
  ESTADOS_SEGUIMIENTO,
  INICIOS,
  INTENSIDADES,
  MANIFESTACIONES,
  nombreIntensidad,
  nombreZona,
  type DatosSintoma,
  type EstadoSeguimiento,
  type Registro,
  type ZonaId,
} from '../../datos/catalogos';
import { guardarBorrador, guardarChequeo, leerBorrador, resumenChequeo, sintomasActivos, validarChequeo } from '../../datos/registros';
import { useSesion } from '../../estado/App';
import { alfa, useAcento } from '../../hud/Acento';
import { Boton, Campo, Entrada, Icono, Opciones, Origen, T, est } from '../../hud/componentes';
import { Figura } from '../../hud/MapaCorporal';
import { color, icono } from '../../hud/tema';

interface Nuevo {
  zona: ZonaId | null;
  manifestacion: string;
  intensidad: number;
  inicio: string;
  notas: string;
}
interface Respuestas {
  animo: number;
  animoTexto: string;
  suenoHoras: number | null;
  estres: number;
  seguimiento: { estado: EstadoSeguimiento | null; intensidad?: number }[];
  nuevos: Nuevo[];
  notas: string;
}
type Paso = { id: 'animo' | 'animoTexto' | 'sueno' | 'estres' | 'nuevo' | 'nZona' | 'nTipo' | 'nInt' | 'nInicio' | 'nNotas' | 'notas' | 'resumen' } | { id: 'seg' | 'segInt'; i: number };
interface Borrador {
  r: Respuestas;
  paso: Paso;
  turnos: { pregunta: string; respuesta: string }[];
  pila: { r: Respuestas; paso: Paso; turnos: { pregunta: string; respuesta: string }[] }[];
}

const ANIMOS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const ESTRES = ['Nada', 'Poco', 'Algo', 'Bastante', 'Mucho'];
const vacio = (n: number): Respuestas => ({ animo: 0, animoTexto: '', suenoHoras: null, estres: 0, seguimiento: Array.from({ length: n }, () => ({ estado: null })), nuevos: [], notas: '' });

/** Chequeo conversacional con preguntas fijas, una a la vez. */
export function Chequeo({ alTerminar }: { alTerminar: () => void }) {
  const s = useSesion();
  const a = useAcento();
  const pendientes = useMemo(() => sintomasActivos(s), [s]);
  const [b, setB] = useState<Borrador>(() => {
    const previo = leerBorrador<Borrador>(s, 'chequeo');
    const vigente = previo && previo.datos.r.seguimiento.length === pendientes.length && new Date(previo.actualizado).toDateString() === new Date().toDateString();
    return vigente ? previo.datos : { r: vacio(pendientes.length), paso: { id: 'animo' }, turnos: [], pila: [] };
  });
  const [resumen, setResumen] = useState<{ texto: string; original: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => void guardarBorrador(s, 'chequeo', b).catch(() => {}), 400);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [b, s]);

  const nombre = s.contenido.ajustes.comoLlamarte || s.perfil.nombre.split(' ')[0];
  const actual = b.r.nuevos.at(-1);

  const pregunta = (() => {
    const p = b.paso;
    switch (p.id) {
      case 'animo':
        return `Hola, ${nombre}. ¿Cómo te sientes hoy?`;
      case 'animoTexto':
        return '¿Quieres contarme un poco más? Puedes saltarlo.';
      case 'sueno':
        return '¿Cuántas horas dormiste?';
      case 'estres':
        return '¿Cuánto estrés sientes ahora?';
      case 'seg': {
        const x = pendientes[p.i];
        return `Tenías ${x.datos.manifestacion.toLowerCase()} en ${nombreZona(x.datos.zona).toLowerCase()} (${nombreIntensidad(x.datos.intensidad).toLowerCase()}), registrado el ${x.fecha}. ¿Cómo sigue?`;
      }
      case 'segInt':
        return '¿Qué intensidad tiene ahora?';
      case 'nuevo':
        return b.r.nuevos.length ? '¿Notaste algo más?' : '¿Notaste algo nuevo en tu cuerpo?';
      case 'nZona':
        return '¿Dónde lo sientes? Toca la zona.';
      case 'nTipo':
        return `¿Cómo describirías lo que sientes en ${nombreZona(actual?.zona ?? '').toLowerCase()}?`;
      case 'nInt':
        return '¿Qué tan intenso es?';
      case 'nInicio':
        return '¿Desde cuándo lo notas?';
      case 'nNotas':
        return '¿Algo que ayude a entenderlo? Por ejemplo, qué estabas haciendo.';
      case 'notas':
        return '¿Algo más para el registro de hoy?';
      case 'resumen':
        return 'Este es tu resumen. Puedes editarlo antes de guardar.';
    }
  })();

  const siguiente = (p: Paso, r: Respuestas): Paso => {
    const tras = (i: number): Paso => (i + 1 < pendientes.length ? { id: 'seg', i: i + 1 } : { id: 'nuevo' });
    switch (p.id) {
      case 'animo':
        return { id: 'animoTexto' };
      case 'animoTexto':
        return { id: 'sueno' };
      case 'sueno':
        return { id: 'estres' };
      case 'estres':
        return pendientes.length ? { id: 'seg', i: 0 } : { id: 'nuevo' };
      case 'seg':
        return r.seguimiento[p.i].estado === 'resuelto' ? tras(p.i) : { id: 'segInt', i: p.i };
      case 'segInt':
        return tras(p.i);
      case 'nuevo':
        return r.nuevos.at(-1)?.zona === null ? { id: 'nZona' } : { id: 'notas' };
      case 'nZona':
        return { id: 'nTipo' };
      case 'nTipo':
        return { id: 'nInt' };
      case 'nInt':
        return { id: 'nInicio' };
      case 'nInicio':
        return { id: 'nNotas' };
      case 'nNotas':
        return { id: 'nuevo' };
      case 'notas':
        return { id: 'resumen' };
      default:
        return p;
    }
  };

  const cuerpo = (r: Respuestas) => ({
    animo: r.animo,
    animoTexto: r.animoTexto,
    suenoHoras: r.suenoHoras,
    estres: r.estres,
    notas: r.notas,
    seguimiento: pendientes.map((x: Registro<DatosSintoma>, i) => ({ sintomaId: x.id, zona: x.datos.zona, manifestacion: x.datos.manifestacion, estado: r.seguimiento[i].estado, ...(r.seguimiento[i].intensidad ? { intensidad: r.seguimiento[i].intensidad } : {}) })),
    nuevos: r.nuevos.filter((n) => n.zona),
  });

  const responder = (texto: string, cambio: (r: Respuestas) => Respuestas) => {
    const r = cambio(JSON.parse(JSON.stringify(b.r)));
    const paso = siguiente(b.paso, r);
    setB({ r, paso, turnos: [...b.turnos, { pregunta, respuesta: texto }], pila: [...b.pila, { r: b.r, paso: b.paso, turnos: b.turnos }] });
    if (paso.id === 'resumen') {
      try {
        const { resumen: _x, ...d } = validarChequeo({ ...cuerpo(r), resumen: { texto: '-' } });
        const t = resumenChequeo(d);
        setResumen({ texto: t, original: t });
      } catch (e) {
        setError(e instanceof ErrorNetin ? e.message : 'No se pudo armar el resumen.');
      }
    }
  };
  const volver = () => {
    const previo = b.pila.at(-1);
    if (!previo) return;
    setB({ ...previo, pila: b.pila.slice(0, -1) });
    setResumen(null);
  };
  const editarNuevo = (c: Partial<Nuevo>) => (r: Respuestas) => {
    Object.assign(r.nuevos[r.nuevos.length - 1], c);
    return r;
  };
  const guardar = async () => {
    if (!resumen) return;
    try {
      await guardarChequeo(s, { ...cuerpo(b.r), resumen: { texto: resumen.texto, origen: 'automatico', editado: resumen.texto !== resumen.original } });
      alTerminar();
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar.');
    }
  };

  const p = b.paso;
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={[est.fila, { gap: 8 }]}>
        <Icono g={icono.info} tam={13} c={color.tenue} />
        <T v="tenue">Guía del chequeo: preguntas fijas, sin IA. Tus respuestas quedan listas para el asistente futuro.</T>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
        {b.turnos.map((t, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Burbuja de="guia">{t.pregunta}</Burbuja>
            <Burbuja de="yo">{t.respuesta}</Burbuja>
          </View>
        ))}
        <Entrada key={b.turnos.length}>
          <Burbuja de="guia">{pregunta}</Burbuja>
        </Entrada>
      </ScrollView>

      <Entrada key={`r${b.turnos.length}`} retraso={120}>
        <View style={{ padding: 16, borderWidth: 1, borderColor: alfa(a.base, 0.45), borderRadius: 4, backgroundColor: color.panel }}>
          {p.id === 'animo' && <Opciones columnas={5} valor={null} alElegir={(v) => responder(ANIMOS[v - 1], (r) => ({ ...r, animo: v }))} opciones={ANIMOS.map((t, i) => ({ v: i + 1, t: String(i + 1), sub: t }))} />}
          {p.id === 'animoTexto' && <TextoLibre alEnviar={(t) => responder(t || 'Prefiero no agregar nada', (r) => ({ ...r, animoTexto: t }))} />}
          {p.id === 'sueno' && <Horas alEnviar={(h) => responder(h === null ? 'No lo sé' : `${h} h`, (r) => ({ ...r, suenoHoras: h }))} />}
          {p.id === 'estres' && <Opciones columnas={5} valor={null} alElegir={(v) => responder(ESTRES[v - 1], (r) => ({ ...r, estres: v }))} opciones={ESTRES.map((t, i) => ({ v: i + 1, t: String(i + 1), sub: t }))} />}
          {p.id === 'seg' && <Opciones columnas={4} valor={null} alElegir={(v) => responder(ESTADOS_SEGUIMIENTO[v].nombre, (r) => ((r.seguimiento[p.i] = { estado: ESTADOS_SEGUIMIENTO[v].id }), r))} opciones={ESTADOS_SEGUIMIENTO.map((e, i) => ({ v: i, t: e.nombre }))} />}
          {p.id === 'segInt' && <Opciones columnas={5} valor={null} alElegir={(v) => responder(`${v} · ${nombreIntensidad(v)}`, (r) => ((r.seguimiento[p.i].intensidad = v), r))} opciones={INTENSIDADES.map((x) => ({ v: x.valor, t: String(x.valor), sub: x.nombre }))} />}
          {p.id === 'nuevo' && (
            <Opciones
              columnas={2}
              valor={null}
              alElegir={(v) =>
                responder(v ? 'Sí' : 'No', (r) => {
                  if (v) r.nuevos.push({ zona: null, manifestacion: '', intensidad: 0, inicio: '', notas: '' });
                  return r;
                })
              }
              opciones={[
                { v: 1, t: 'Sí' },
                { v: 0, t: 'No' },
              ]}
            />
          )}
          {p.id === 'nZona' && <ElegirZona alElegir={(z) => responder(nombreZona(z), editarNuevo({ zona: z }))} />}
          {p.id === 'nTipo' && <Opciones columnas={4} valor={null} alElegir={(v) => responder(MANIFESTACIONES[v], editarNuevo({ manifestacion: MANIFESTACIONES[v] }))} opciones={MANIFESTACIONES.map((m, i) => ({ v: i, t: m }))} />}
          {p.id === 'nInt' && <Opciones columnas={5} valor={null} alElegir={(v) => responder(`${v} · ${nombreIntensidad(v)}`, editarNuevo({ intensidad: v }))} opciones={INTENSIDADES.map((x) => ({ v: x.valor, t: String(x.valor), sub: x.nombre }))} />}
          {p.id === 'nInicio' && <Opciones columnas={4} valor={null} alElegir={(v) => responder(INICIOS[v].nombre, editarNuevo({ inicio: INICIOS[v].id }))} opciones={INICIOS.map((x, i) => ({ v: i, t: x.nombre }))} />}
          {p.id === 'nNotas' && <TextoLibre alEnviar={(t) => responder(t || 'Nada que agregar', editarNuevo({ notas: t }))} />}
          {p.id === 'notas' && <TextoLibre alEnviar={(t) => responder(t || 'Nada más', (r) => ({ ...r, notas: t }))} />}
          {p.id === 'resumen' && resumen && (
            <View style={{ gap: 10 }}>
              <View style={[est.fila, { justifyContent: 'space-between' }]}>
                <Origen origen="automatico" />
                {resumen.texto !== resumen.original && <T v="tenue">Editado por ti</T>}
              </View>
              <Campo value={resumen.texto} onChangeText={(t) => setResumen({ ...resumen, texto: t })} multiline maxLength={2000} accessibilityLabel="Resumen del chequeo" />
              <Boton texto="Guardar chequeo" icono={icono.ok} grande desactivado={!resumen.texto.trim()} alPulsar={guardar} />
            </View>
          )}
          {error && <T v="suave" style={{ color: color.critico, marginTop: 8 }}>{error}</T>}
        </View>
      </Entrada>
      {b.pila.length > 0 && <Boton texto="Cambiar mi última respuesta" icono={icono.atras} tipo="fantasma" alPulsar={volver} style={{ alignSelf: 'flex-start' }} />}
    </View>
  );
}

function Burbuja({ de, children }: { de: 'guia' | 'yo'; children: string }) {
  const a = useAcento();
  const guia = de === 'guia';
  return (
    <View
      style={{
        alignSelf: guia ? 'flex-start' : 'flex-end',
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: guia ? color.linea : a.base,
        backgroundColor: guia ? color.panelAlto : alfa(a.base, 0.2),
        borderLeftWidth: guia ? 3 : 1,
        borderLeftColor: guia ? a.base : a.base,
      }}
    >
      <T v="cuerpo">{children}</T>
    </View>
  );
}

function TextoLibre({ alEnviar }: { alEnviar: (t: string) => void }) {
  const [t, setT] = useState('');
  return (
    <View style={[est.fila, { gap: 10 }]}>
      <View style={{ flex: 1 }}>
        <Campo autoFocus value={t} onChangeText={setT} maxLength={1000} placeholder="Escribe aquí" onSubmitEditing={() => t.trim() && alEnviar(t.trim())} />
      </View>
      <Boton texto="Saltar" tipo="fantasma" alPulsar={() => alEnviar('')} />
      <Boton texto="Enviar" icono={icono.enviar} desactivado={!t.trim()} alPulsar={() => alEnviar(t.trim())} />
    </View>
  );
}

function Horas({ alEnviar }: { alEnviar: (h: number | null) => void }) {
  const a = useAcento();
  const [h, setH] = useState(7);
  return (
    <View style={[est.fila, { gap: 16 }]}>
      <Boton texto="" etiqueta="Menos media hora" icono={''} tipo="secundario" alPulsar={() => setH((x) => Math.max(0, x - 0.5))} />
      <View style={{ alignItems: 'center', minWidth: 120 }}>
        <T v="cifraGrande" style={{ color: a.base }}>{h}</T>
        <T v="etiqueta">HORAS</T>
      </View>
      <Boton texto="" etiqueta="Más media hora" icono={icono.agregar} tipo="secundario" alPulsar={() => setH((x) => Math.min(16, x + 0.5))} />
      <View style={{ flex: 1 }} />
      <Boton texto="No lo sé" tipo="fantasma" alPulsar={() => alEnviar(null)} />
      <Boton texto="Listo" icono={icono.ok} alPulsar={() => alEnviar(h)} />
    </View>
  );
}

function ElegirZona({ alElegir }: { alElegir: (z: ZonaId) => void }) {
  const [z, setZ] = useState<ZonaId | null>(null);
  return (
    <View style={[est.fila, { gap: 24, alignItems: 'center' }]}>
      <Figura vista="frontal" alto={250} intensidades={{}} seleccionada={z} alElegir={setZ} />
      <Figura vista="posterior" alto={250} intensidades={{}} seleccionada={z} alElegir={setZ} />
      <View style={{ flex: 1, gap: 12 }}>
        <T v="subtitulo">{z ? nombreZona(z) : 'Elige una zona en la figura'}</T>
        <T v="tenue">Frente a la izquierda, espalda a la derecha.</T>
        <Boton texto="Confirmar zona" icono={icono.ok} desactivado={!z} alPulsar={() => z && alElegir(z)} />
      </View>
    </View>
  );
}
