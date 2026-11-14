import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { ErrorNetin } from '../datos/boveda';
import { indicador, INICIOS, INTENSIDADES, MANIFESTACIONES, nombreIntensidad, nombreZona, TIPOS_REGISTRO, ZONAS, type Registro, type TipoRegistro } from '../datos/catalogos';
import { corregir, eliminar, listar, revisiones } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa, useAcento } from '../hud/Acento';
import { Boton, Campo, Entrada, Estado, Icono, Opciones, Origen, Panel, T, est } from '../hud/componentes';
import { ACENTO, color, icono } from '../hud/tema';

export const ICONO_TIPO: Record<TipoRegistro, string> = { foto: icono.camara, chequeo: icono.salud, sintoma: icono.cuerpo, motora: icono.rayo, bitacora: icono.libro, vital: icono.grafica, aviso: icono.sirena };
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

export function describir(r: Registro): { titulo: string; detalle: string } {
  const d = r.datos;
  switch (r.tipo) {
    case 'foto':
      return { titulo: d.omitida ? 'Día sin foto' : 'Foto diaria', detalle: d.omitida ? d.motivo ?? '' : 'Guardada y cifrada' };
    case 'chequeo':
      return { titulo: 'Chequeo diario', detalle: d.resumen?.texto ?? '' };
    case 'sintoma':
      return { titulo: `${d.manifestacion} · ${nombreZona(d.zona)}`, detalle: `${d.estado === 'resuelto' ? 'Resuelto' : `Intensidad ${d.intensidad} (${nombreIntensidad(d.intensidad).toLowerCase()})`}${d.notas ? ` · ${d.notas}` : ''}` };
    case 'motora':
      return { titulo: 'Prueba de reacción', detalle: `Mediana ${d.mediana} ms · mejor ${d.mejor} ms · ${d.intentos.length} intentos` };
    case 'bitacora':
      return { titulo: 'Bitácora', detalle: d.entrada };
    case 'vital': {
      const ind = indicador(d.indicador);
      return { titulo: ind?.nombre ?? d.indicador, detalle: `${d.valor2 !== undefined ? `${d.valor}/${d.valor2}` : d.valor} ${ind?.unidad ?? ''} · ${d.origen}` };
    }
    case 'aviso':
      return { titulo: `${d.alcance === 'simulacro' ? 'Simulacro' : 'Aviso local'}: ${d.titulo}`, detalle: `${d.estado === 'abierto' ? 'Abierto' : 'Cerrado'}${d.detalle ? ` · ${d.detalle}` : ''}` };
  }
}

