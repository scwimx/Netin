import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { ErrorNetin } from '../../datos/boveda';
import { borrarBorrador, compararMotora, crear, estadoDia, guardarBorrador, guardarFoto, leerBorrador } from '../../datos/registros';
import { useApp, useSesion } from '../../estado/App';
import { plataforma } from '../../plataforma';
import { alfa, useAcento } from '../../hud/Acento';
import { Boton, Campo, Entrada, Icono, Origen, Panel, Pulso, T, est } from '../../hud/componentes';
import { color, icono } from '../../hud/tema';
import { Chequeo } from './Chequeo';
import { PruebaReaccion } from './PruebaReaccion';

type Paso = 'foto' | 'chequeo' | 'motora' | 'bitacora';
const PASOS: { id: Paso; t: string; g: string }[] = [
  { id: 'foto', t: 'Foto', g: icono.camara },
  { id: 'chequeo', t: 'Chequeo', g: icono.salud },
  { id: 'motora', t: 'Reacción', g: icono.rayo },
  { id: 'bitacora', t: 'Bitácora', g: icono.libro },
];

/** Registro diario en cuatro pasos. Reanuda donde se quedó. */
export function FlujoDiario({ alSalir }: { alSalir: () => void }) {
  const s = useSesion();
  const { refrescar, avisar, version } = useApp();
  const a = useAcento();
  void version;
  const dia = estadoDia(s);
  const [paso, setPaso] = useState<Paso | 'fin'>(dia.siguiente ?? 'fin');

  const completar = (_p: Paso, texto: string) => {
    avisar(texto);
    refrescar();
    setPaso(estadoDia(s).siguiente ?? 'fin');
  };
  const hecho = (p: Paso) => (p === 'foto' ? dia.foto !== 'pendiente' : dia[p]);

  return (
    <View style={{ flex: 1, padding: 28, gap: 20 }}>
      <View style={[est.fila, { justifyContent: 'space-between' }]}>
        <View>
          <T v="etiqueta" style={{ color: a.base }}>REGISTRO DEL DÍA · {dia.fecha}</T>
          <T v="titulo">¿Cómo va tu día?</T>
        </View>
        {paso !== 'foto' && paso !== 'fin' && <Boton texto="Seguir después" tipo="fantasma" icono={icono.adelante} alPulsar={alSalir} />}
      </View>

      {/* Pasos */}
      <View style={[est.fila, { gap: 10 }]}>
        {PASOS.map((p, i) => {
          const listo = hecho(p.id);
          const actual = paso === p.id;
          const c = listo ? a.base : actual ? color.aviso : color.tenue;
          return (
            <View key={p.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 4, borderColor: actual ? color.aviso : listo ? alfa(a.base, 0.6) : color.linea, backgroundColor: listo ? alfa(a.base, 0.1) : color.panel }}>
              <View style={{ width: 34, height: 34, borderRadius: 4, borderWidth: 1, borderColor: c, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
                <Icono g={listo ? icono.ok : p.g} tam={15} c={c} style={{ transform: [{ rotate: '-45deg' }] }} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="tenue" style={{ color: c }}>Paso {i + 1}</T>
                <T v="subtitulo" style={{ fontSize: 15, color: listo || actual ? color.tinta : color.suave }}>{p.t}</T>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {paso === 'foto' && <PasoFoto alTerminar={(omitida) => completar('foto', omitida ? 'Día registrado sin foto' : 'Foto del día guardada')} />}
        {paso === 'chequeo' && <Chequeo alTerminar={() => completar('chequeo', 'Chequeo completado')} />}
        {paso === 'motora' && <PasoMotora alTerminar={() => completar('motora', 'Prueba de reacción registrada')} />}
        {paso === 'bitacora' && <PasoBitacora alTerminar={() => completar('bitacora', 'Bitácora guardada')} />}
        {paso === 'fin' && <Fin alSalir={alSalir} />}
      </View>
    </View>
  );
}

function PasoFoto({ alTerminar }: { alTerminar: (omitida: boolean) => void }) {
  const s = useSesion();
  const a = useAcento();
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cuenta, setCuenta] = useState<number | null>(null);
  const activa = s.contenido.ajustes.camaraActiva;

  const tomar = async () => {
    setError(null);
    setOcupado(true);
    // Cuenta regresiva para acomodarse frente a la cámara.
    for (const n of [3, 2, 1]) {
      setCuenta(n);
      await new Promise<void>((r) => setTimeout(() => r(), 1000));
    }
    setCuenta(null);
    try {
      const f = await plataforma.tomarFoto();
      if (f) setFoto(f);
    } catch (e) {
      setError((e as Error).message || 'La cámara no está disponible.');
    } finally {
      setOcupado(false);
    }
  };
  const guardar = async (cuerpo: Parameters<typeof guardarFoto>[1]) => {
    setOcupado(true);
    try {
      await guardarFoto(s, cuerpo);
      alTerminar('omitida' in cuerpo);
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar la foto.');
      setOcupado(false);
    }
  };

  return (
    <Entrada style={{ flex: 1 }}>
      <Panel titulo="Paso 1 · Foto del día" icono={icono.camara} resaltado style={{ flex: 1 }}>
        <View style={[est.fila, { flex: 1, gap: 28, alignItems: 'stretch' }]}>
          <View style={{ flex: 1.3, borderWidth: 1, borderColor: alfa(a.base, 0.5), borderRadius: 4, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 300 }}>
            {cuenta !== null ? (
              <Entrada key={cuenta}>
                <T v="cifraGrande" style={{ fontSize: 140, color: a.base }}>{cuenta}</T>
              </Entrada>
            ) : foto ? (
              <Image source={{ uri: `data:image/jpeg;base64,${foto}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Tu foto de hoy" />
            ) : (
              <Pulso escala={1.05} ms={2200}>
                <View style={{ width: 170, height: 220, borderRadius: 90, borderWidth: 2, borderStyle: 'dashed', borderColor: alfa(a.base, 0.6), alignItems: 'center', justifyContent: 'center' }}>
                  <Icono g={icono.persona} tam={60} c={alfa(a.base, 0.6)} />
                </View>
              </Pulso>
            )}
          </View>
          <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
            <T v="subtitulo">{foto ? '¿Se ve bien?' : 'Una foto al día ayuda a notar cambios con el tiempo.'}</T>
            <T v="suave">{foto ? 'Puedes repetirla las veces que quieras antes de guardarla.' : 'Mira a la cámara con luz de frente. La foto se toma tras una cuenta regresiva de 3 segundos.'}</T>
            {!activa && <T v="suave" style={{ color: color.aviso }}>La cámara está desactivada en Ajustes.</T>}
            {error && (
              <View style={{ gap: 6 }}>
                <T v="suave" style={{ color: color.aviso }}>{error}</T>
                <T v="tenue">Puedes seguir sin foto; quedará anotado.</T>
              </View>
            )}
            {foto ? (
              <View style={[est.fila, { gap: 10 }]}>
                <Boton texto="Repetir" icono={icono.actualizar} tipo="secundario" desactivado={ocupado} alPulsar={tomar} />
                <Boton texto="Guardar foto" icono={icono.ok} grande desactivado={ocupado} alPulsar={() => guardar({ jpeg: foto })} />
              </View>
            ) : (
              <Boton texto="Abrir cámara" icono={icono.camara} grande desactivado={!activa || ocupado} alPulsar={tomar} />
            )}
            <Boton texto="Seguir sin foto" tipo="fantasma" desactivado={ocupado} alPulsar={() => guardar({ omitida: true, motivo: !activa ? 'Cámara desactivada' : error ? 'Cámara no disponible' : 'Sin foto por decisión propia' })} />
          </View>
        </View>
      </Panel>
    </Entrada>
  );
}

function PasoMotora({ alTerminar }: { alTerminar: () => void }) {
  const s = useSesion();
  const [comparacion, setComparacion] = useState<string | null>(null);
  return (
    <Entrada style={{ flex: 1 }}>
      <Panel titulo="Paso 3 · Prueba de reacción" icono={icono.rayo} resaltado style={{ flex: 1, justifyContent: 'center' }}>
        {comparacion ? (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Origen origen="automatico" />
            <T v="subtitulo" style={{ textAlign: 'center', maxWidth: 640, fontSize: 20 }}>{comparacion}</T>
            <T v="tenue">Compara tus propios resultados entre sí. No es una evaluación médica.</T>
            <Boton texto="Continuar" icono={icono.adelante} grande alPulsar={alTerminar} />
          </View>
        ) : (
          <PruebaReaccion
            alTerminar={async (r) => {
              await crear(s, 'motora', { prueba: 'reaccion_visual', ...r });
              setComparacion(compararMotora(s).texto);
            }}
          />
        )}
      </Panel>
    </Entrada>
  );
}

function PasoBitacora({ alTerminar }: { alTerminar: () => void }) {
  const s = useSesion();
  const [texto, setTexto] = useState(() => (leerBorrador<string>(s, 'bitacora')?.datos as string) ?? '');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => void guardarBorrador(s, 'bitacora', texto).catch(() => {}), 700);
    return () => clearTimeout(t);
  }, [texto, s]);
  const guardar = async () => {
    try {
      await crear(s, 'bitacora', { entrada: texto });
      await borrarBorrador(s, 'bitacora');
      alTerminar();
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <Entrada style={{ flex: 1 }}>
      <Panel titulo="Paso 4 · Bitácora" icono={icono.libro} resaltado style={{ flex: 1 }}>
        <T v="suave" style={{ marginBottom: 12 }}>Escribe lo que quieras sobre tu día. Se guarda tal cual lo escribas.</T>
        <Campo value={texto} onChangeText={setTexto} multiline maxLength={8000} autoFocus placeholder="Hoy…" style={{ minHeight: 220, fontSize: 16, lineHeight: 24 }} />
        <View style={[est.fila, { justifyContent: 'space-between', marginTop: 12 }]}>
          <T v="tenue">{texto.length} / 8000 · El resumen del asistente aparecerá aparte cuando la IA esté integrada.</T>
          <Boton texto="Guardar bitácora" icono={icono.ok} grande desactivado={!texto.trim()} alPulsar={guardar} />
        </View>
        {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
      </Panel>
    </Entrada>
  );
}

function Fin({ alSalir }: { alSalir: () => void }) {
  const a = useAcento();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: false, bounciness: 16, speed: 8 }).start();
  }, [v]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <Animated.View style={{ transform: [{ scale: v }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '45deg'] }) }] }}>
        <View style={{ width: 120, height: 120, borderWidth: 3, borderColor: a.base, backgroundColor: alfa(a.base, 0.2), alignItems: 'center', justifyContent: 'center', shadowColor: a.base, shadowOpacity: 1, shadowRadius: 40 }}>
          <Icono g={icono.ok} tam={54} c={a.base} style={{ transform: [{ rotate: '-45deg' }] }} />
        </View>
      </Animated.View>
      <T v="titulo" style={{ marginTop: 20 }}>Listo por hoy</T>
      <T v="suave">Todo quedó guardado y cifrado. Puedes revisarlo o corregirlo en Registros.</T>
      <Boton texto="Ir a Inicio" icono={icono.inicio} grande alPulsar={alSalir} />
    </View>
  );
}
