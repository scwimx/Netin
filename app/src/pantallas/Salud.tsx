import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorNetin, hoy } from '../datos/boveda';
import {
  ESTADOS_SEGUIMIENTO,
  INDICADORES,
  INICIOS,
  INTENSIDADES,
  MANIFESTACIONES,
  nombreInicio,
  nombreIntensidad,
  nombreZona,
  ZONAS,
  type DatosBitacora,
  type DatosChequeo,
  type DatosMotora,
  type DatosSintoma,
  type DatosVital,
  type IndicadorId,
  type Registro,
  type ZonaId,
} from '../datos/catalogos';
import { calcularPendientes } from '../datos/pendientes';
import { compararMotora, crear, de, estadoDia, listar, seguirSintoma, simularVitales } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa, useAcento } from '../hud/Acento';
import { Anillo, Barra, Boton, Campo, colorIntensidad, Entrada, Estado, Icono, nivelIntensidad, Opciones, Origen, Panel, T, est, type Nivel } from '../hud/componentes';
import { Linea, Tendencias } from '../hud/Grafica';
import { LeyendaMapa, MapaCorporal } from '../hud/MapaCorporal';
import { ACENTO, color, icono } from '../hud/tema';
import { PruebaReaccion } from './diario/PruebaReaccion';

type Pestana = 'general' | 'fisico' | 'mental' | 'motora';
const PESTANAS: { id: Pestana; t: string; g: string }[] = [
  { id: 'general', t: 'General', g: icono.salud },
  { id: 'fisico', t: 'Físico', g: icono.cuerpo },
  { id: 'mental', t: 'Mental', g: icono.mente },
  { id: 'motora', t: 'Habilidades motoras', g: icono.rayo },
];
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const msj = (e: unknown) => (e instanceof ErrorNetin ? e.message : 'Algo falló.');

export function Salud() {
  const { params, ir } = useApp();
  const a = useAcento();
  const pestana = (params.pestana as Pestana) ?? 'general';
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 14 }}>
        <T v="titulo">Salud</T>
        <View style={[est.fila, { gap: 8 }]}>
          {PESTANAS.map((p) => {
            const sel = p.id === pestana;
            return (
              <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: sel }} onPress={() => ir('salud', { pestana: p.id })} style={({ hovered }: any) => [est.fila, { gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: sel ? a.base : hovered ? alfa(a.base, 0.5) : color.linea, backgroundColor: sel ? alfa(a.base, 0.2) : color.panel }]}>
                <Icono g={p.g} tam={16} c={sel ? a.base : color.suave} />
                <T v="subtitulo" style={{ fontSize: 15, color: sel ? a.base : color.suave }}>{p.t}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        {pestana === 'general' && <General />}
        {pestana === 'fisico' && <Fisico zonaInicial={(params.zona as ZonaId) ?? null} />}
        {pestana === 'mental' && <Mental />}
        {pestana === 'motora' && <Motora />}
      </ScrollView>
    </View>
  );
}

// ---------- General ----------

