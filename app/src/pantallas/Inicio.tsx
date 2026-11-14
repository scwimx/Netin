import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { hoy } from '../datos/boveda';
import { INDICADORES, type DatosBitacora, type DatosChequeo, type DatosFoto, type DatosVital } from '../datos/catalogos';
import { calcularPendientes } from '../datos/pendientes';
import { compararMotora, de, estadoDia, listar, ultimosDias } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa, useAcento } from '../hud/Acento';
import { Anillo, Boton, Contador, Entrada, Estado, Icono, Origen, Panel, Pulso, T, est, type Nivel } from '../hud/componentes';
import { Tendencias } from '../hud/Grafica';
import { Avatar, ICONO_ETAPA } from '../hud/Marco';
import { ACENTO, color, icono } from '../hud/tema';

const haceCuanto = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};
const edad = (n: string | null) => {
  if (!n) return null;
  const a = new Date(n);
  const h = new Date();
  let e = h.getFullYear() - a.getFullYear();
  if (h < new Date(h.getFullYear(), a.getMonth(), a.getDate())) e--;
  return e;
};
/** Vigencia de una medición: llena si es de las últimas 24 h, vacía a los 7 días. No es un juicio clínico. */
const vigencia = (iso: string) => Math.max(0, Math.min(1, 1 - (Date.now() - new Date(iso).getTime() - 864e5) / (6 * 864e5)));