export function Registros() {
  const s = useSesion();
  const { version, params } = useApp();
  const a = useAcento();
  void version;
  const [tipos, setTipos] = useState<TipoRegistro[]>(params.tipo ? [params.tipo as TipoRegistro] : []);
  const [abierto, setAbierto] = useState<Registro | null>(null);
  const lista = listar(s, { tipos });
  const grupos = new Map<string, Registro[]>();
  for (const r of lista) grupos.set(r.fecha, [...(grupos.get(r.fecha) ?? []), r]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 24, paddingBottom: 12, gap: 12 }}>
        <View style={[est.fila, { justifyContent: 'space-between' }]}>
          <T v="titulo">Registros</T>
          <T v="suave">{lista.length} registros</T>
        </View>
        <View style={[est.fila, { flexWrap: 'wrap', gap: 8 }]}>
          {TIPOS_REGISTRO.map((t) => {
            const sel = tipos.includes(t.id);
            return (
              <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: sel }} onPress={() => setTipos(sel ? tipos.filter((x) => x !== t.id) : [...tipos, t.id])} style={({ hovered }: any) => [est.fila, { gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, borderWidth: 1, borderColor: sel ? a.base : hovered ? alfa(a.base, 0.5) : color.linea, backgroundColor: sel ? alfa(a.base, 0.2) : color.panel }]}>
                <Icono g={ICONO_TIPO[t.id]} tam={13} c={sel ? a.base : color.suave} />
                <T v="tenue" style={{ color: sel ? a.base : color.suave, fontWeight: '600' }}>{t.nombre}</T>
              </Pressable>
            );
          })}
          {tipos.length > 0 && <Boton texto="Quitar filtros" tipo="fantasma" icono={icono.cerrar} alPulsar={() => setTipos([])} />}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 18 }}>
        {!lista.length && <Panel><T v="suave">No hay registros con estos filtros.</T></Panel>}
        {[...grupos.entries()].map(([fecha, rs], gi) => (
          <Entrada key={fecha} retraso={Math.min(gi, 6) * 40}>
            <T v="etiqueta" style={{ color: a.base, marginBottom: 8 }}>{new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</T>
            <View style={{ borderLeftWidth: 2, borderColor: alfa(a.base, 0.35), paddingLeft: 16, gap: 8 }}>
              {rs.map((r) => {
                const { titulo, detalle } = describir(r);
                return (
                  <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={titulo} onPress={() => setAbierto(r)} style={({ hovered }: any) => [est.fila, { gap: 14, padding: 12, borderRadius: 4, borderWidth: 1, borderColor: hovered ? a.base : color.linea, backgroundColor: hovered ? alfa(a.base, 0.06) : color.panel }]}>
                    <View style={{ position: 'absolute', left: -24, width: 12, height: 12, borderRadius: 2, backgroundColor: r.tipo === 'aviso' ? color.critico : a.base, transform: [{ rotate: '45deg' }] }} />
                    <Icono g={ICONO_TIPO[r.tipo]} tam={18} c={r.tipo === 'aviso' ? color.critico : a.base} />
                    <View style={{ flex: 1 }}>
                      <T v="subtitulo" style={{ fontSize: 15 }}>{titulo}</T>
                      {!!detalle && <T v="suave" numberOfLines={2}>{detalle}</T>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <T v="tenue">{hora(r.creado)}</T>
                      <T v="tenue">{ACENTO[r.etapa].nombre}</T>
                      {r.revisiones > 0 && <T v="tenue" style={{ color: color.aviso }}>corregido</T>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Entrada>
        ))}
      </ScrollView>
      {abierto && <Detalle r={abierto} alCerrar={() => setAbierto(null)} />}
    </View>
  );
}

function Detalle({ r, alCerrar }: { r: Registro; alCerrar: () => void }) {
  const s = useSesion();
  const { refrescar } = useApp();
  const [modo, setModo] = useState<'ver' | 'editar' | 'borrar'>('ver');
  const [historial, setHistorial] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { titulo } = describir(r);
  const editable = !['foto', 'motora'].includes(r.tipo);
  if (r.tipo === 'foto' && !r.datos.omitida && foto === null) void s.leerFoto(r.fecha).then((f) => setFoto(f ?? ''));

  return (
    <Modal transparent visible animationType="fade" onRequestClose={alCerrar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,4,10,0.78)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 640, maxHeight: '90%' }}>
          <Panel titulo={titulo} icono={ICONO_TIPO[r.tipo]} resaltado accion={<Boton texto="" etiqueta="Cerrar" icono={icono.cerrar} tipo="fantasma" alPulsar={alCerrar} />}>
            <ScrollView style={{ maxHeight: 560 }}>
              <T v="tenue" style={{ marginBottom: 12 }}>{new Date(r.creado).toLocaleString('es')} · {ACENTO[r.etapa].nombre}{r.revisiones ? ` · corregido ${r.revisiones} ${r.revisiones === 1 ? 'vez' : 'veces'}` : ''}</T>
              {modo === 'editar' ? (
                <FormCorreccion r={r} alCancelar={() => setModo('ver')} alGuardar={() => { refrescar(); alCerrar(); }} />
              ) : modo === 'borrar' ? (
                <View style={{ gap: 14 }}>
                  <T v="subtitulo">¿Eliminar este registro?</T>
                  <T v="suave">Se borra «{titulo}» del {r.fecha}{r.tipo === 'foto' ? ', junto con la imagen' : ''}. No se puede deshacer.</T>
                  <View style={[est.fila, { justifyContent: 'flex-end', gap: 10 }]}>
                    <Boton texto="Cancelar" tipo="fantasma" alPulsar={() => setModo('ver')} />
                    <Boton
                      texto="Eliminar"
                      tipo="peligro"
                      icono={icono.borrar}
                      alPulsar={async () => {
                        try {
                          await eliminar(s, r.id);
                          refrescar();
                          alCerrar();
                        } catch (e) {
                          setError(e instanceof ErrorNetin ? e.message : 'No se pudo eliminar.');
                        }
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Contenido r={r} foto={foto} />
                  <View style={[est.fila, { gap: 10, borderTopWidth: 1, borderColor: color.linea, paddingTop: 14 }]}>
                    {editable && <Boton texto="Corregir" icono={icono.editar} tipo="secundario" alPulsar={() => setModo('editar')} />}
                    {r.revisiones > 0 && <Boton texto={historial ? 'Ocultar historial' : 'Ver historial'} icono={icono.historial} tipo="fantasma" alPulsar={() => setHistorial((h) => !h)} />}
                    <View style={{ flex: 1 }} />
                    <Boton texto="Eliminar" icono={icono.borrar} tipo="peligro" alPulsar={() => setModo('borrar')} />
                  </View>
                  {!editable && r.tipo === 'motora' && <T v="tenue">Los resultados medidos no se corrigen. Si la prueba salió mal, elimínala y repítela.</T>}
                  {historial &&
                    revisiones(s, r.id).map((h) => (
                      <View key={h.id} style={{ padding: 10, borderWidth: 1, borderColor: color.linea, borderRadius: 4, backgroundColor: color.panelAlto }}>
                        <T v="tenue">Versión reemplazada el {new Date(h.reemplazado).toLocaleString('es')}{h.motivo ? ` · ${h.motivo}` : ''}</T>
                        <T v="suave">{describir({ ...r, datos: h.datos }).detalle}</T>
                      </View>
                    ))}
                </View>
              )}
              {error && <T v="suave" style={{ color: color.critico, marginTop: 8 }}>{error}</T>}
            </ScrollView>
          </Panel>
        </View>
      </View>
    </Modal>
  );
}

function Contenido({ r, foto }: { r: Registro; foto: string | null }) {
  const d = r.datos;
  switch (r.tipo) {
    case 'foto':
      return d.omitida ? <Estado nivel="neutro" texto={`Sin foto: ${d.motivo}`} /> : foto ? <Image source={{ uri: `data:image/jpeg;base64,${foto}` }} style={{ width: '100%', height: 380, borderRadius: 4 }} resizeMode="contain" accessibilityLabel="Foto diaria" /> : <T v="suave">Descifrando foto…</T>;
    case 'chequeo':
      return (
        <View style={{ gap: 10 }}>
          <View style={[est.fila, { gap: 8, flexWrap: 'wrap' }]}>
            <Estado nivel="info" texto={`Ánimo ${d.animo} de 5`} />
            <Estado nivel="info" texto={`Estrés ${d.estres} de 5`} />
            <Estado nivel="info" texto={d.suenoHoras === null ? 'Sueño sin registrar' : `Sueño ${d.suenoHoras} h`} />
          </View>
          {!!d.animoTexto && <T v="cuerpo">«{d.animoTexto}»</T>}
          <View style={{ padding: 12, borderWidth: 1, borderColor: color.linea, borderRadius: 4, gap: 8 }}>
            <View style={[est.fila, { gap: 8 }]}>
              <Origen origen={d.resumen.origen} />
              {d.resumen.editado && <T v="tenue">Editado por ti</T>}
            </View>
            <T v="cuerpo">{d.resumen.texto}</T>
          </View>
        </View>
      );
    case 'bitacora':
      return (
        <View style={{ gap: 10 }}>
          <T v="cuerpo" style={{ fontSize: 16, lineHeight: 25 }}>{d.entrada}</T>
          <T v="tenue">{d.resumen ? `Resumen: ${d.resumen.texto}` : 'Resumen de IA: pendiente de integración.'}</T>
        </View>
      );
    case 'motora':
      return (
        <View style={{ gap: 6 }}>
          <T v="cifraGrande">{d.mediana} ms</T>
          <T v="suave">Intentos: {d.intentos.join(', ')} ms · anticipos: {d.anticipos}</T>
        </View>
      );
    case 'vital':
      return (
        <View style={{ gap: 6 }}>
          <T v="cifraGrande">{describir(r).detalle.split(' · ')[0]}</T>
          <T v="suave">Medido el {new Date(d.medidoEn).toLocaleString('es')}</T>
          <Origen origen={d.origen} />
        </View>
      );
    default:
      return <T v="suave">{describir(r).detalle}</T>;
  }
}

function FormCorreccion({ r, alCancelar, alGuardar }: { r: Registro; alCancelar: () => void; alGuardar: () => void }) {
  const s = useSesion();
  const [d, setD] = useState<any>(JSON.parse(JSON.stringify(r.datos)));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const poner = (k: string, v: unknown) => setD((x: any) => ({ ...x, [k]: v }));
  const guardar = async () => {
    try {
      await corregir(s, r.id, r.tipo === 'chequeo' ? { ...d, resumen: { ...d.resumen, editado: true } } : d, motivo);
      alGuardar();
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <View style={{ gap: 12 }}>
      {r.tipo === 'sintoma' && (
        <>
          <T v="etiqueta">ZONA</T>
          <Opciones valor={d.zona} alElegir={(v) => poner('zona', v)} opciones={ZONAS.map((z) => ({ v: z.id, t: z.nombre }))} />
          <T v="etiqueta">SÍNTOMA</T>
          <Opciones valor={d.manifestacion} alElegir={(v) => poner('manifestacion', v)} opciones={[...new Set([d.manifestacion, ...MANIFESTACIONES])].map((m) => ({ v: m, t: m }))} />
          <T v="etiqueta">INTENSIDAD</T>
          <Opciones columnas={5} valor={d.intensidad} alElegir={(v) => poner('intensidad', v)} opciones={INTENSIDADES.map((i) => ({ v: i.valor, t: String(i.valor), sub: i.nombre }))} />
          <T v="etiqueta">INICIO</T>
          <Opciones columnas={4} valor={d.inicio} alElegir={(v) => poner('inicio', v)} opciones={INICIOS.map((i) => ({ v: i.id, t: i.nombre }))} />
          <T v="etiqueta">ESTADO</T>
          <Opciones columnas={2} valor={d.estado} alElegir={(v) => poner('estado', v)} opciones={[{ v: 'activo', t: 'Activo' }, { v: 'resuelto', t: 'Resuelto' }]} />
          <Campo etiqueta="Notas" value={d.notas} onChangeText={(t) => poner('notas', t)} multiline />
        </>
      )}
      {r.tipo === 'vital' && (
        <View style={[est.fila, { gap: 12 }]}>
          <View style={{ flex: 1 }}><Campo etiqueta="Valor" value={String(d.valor)} onChangeText={(t) => poner('valor', t)} /></View>
          {d.valor2 !== undefined && <View style={{ flex: 1 }}><Campo etiqueta="Segundo valor" value={String(d.valor2)} onChangeText={(t) => poner('valor2', t)} /></View>}
        </View>
      )}
      {r.tipo === 'bitacora' && <Campo etiqueta="Entrada" value={d.entrada} onChangeText={(t) => poner('entrada', t)} multiline style={{ minHeight: 200 }} />}
      {r.tipo === 'chequeo' && <Campo etiqueta="Resumen" value={d.resumen.texto} onChangeText={(t) => poner('resumen', { ...d.resumen, texto: t })} multiline />}
      {r.tipo === 'aviso' && (
        <>
          <T v="etiqueta">ESTADO</T>
          <Opciones columnas={2} valor={d.estado} alElegir={(v) => poner('estado', v)} opciones={[{ v: 'abierto', t: 'Abierto' }, { v: 'cerrado', t: 'Cerrado' }]} />
          <Campo etiqueta="Detalle" value={d.detalle} onChangeText={(t) => poner('detalle', t)} multiline />
        </>
      )}
      <Campo etiqueta="¿Qué corriges? (opcional)" value={motivo} onChangeText={setMotivo} maxLength={200} placeholder="Ej.: era el otro hombro" />
      <T v="tenue">La versión anterior queda en el historial.</T>
      {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
      <View style={[est.fila, { justifyContent: 'flex-end', gap: 10 }]}>
        <Boton texto="Cancelar" tipo="fantasma" alPulsar={alCancelar} />
        <Boton texto="Guardar corrección" icono={icono.ok} alPulsar={guardar} />
      </View>
    </View>
  );
}