function General() {
  const s = useSesion();
  const { refrescar, version } = useApp();
  void version;
  const vitales = de<DatosVital>(s, 'vital');
  const riesgos = calcularPendientes(listar(s), estadoDia(s)).filter((p) => p.id !== 'dia');
  const [abierto, setAbierto] = useState<IndicadorId | null>(null);
  const [nueva, setNueva] = useState(false);

  return (
    <>
      <View style={[est.fila, { gap: 18, alignItems: 'flex-start' }]}>
        <Entrada style={{ flex: 1.5 }}>
          <Panel
            titulo="Vitales"
            icono={icono.salud}
            accion={
              <View style={[est.fila, { gap: 8 }]}>
                <Boton texto="Medición" icono={icono.agregar} alPulsar={() => setNueva(true)} />
                <Boton
                  texto="Simular"
                  tipo="fantasma"
                  icono={icono.jugar}
                  etiqueta="Agregar mediciones simuladas de demostración"
                  alPulsar={async () => {
                    await simularVitales(s);
                    refrescar();
                  }}
                />
              </View>
            }
          >
            {nueva && <FormMedicion alCerrar={() => setNueva(false)} />}
            {INDICADORES.map((ind) => {
              const v = vitales.find((x) => x.datos.indicador === ind.id);
              const exp = abierto === ind.id;
              return (
                <View key={ind.id} style={{ borderTopWidth: 1, borderColor: color.linea }}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: exp }} onPress={() => setAbierto(exp ? null : ind.id)} style={[est.fila, { paddingVertical: 12, gap: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <T v="subtitulo" style={{ fontSize: 15 }}>{ind.nombre}</T>
                      <T v="tenue">{v ? fechaHora(v.datos.medidoEn) : 'Sin mediciones'}</T>
                    </View>
                    {v && <Origen origen={v.datos.origen} />}
                    {v && (
                      <T v="cifra">
                        {v.datos.valor2 !== undefined ? `${v.datos.valor}/${v.datos.valor2}` : v.datos.valor} <T v="tenue">{ind.unidad}</T>
                      </T>
                    )}
                    <Icono g={exp ? '' : ''} tam={12} c={color.tenue} />
                  </Pressable>
                  {exp && <GuiaIndicador etapa={ACENTO[s.perfil.etapa].nombre} />}
                </View>
              );
            })}
          </Panel>
        </Entrada>
        <View style={{ flex: 1, gap: 18 }}>
          <Entrada retraso={80}>
            <Panel titulo="Riesgos y precauciones" icono={icono.alerta} c={color.aviso}>
              {riesgos.length ? (
                <View style={{ gap: 10 }}>
                  {riesgos.map((r) => (
                    <View key={r.id} style={{ gap: 3 }}>
                      <Estado nivel={r.nivel as Nivel} texto={r.titulo} />
                      <T v="tenue">{r.respaldo}</T>
                    </View>
                  ))}
                </View>
              ) : (
                <T v="suave">Tus registros no muestran riesgos ni pendientes.</T>
              )}
              <T v="tenue" style={{ marginTop: 12 }}>Sale solo de lo que registraste. Las precauciones con respaldo llegarán con los documentos de la misión.</T>
            </Panel>
          </Entrada>
          <Entrada retraso={140}>
            <Panel titulo="ARCHeR" mayusculas={false} icono={icono.satelite} c={color.suave}>
              <View style={[est.fila, { justifyContent: 'space-between' }]}>
                <Estado nivel="neutro" texto="Integración futura" />
                <View accessibilityRole="switch" accessibilityState={{ checked: false, disabled: true }} accessibilityLabel="ARCHeR, integración futura" style={{ width: 46, height: 24, borderRadius: 12, borderWidth: 1, borderColor: color.linea, backgroundColor: color.panelAlto, opacity: 0.6, padding: 3 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color.tenue }} />
                </View>
              </View>
              <T v="suave" style={{ marginTop: 10 }}>La conexión con ARCHeR todavía no está disponible. El control queda aquí para cuando se integre.</T>
            </Panel>
          </Entrada>
        </View>
      </View>
      <Entrada retraso={200}>
        <Panel titulo="Tendencias" icono={icono.grafica}>
          <Tendencias vitales={vitales} alto={240} />
        </Panel>
      </Entrada>
    </>
  );
}

/** Sin documentos no se inventa contenido: se muestra qué falta. */
function GuiaIndicador({ etapa }: { etapa: string }) {
  const partes = [`Cómo medirlo en ${etapa}`, 'Qué permite observar', 'Qué puedes hacer para prevenir', 'Cuándo avisar a la tripulación o al equipo médico en Tierra'];
  return (
    <View style={{ paddingBottom: 14, gap: 10 }}>
      <Estado nivel="neutro" texto="Sin documento de respaldo" />
      <View style={[est.fila, { flexWrap: 'wrap', gap: 8 }]}>
        {partes.map((p) => (
          <View key={p} style={{ flexBasis: '48%', flexGrow: 1, padding: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: color.linea, borderRadius: 4 }}>
            <T v="cuerpo" style={{ fontWeight: '600' }}>{p}</T>
            <T v="tenue">Pendiente: se completará con los documentos de la misión (documento y página).</T>
          </View>
        ))}
      </View>
      <T v="tenue">Mientras tanto, ante cualquier duda consulta al responsable médico de la misión.</T>
    </View>
  );
}

function FormMedicion({ alCerrar }: { alCerrar: () => void }) {
  const s = useSesion();
  const { refrescar } = useApp();
  const [ind, setInd] = useState<IndicadorId>('fc');
  const [valor, setValor] = useState('');
  const [valor2, setValor2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const def = INDICADORES.find((i) => i.id === ind)!;
  const guardar = async () => {
    try {
      await crear(s, 'vital', { indicador: ind, valor, ...(def.dos ? { valor2 } : {}), origen: 'manual' });
      refrescar();
      alCerrar();
    } catch (e) {
      setError(msj(e));
    }
  };
  return (
    <View style={{ gap: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: color.linea, borderRadius: 4, backgroundColor: color.panelAlto }}>
      <T v="etiqueta">NUEVA MEDICIÓN MANUAL</T>
      <Opciones valor={ind} alElegir={setInd} opciones={INDICADORES.map((i) => ({ v: i.id, t: i.nombre }))} />
      <View style={[est.fila, { gap: 12, alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta={`${def.dos ? 'Sistólica' : 'Valor'} (${def.unidad})`} value={valor} onChangeText={setValor} keyboardType="decimal-pad" />
        </View>
        {def.dos && (
          <View style={{ flex: 1 }}>
            <Campo etiqueta={`Diastólica (${def.unidad})`} value={valor2} onChangeText={setValor2} keyboardType="decimal-pad" />
          </View>
        )}
        <Boton texto="Cancelar" tipo="fantasma" alPulsar={alCerrar} />
        <Boton texto="Guardar" icono={icono.ok} desactivado={!valor || (def.dos && !valor2)} alPulsar={guardar} />
      </View>
      {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
    </View>
  );
}

// ---------- Físico ----------

function Fisico({ zonaInicial }: { zonaInicial: ZonaId | null }) {
  const s = useSesion();
  const { version } = useApp();
  void version;
  const sintomas = de<DatosSintoma>(s, 'sintoma');
  const [zona, setZona] = useState<ZonaId | null>(zonaInicial && ZONAS.some((z) => z.id === zonaInicial) ? zonaInicial : null);
  const [form, setForm] = useState(false);
  const intensidades = useMemo(() => {
    const m: Partial<Record<ZonaId, number>> = {};
    for (const x of sintomas) if (x.datos.estado === 'activo') m[x.datos.zona] = Math.max(m[x.datos.zona] ?? 0, x.datos.intensidad);
    return m;
  }, [sintomas]);
  const activos = sintomas.filter((x) => x.datos.estado === 'activo');
  const enZona = sintomas.filter((x) => x.datos.zona === zona);

  return (
    <View style={[est.fila, { gap: 18, alignItems: 'flex-start' }]}>
      <Entrada style={{ flex: 1.1 }}>
        <Panel titulo="Escáner corporal" icono={icono.cuerpo} accion={<T v="tenue">{activos.length ? `${activos.length} síntoma(s) activo(s)` : 'Sin síntomas activos'}</T>}>
          <T v="suave" style={{ marginBottom: 12 }}>Toca una zona para ver o registrar lo que sientes.</T>
          <MapaCorporal
            alto={440}
            intensidades={intensidades}
            seleccionada={zona}
            alElegir={(z) => {
              setZona(z);
              setForm(false);
            }}
            escanear
          />
          <View style={{ marginTop: 14 }}>
            <LeyendaMapa />
          </View>
        </Panel>
      </Entrada>
      <View style={{ flex: 1, gap: 18 }}>
        {zona ? (
          <Entrada key={zona} style={{ gap: 18 }}>
            <Panel titulo="Zona elegida" icono={icono.cuerpo} resaltado>
              <View style={[est.fila, { justifyContent: 'space-between', marginBottom: 12 }]}>
                <T v="titulo" style={{ fontSize: 26 }}>{nombreZona(zona)}</T>
                {intensidades[zona] ? <Estado nivel={nivelIntensidad(intensidades[zona]!)} texto={`Activo · ${nombreIntensidad(intensidades[zona]!)}`} /> : <Estado nivel="bien" texto="Sin síntomas activos" />}
              </View>
              <View style={{ gap: 10 }}>
                {enZona.map((x) => (
                  <TarjetaSintoma key={x.id} r={x} />
                ))}
              </View>
              {form ? <FormSintoma zona={zona} alCerrar={() => setForm(false)} /> : <Boton texto="Registrar síntoma en esta zona" icono={icono.agregar} grande alPulsar={() => setForm(true)} style={{ marginTop: 12 }} />}
            </Panel>
            <Explicaciones sintomas={enZona.filter((x) => x.datos.estado === 'activo')} />
          </Entrada>
        ) : (
          <Panel titulo="Síntomas activos" icono={icono.alerta}>
            {activos.length ? (
              <View style={{ gap: 8 }}>
                {activos.map((x) => (
                  <Pressable key={x.id} onPress={() => setZona(x.datos.zona)} style={({ hovered }: any) => [est.fila, { justifyContent: 'space-between', padding: 10, borderRadius: 4, borderWidth: 1, borderColor: hovered ? colorIntensidad(x.datos.intensidad) : color.linea, backgroundColor: color.panelAlto }]}>
                    <T v="cuerpo">{x.datos.manifestacion} · {nombreZona(x.datos.zona)}</T>
                    <Estado nivel={nivelIntensidad(x.datos.intensidad)} texto={nombreIntensidad(x.datos.intensidad)} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <T v="suave">Elige una zona en la figura para registrar un síntoma.</T>
            )}
          </Panel>
        )}
      </View>
    </View>
  );
}

function TarjetaSintoma({ r }: { r: Registro<DatosSintoma> }) {
  const s = useSesion();
  const { refrescar } = useApp();
  const [intensidad, setIntensidad] = useState<number | null>(null);
  const d = r.datos;
  const activo = d.estado === 'activo';
  return (
    <View style={{ padding: 12, borderRadius: 4, borderWidth: 1, borderColor: activo ? alfa(colorIntensidad(d.intensidad), 0.6) : color.linea, backgroundColor: color.panelAlto, opacity: activo ? 1 : 0.65, gap: 6 }}>
      <View style={[est.fila, { justifyContent: 'space-between' }]}>
        <T v="subtitulo" style={{ fontSize: 16 }}>{d.manifestacion}</T>
        {activo ? <Estado nivel={nivelIntensidad(d.intensidad)} texto={`${d.intensidad} · ${nombreIntensidad(d.intensidad)}`} /> : <Estado nivel="bien" texto="Resuelto" />}
      </View>
      <T v="tenue">Registrado el {r.fecha} en {ACENTO[r.etapa].nombre} · inicio: {nombreInicio(d.inicio).toLowerCase()}{d.seguimientos.length ? ` · ${d.seguimientos.length} seguimiento(s)` : ''}</T>
      {!!d.notas && <T v="suave">«{d.notas}»</T>}
      {activo && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <T v="etiqueta">¿CÓMO SIGUE HOY?</T>
          <View style={[est.fila, { gap: 6 }]}>
            {INTENSIDADES.map((i) => (
              <Pressable key={i.valor} accessibilityLabel={`Intensidad ${i.valor}, ${i.nombre}`} accessibilityState={{ selected: intensidad === i.valor }} onPress={() => setIntensidad(intensidad === i.valor ? null : i.valor)} style={{ width: 34, height: 34, borderRadius: 3, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: intensidad === i.valor ? colorIntensidad(i.valor) : color.linea, backgroundColor: intensidad === i.valor ? alfa(colorIntensidad(i.valor), 0.25) : 'transparent' }}>
                <T v="cifra" style={{ fontSize: 15 }}>{i.valor}</T>
              </Pressable>
            ))}
            <T v="tenue" style={{ marginLeft: 4 }}>intensidad (opcional)</T>
          </View>
          <View style={[est.fila, { gap: 6, flexWrap: 'wrap' }]}>
            {ESTADOS_SEGUIMIENTO.map((e) => (
              <Boton
                key={e.id}
                texto={e.nombre}
                tipo={e.id === 'resuelto' ? 'primario' : 'secundario'}
                alPulsar={async () => {
                  await seguirSintoma(s, r.id, { estado: e.id, ...(intensidad && e.id !== 'resuelto' ? { intensidad } : {}) });
                  setIntensidad(null);
                  refrescar();
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function FormSintoma({ zona, alCerrar }: { zona: ZonaId; alCerrar: () => void }) {
  const s = useSesion();
  const { refrescar } = useApp();
  const [manif, setManif] = useState<string>(MANIFESTACIONES[0]);
  const [intensidad, setIntensidad] = useState(2);
  const [inicio, setInicio] = useState('hoy');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 12, marginTop: 14 }}>
      <T v="etiqueta">¿QUÉ SIENTES?</T>
      <Opciones valor={manif} alElegir={setManif} opciones={MANIFESTACIONES.map((m) => ({ v: m, t: m }))} />
      <T v="etiqueta">¿DESDE CUÁNDO?</T>
      <Opciones columnas={4} valor={inicio} alElegir={setInicio} opciones={INICIOS.map((i) => ({ v: i.id, t: i.nombre }))} />
      <T v="etiqueta">INTENSIDAD</T>
      <Opciones columnas={5} valor={intensidad} alElegir={setIntensidad} opciones={INTENSIDADES.map((i) => ({ v: i.valor, t: String(i.valor), sub: i.nombre }))} />
      <Campo etiqueta="Detalles o contexto" value={notas} onChangeText={setNotas} multiline maxLength={1000} placeholder="Ej.: al levantar el arnés del equipo de ejercicio" />
      {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
      <View style={[est.fila, { gap: 10, justifyContent: 'flex-end' }]}>
        <Boton texto="Cancelar" tipo="fantasma" alPulsar={alCerrar} />
        <Boton
          texto="Guardar síntoma"
          icono={icono.ok}
          alPulsar={async () => {
            try {
              await crear(s, 'sintoma', { zona, manifestacion: manif, intensidad, inicio, notas });
              refrescar();
              alCerrar();
            } catch (e) {
              setError(msj(e));
            }
          }}
        />
      </View>
    </View>
  );
}

/** Sin IA ni documentos no se proponen causas: qué se sabe, qué falta, qué hacer. */
function Explicaciones({ sintomas }: { sintomas: Registro<DatosSintoma>[] }) {
  if (!sintomas.length) return null;
  const faltan = new Set<string>();
  for (const x of sintomas) {
    if (!x.datos.notas) faltan.add('Qué estabas haciendo cuando empezó (contexto en las notas).');
    if (x.fecha !== hoy() && !x.datos.seguimientos.some((g) => g.fecha === hoy())) faltan.add('Cómo sigue hoy (seguimiento).');
  }
  const severo = sintomas.some((x) => x.datos.intensidad >= 4 || x.datos.seguimientos.at(-1)?.estado === 'peor');
  return (
    <Panel titulo="Posibles explicaciones" icono={icono.info}>
      <View style={{ padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: color.linea, borderRadius: 4, gap: 6 }}>
        <Estado nivel="neutro" texto="Pendiente de IA y documentos" />
        <T v="suave">Netin no propone causas sin una fuente que las respalde. Cuando se integren el asistente y los documentos de la misión, aquí verás posibilidades con su respaldo.</T>
      </View>
      <T v="etiqueta" style={{ marginTop: 14, marginBottom: 6 }}>DATOS QUE FALTAN</T>
      {faltan.size ? [...faltan].map((f) => <T key={f} v="suave">• {f}</T>) : <T v="suave">Tu registro de esta zona está completo.</T>}
      <T v="etiqueta" style={{ marginTop: 14, marginBottom: 6 }}>SIGUIENTES PASOS</T>
      <T v="suave">• Registra cómo sigue cada día para ver su evolución.</T>
      <T v="suave" style={severo ? { color: color.serio, fontWeight: '600' } : undefined}>
        • {severo ? 'Lo marcaste como severo o dijiste que va peor: avisa al responsable médico de la misión.' : 'Si empeora o te preocupa, avisa al responsable médico de la misión.'}
      </T>
    </Panel>
  );
}

// ---------- Mental ----------

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

function Mental() {
  const s = useSesion();
  const a = useAcento();
  const chequeos = de<DatosChequeo>(s, 'chequeo').sort((x, y) => x.creado.localeCompare(y.creado));
  const bitacoras = de<DatosBitacora>(s, 'bitacora').slice(0, 2);
  if (!chequeos.length) return <Panel><T v="suave">Cuando hagas chequeos diarios, aquí verás cómo cambian tu ánimo, tu descanso y tu estrés.</T></Panel>;
  const rec = chequeos.slice(-7);
  const prev = chequeos.slice(-14, -7);
  const cifras = [
    { t: 'Ánimo', ahora: promedio(rec.map((c) => c.datos.animo)), antes: promedio(prev.map((c) => c.datos.animo)), max: 5, u: 'de 5', c: color.serie1 },
    { t: 'Estrés', ahora: promedio(rec.map((c) => c.datos.estres)), antes: promedio(prev.map((c) => c.datos.estres)), max: 5, u: 'de 5', c: color.serie2 },
    { t: 'Sueño', ahora: promedio(rec.flatMap((c) => (c.datos.suenoHoras === null ? [] : [c.datos.suenoHoras]))), antes: promedio(prev.flatMap((c) => (c.datos.suenoHoras === null ? [] : [c.datos.suenoHoras]))), max: 12, u: 'h', c: a.base },
  ];
  const serie = (k: 'animo' | 'estres') => chequeos.map((c) => ({ t: new Date(c.creado).getTime(), valor: c.datos[k], etiqueta: `${c.datos[k]} de 5`, detalle: c.fecha }));
  const frases = chequeos.filter((c) => c.datos.animoTexto).slice(-4).reverse();
  return (
    <>
      <View style={[est.fila, { gap: 18 }]}>
        {cifras.map((c, i) => (
          <Entrada key={c.t} retraso={i * 60} style={{ flex: 1 }}>
            <Panel titulo={`${c.t} promedio`} c={c.c}>
              <View style={[est.fila, { gap: 18 }]}>
                <Anillo valor={(c.ahora ?? 0) / c.max} tam={110} segmentos={30} c={c.c} grosor={8}>
                  <T v="cifra" style={{ fontSize: 26 }}>{c.ahora ?? '—'}</T>
                  <T v="tenue">{c.u}</T>
                </Anillo>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="suave">Últimos {rec.length} chequeos</T>
                  {c.antes !== null && <T v="tenue">Antes: {c.antes} {c.u}</T>}
                  <T v="tenue">Cálculo automático</T>
                </View>
              </View>
            </Panel>
          </Entrada>
        ))}
      </View>
      <View style={[est.fila, { gap: 18, alignItems: 'stretch' }]}>
        <Panel titulo="Ánimo por chequeo" c={color.serie1} style={{ flex: 1 }}>
          <Linea puntos={serie('animo')} alto={180} c={color.serie1} />
        </Panel>
        <Panel titulo="Estrés por chequeo" c={color.serie2} style={{ flex: 1 }}>
          <Linea puntos={serie('estres')} alto={180} c={color.serie2} />
        </Panel>
      </View>
      <View style={[est.fila, { gap: 18, alignItems: 'stretch' }]}>
        <Panel titulo="Lo que contaste" icono={icono.asistente} style={{ flex: 1 }}>
          <Estado nivel="info" texto="Observaciones tuyas" />
          <View style={{ gap: 10, marginTop: 12 }}>
            {frases.map((c) => (
              <View key={c.id} style={{ borderLeftWidth: 2, borderColor: a.base, paddingLeft: 10 }}>
                <T v="cuerpo">«{c.datos.animoTexto}»</T>
                <T v="tenue">Chequeo del {c.fecha}</T>
              </View>
            ))}
            {bitacoras.map((b) => (
              <View key={b.id} style={{ borderLeftWidth: 2, borderColor: color.linea, paddingLeft: 10 }}>
                <T v="cuerpo" numberOfLines={2}>«{b.datos.entrada}»</T>
                <T v="tenue">Bitácora del {b.fecha}</T>
              </View>
            ))}
            {!frases.length && !bitacoras.length && <T v="suave">Aún no escribiste cómo te sientes.</T>}
          </View>
        </Panel>
        <Panel titulo="Interpretación del asistente" icono={icono.mente} c={color.suave} style={{ flex: 1 }}>
          <Estado nivel="neutro" texto="Pendiente de IA" />
          <T v="suave" style={{ marginTop: 12 }}>Cuando se integre el asistente, aquí verás patrones de ánimo, descanso y estrés, separados de lo que tú registraste.</T>
          <T v="tenue" style={{ marginTop: 12 }}>Si el ánimo o el descanso te preocupan, habla con el responsable médico de la misión.</T>
        </Panel>
      </View>
    </>
  );
}

// ---------- Habilidades motoras ----------

function Motora() {
  const s = useSesion();
  const { refrescar, version } = useApp();
  void version;
  const a = useAcento();
  const pruebas = de<DatosMotora>(s, 'motora');
  const comp = compararMotora(s);
  const [probando, setProbando] = useState(false);
  const serie = [...pruebas].sort((x, y) => x.creado.localeCompare(y.creado)).map((p) => ({ t: new Date(p.creado).getTime(), valor: p.datos.mediana, etiqueta: `${p.datos.mediana} ms`, detalle: `${fechaHora(p.creado)} · mejor ${p.datos.mejor} ms` }));
  return (
    <>
      <View style={[est.fila, { gap: 18, alignItems: 'stretch' }]}>
        <Entrada style={{ flex: 1 }}>
          <Panel titulo="Reacción visual" icono={icono.rayo} resaltado style={{ flex: 1 }}>
            <View style={[est.fila, { gap: 20 }]}>
              <Anillo valor={comp.ultima ? Math.max(0, Math.min(1, (600 - comp.ultima) / 450)) : 0} tam={150} segmentos={36}>
                <T v="cifraGrande" style={{ fontSize: 40, color: a.base }}>{comp.ultima ?? '—'}</T>
                <T v="etiqueta">MS</T>
              </Anillo>
              <View style={{ flex: 1, gap: 8 }}>
                <T v="suave">Mediana de la última prueba · {comp.pruebas} pruebas</T>
                {comp.frenteAnterior !== null && comp.frenteAnterior !== 0 && <Estado nivel="info" texto={`${Math.abs(comp.frenteAnterior)} ms ${comp.frenteAnterior < 0 ? 'más rápida' : 'más lenta'} que la anterior`} />}
                <Boton texto={probando ? 'Cancelar' : 'Hacer una prueba'} icono={probando ? icono.cerrar : icono.jugar} tipo={probando ? 'secundario' : 'primario'} alPulsar={() => setProbando((p) => !p)} />
              </View>
            </View>
            <T v="tenue" style={{ marginTop: 10 }}>El anillo se llena más cuanto más rápida es la respuesta, solo como referencia visual de tus propios resultados.</T>
          </Panel>
        </Entrada>
        <Entrada retraso={80} style={{ flex: 1 }}>
          <Panel titulo="Resumen" icono={icono.info} style={{ flex: 1 }}>
            <Origen origen="automatico" />
            <T v="cuerpo" style={{ marginTop: 10, fontSize: 17, lineHeight: 26 }}>{comp.texto}</T>
            <T v="tenue" style={{ marginTop: 10 }}>El resumen del asistente llegará cuando la IA esté integrada.</T>
          </Panel>
        </Entrada>
      </View>
      {probando && (
        <Panel>
          <PruebaReaccion
            alTerminar={async (r) => {
              await crear(s, 'motora', { prueba: 'reaccion_visual', ...r });
              setProbando(false);
              refrescar();
            }}
          />
        </Panel>
      )}
      {serie.length > 1 && (
        <Panel titulo="Evolución de la mediana" icono={icono.grafica}>
          <Linea puntos={serie} alto={220} unidad="" />
        </Panel>
      )}
      {pruebas.length > 0 && (
        <Panel titulo="Pruebas medidas" icono={icono.registros}>
          {pruebas.slice(0, 10).map((p) => (
            <View key={p.id} style={[est.fila, { paddingVertical: 8, borderTopWidth: 1, borderColor: color.linea, gap: 12 }]}>
              <T v="cuerpo" style={{ flex: 1.4 }}>{fechaHora(p.creado)}</T>
              <T v="suave" style={{ flex: 1 }}>{ACENTO[p.etapa].nombre}</T>
              <T v="cifra" style={{ flex: 1, fontSize: 16 }}>{p.datos.mediana} ms</T>
              <View style={{ flex: 1.5 }}>
                <Barra valor={Math.max(0, Math.min(1, (600 - p.datos.mediana) / 450))} segmentos={15} alto={6} />
              </View>
            </View>
          ))}
        </Panel>
      )}
    </>
  );
}