export function Inicio() {
  const s = useSesion();
  const { version, ir } = useApp();
  const a = useAcento();
  void version;
  const regs = listar(s);
  const dia = estadoDia(s);
  const semana = ultimosDias(s, 7);
  const pendientes = calcularPendientes(regs, dia);
  const vitales = de<DatosVital>(s, 'vital');
  const chequeo = de<DatosChequeo>(s, 'chequeo')[0];
  const bitacora = de<DatosBitacora>(s, 'bitacora')[0];
  const ultimaFoto = de<DatosFoto>(s, 'foto').find((f) => !f.datos.omitida);
  const fotoHoy = de<DatosFoto>(s, 'foto').find((f) => f.fecha === hoy());
  const [foto, setFoto] = useState<string | null>(null);
  useEffect(() => {
    if (ultimaFoto) void s.leerFoto(ultimaFoto.fecha).then(setFoto).catch(() => setFoto(null));
  }, [s, ultimaFoto?.fecha]);
  const motora = compararMotora(s);
  const pasos = [dia.foto !== 'pendiente', dia.chequeo, dia.motora, dia.bitacora];
  const nombre = s.contenido.ajustes.comoLlamarte || s.perfil.nombre.split(' ')[0];
  const anios = edad(s.contenido.nacimiento);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
      <Entrada>
        <View style={[est.fila, { justifyContent: 'space-between' }]}>
          <View>
            <T v="etiqueta" style={{ color: a.base }}>INICIO · {dia.fecha}</T>
            <T v="titulo">Hola, {nombre}</T>
          </View>
          {s.perfil.demo && <Estado nivel="neutro" texto="Perfil con datos ficticios" />}
        </View>
      </Entrada>

      <View style={[est.fila, { gap: 18, alignItems: 'stretch' }]}>
        {/* Tripulante */}
        <Entrada retraso={60} style={{ width: 300 }}>
          <Panel titulo="Tripulante" icono={icono.persona} style={{ flex: 1 }}>
            <View style={{ height: 190, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: color.linea, backgroundColor: '#050a16', alignItems: 'center', justifyContent: 'center' }}>
              {foto ? <Image source={{ uri: `data:image/jpeg;base64,${foto}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Foto de ${s.perfil.nombre}`} /> : <Avatar nombre={s.perfil.nombre} tam={90} />}
              <View style={{ position: 'absolute', left: 8, bottom: 8 }}>
                {fotoHoy ? <Estado nivel={fotoHoy.datos.omitida ? 'neutro' : 'bien'} texto={fotoHoy.datos.omitida ? 'Sin foto hoy' : 'Foto de hoy'} /> : ultimaFoto ? <Estado nivel="neutro" texto={`Foto del ${ultimaFoto.fecha}`} /> : null}
              </View>
            </View>
            <T v="subtitulo" style={{ marginTop: 12, fontSize: 20 }}>{s.perfil.nombre}</T>
            <T v="suave">{[s.perfil.rol || 'Tripulación', anios !== null ? `${anios} años` : null].filter(Boolean).join(' · ')}</T>
            <View style={{ marginTop: 10 }}>
              <Estado nivel="info" texto={`Etapa: ${ACENTO[s.perfil.etapa].nombre}`} g={ICONO_ETAPA[s.perfil.etapa]} />
            </View>
          </Panel>
        </Entrada>

        {/* Registro de hoy y semana */}
        <Entrada retraso={120} style={{ flex: 1 }}>
          <Panel titulo="Registro de hoy" icono={icono.ok} resaltado={!!dia.siguiente} style={{ flex: 1 }}>
            <View style={[est.fila, { gap: 26 }]}>
              <Anillo valor={pasos.filter(Boolean).length / 4} tam={170} segmentos={40}>
                <T v="cifraGrande" style={{ color: a.base, fontSize: 46 }}>{pasos.filter(Boolean).length}/4</T>
                <T v="etiqueta">PASOS</T>
              </Anillo>
              <View style={{ flex: 1, gap: 10 }}>
                {(['Foto del día', 'Chequeo', 'Prueba de reacción', 'Bitácora'] as const).map((t, i) => (
                  <View key={t} style={[est.fila, { gap: 10 }]}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: pasos[i] ? a.base : color.tenue, backgroundColor: pasos[i] ? a.base : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {pasos[i] && <Icono g={icono.ok} tam={11} c={a.oscuro} />}
                    </View>
                    <T v="cuerpo" style={{ flex: 1, color: pasos[i] ? color.tinta : color.suave }}>{t}</T>
                  </View>
                ))}
                {dia.siguiente ? (
                  <Pulso escala={1.03}>
                    <Boton texto="Continuar registro" icono={icono.adelante} grande alPulsar={() => ir('diario')} style={{ marginTop: 6 }} />
                  </Pulso>
                ) : (
                  <Estado nivel="bien" texto="Listo por hoy" />
                )}
              </View>
              <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: color.linea }} />
              <View style={{ gap: 10, minWidth: 250 }}>
                <T v="etiqueta">ÚLTIMOS 7 DÍAS</T>
                <View style={[est.fila, { gap: 6 }]}>
                  {semana.map((d) => {
                    const n = Object.values(d.pasos).filter(Boolean).length;
                    const esHoy = d.fecha === dia.fecha;
                    return (
                      <View key={d.fecha} style={{ alignItems: 'center', gap: 5 }} accessibilityLabel={`${d.fecha}: ${n} de 4 pasos`}>
                        <View style={{ width: 28, height: 64, borderRadius: 3, borderWidth: 1, borderColor: esHoy ? a.base : color.linea, padding: 2, justifyContent: 'flex-end', gap: 2 }}>
                          {[3, 2, 1, 0].map((k) => (
                            <View key={k} style={{ flex: 1, borderRadius: 1, backgroundColor: k < n ? alfa(a.base, 0.35 + 0.15 * k) : 'transparent' }} />
                          ))}
                        </View>
                        <T v="tenue" style={{ color: esHoy ? a.base : color.tenue }}>{new Date(d.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' }).toUpperCase()}</T>
                      </View>
                    );
                  })}
                </View>
                <T v="tenue">Cada barra muestra cuántos de los 4 pasos registraste ese día.</T>
              </View>
            </View>
          </Panel>
        </Entrada>
      </View>

      {/* Alertas */}
      {pendientes.filter((p) => p.id !== 'dia').length > 0 && (
        <Entrada retraso={160}>
          <Panel titulo="Alertas de tus registros" icono={icono.alerta} c={color.aviso}>
            <View style={{ gap: 10 }}>
              {pendientes
                .filter((p) => p.id !== 'dia')
                .slice(0, 5)
                .map((p) => (
                  <View key={p.id} style={[est.fila, { gap: 12 }]}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Estado nivel={p.nivel as Nivel} texto={p.titulo} />
                      <T v="tenue">{p.respaldo}</T>
                    </View>
                    {p.accion && <Boton texto={p.accion.texto} tipo="secundario" alPulsar={() => ir(p.accion!.pantalla, p.accion!.params)} />}
                  </View>
                ))}
            </View>
          </Panel>
        </Entrada>
      )}

      {/* Vitales */}
      <Entrada retraso={200}>
        <Panel titulo="Últimas mediciones" icono={icono.salud} accion={<Boton texto="Ver salud" tipo="fantasma" icono={icono.adelante} alPulsar={() => ir('salud')} />}>
          <View style={[est.fila, { flexWrap: 'wrap', gap: 14 }]}>
            {INDICADORES.map((ind) => {
              const v = vitales.find((x) => x.datos.indicador === ind.id);
              return (
                <View key={ind.id} style={{ width: 168, alignItems: 'center', gap: 6, paddingVertical: 8, borderWidth: 1, borderColor: color.linea, borderRadius: 4, backgroundColor: color.panelAlto }}>
                  <Anillo valor={v ? vigencia(v.datos.medidoEn) : 0} tam={104} segmentos={28} grosor={7} c={v ? undefined : color.tenue}>
                    {v ? (
                      <>
                        {v.datos.valor2 !== undefined ? <T v="cifra" style={{ fontSize: 19 }}>{v.datos.valor}/{v.datos.valor2}</T> : <Contador valor={v.datos.valor} decimales={Number.isInteger(v.datos.valor) ? 0 : 1} />}
                        <T v="tenue">{ind.unidad}</T>
                      </>
                    ) : (
                      <T v="tenue">—</T>
                    )}
                  </Anillo>
                  <T v="subtitulo" style={{ fontSize: 14 }}>{ind.nombre}</T>
                  {v ? (
                    <>
                      <T v="tenue">{haceCuanto(v.datos.medidoEn)}</T>
                      <Origen origen={v.datos.origen} />
                    </>
                  ) : (
                    <T v="tenue">Sin datos</T>
                  )}
                </View>
              );
            })}
          </View>
          <T v="tenue" style={{ marginTop: 10 }}>El anillo muestra qué tan reciente es la medición: lleno si es de las últimas 24 h. No indica si el valor es bueno o malo.</T>
        </Panel>
      </Entrada>

      <View style={[est.fila, { gap: 18, alignItems: 'stretch' }]}>
        <Entrada retraso={240} style={{ flex: 2 }}>
          <Panel titulo="Tendencias" icono={icono.grafica} style={{ flex: 1 }}>
            <Tendencias vitales={vitales} />
          </Panel>
        </Entrada>
        <Entrada retraso={280} style={{ flex: 1, gap: 18 }}>
          <Panel titulo="Último chequeo" icono={icono.salud}>
            {chequeo ? (
              <View style={{ gap: 8 }}>
                <T v="tenue">{chequeo.fecha}</T>
                <T v="cuerpo" numberOfLines={5}>{chequeo.datos.resumen.texto}</T>
                <Origen origen={chequeo.datos.resumen.origen} />
              </View>
            ) : (
              <T v="suave">Todavía no hay chequeos.</T>
            )}
          </Panel>
          <Panel titulo="Bitácora" icono={icono.libro}>
            {bitacora ? (
              <View style={{ gap: 6 }}>
                <T v="tenue">{bitacora.fecha}</T>
                <T v="cuerpo" numberOfLines={4}>{bitacora.datos.entrada}</T>
              </View>
            ) : (
              <T v="suave">Todavía no hay entradas.</T>
            )}
          </Panel>
          <Panel titulo="Reflejos" icono={icono.rayo}>
            <T v="cuerpo">{motora.texto}</T>
          </Panel>
        </Entrada>
      </View>

    </ScrollView>
  );
}
