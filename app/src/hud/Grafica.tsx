import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { INDICADORES, indicador, type DatosVital, type IndicadorId, type Registro } from '../datos/catalogos';
import { alfa, useAcento } from './Acento';
import { T, est } from './componentes';
import { color, fuente } from './tema';

// Gráfica de línea hecha con vistas: un eje, una serie. El origen de cada
// punto se codifica con la forma del marcador y se nombra en el detalle.

const ORIGEN: Record<string, string> = { manual: 'Manual', simulada: 'Simulada', importada: 'Importada' };
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export interface Punto {
  t: number;
  valor: number;
  etiqueta: string;
  detalle: string;
  forma?: 'lleno' | 'hueco' | 'cuadro';
}

export function Linea({ puntos, alto = 200, c, unidad = '' }: { puntos: Punto[]; alto?: number; c?: string; unidad?: string }) {
  const a = useAcento();
  const tono = c ?? a.base;
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  if (!puntos.length) return null;
  const min = Math.min(...puntos.map((p) => p.valor));
  const max = Math.max(...puntos.map((p) => p.valor));
  const margen = (max - min || Math.abs(max) || 1) * 0.15;
  const lo = min - margen;
  const hi = max + margen;
  const izq = 44;
  const util = Math.max(1, ancho - izq - 12);
  const t0 = puntos[0].t;
  const t1 = puntos.at(-1)!.t;
  const x = (t: number) => izq + (t1 === t0 ? util / 2 : ((t - t0) / (t1 - t0)) * util);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (alto - 28);
  const marcas = [hi - margen, (hi + lo) / 2, lo + margen];

  return (
    <View style={{ height: alto }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessibilityLabel={`Gráfica de ${puntos.length} puntos`}>
      {ancho > 0 && (
        <>
          {marcas.map((m, i) => (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: y(m) - 8, flexDirection: 'row', alignItems: 'center' }}>
              <T v="tenue" style={{ width: izq - 6, textAlign: 'right', fontFamily: fuente.hud, fontSize: 11 }}>{Number(m.toFixed(1))}</T>
              <View style={{ flex: 1, height: 1, marginLeft: 6, backgroundColor: color.lineaSuave }} />
            </View>
          ))}
          {puntos.slice(1).map((p, i) => {
            const x1 = x(puntos[i].t);
            const y1 = y(puntos[i].valor);
            const x2 = x(p.t);
            const y2 = y(p.valor);
            const largo = Math.hypot(x2 - x1, y2 - y1);
            const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return <View key={i} style={{ position: 'absolute', left: (x1 + x2) / 2 - largo / 2, top: (y1 + y2) / 2 - 1, width: largo, height: 2, backgroundColor: tono, transform: [{ rotate: `${ang}deg` }] }} />;
          })}
          {puntos.map((p, i) => {
            const forma = p.forma ?? 'lleno';
            return (
              <Pressable key={i} onHoverIn={() => setSel(i)} onHoverOut={() => setSel(null)} onPress={() => setSel(sel === i ? null : i)} accessibilityLabel={`${p.etiqueta}, ${p.detalle}`} style={{ position: 'absolute', left: x(p.t) - 10, top: y(p.valor) - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: sel === i ? 13 : 10, height: sel === i ? 13 : 10, borderRadius: forma === 'cuadro' ? 2 : 7, borderWidth: 2, borderColor: tono, backgroundColor: forma === 'hueco' ? color.espacio : tono }} />
              </Pressable>
            );
          })}
          {sel !== null && (
            <View style={{ position: 'absolute', left: Math.min(Math.max(0, x(puntos[sel].t) - 80), ancho - 170), top: Math.max(0, y(puntos[sel].valor) - 68), width: 170, padding: 8, borderRadius: 4, borderWidth: 1, borderColor: tono, backgroundColor: color.panelAlto }}>
              <T v="cifra" style={{ fontSize: 17 }}>{puntos[sel].etiqueta} {unidad}</T>
              <T v="tenue">{puntos[sel].detalle}</T>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function LeyendaOrigen() {
  const a = useAcento();
  const items: [string, 'lleno' | 'hueco' | 'cuadro'][] = [
    ['Manual', 'lleno'],
    ['Simulada', 'hueco'],
    ['Importada', 'cuadro'],
  ];
  return (
    <View style={[est.fila, { gap: 14 }]}>
      {items.map(([t, f]) => (
        <View key={t} style={[est.fila, { gap: 6 }]}>
          <View style={{ width: 10, height: 10, borderRadius: f === 'cuadro' ? 2 : 6, borderWidth: 2, borderColor: a.base, backgroundColor: f === 'hueco' ? color.espacio : a.base }} />
          <T v="tenue">{t}</T>
        </View>
      ))}
    </View>
  );
}

/** Tendencia de un indicador elegido entre los que tienen mediciones. */
export function Tendencias({ vitales, alto = 210 }: { vitales: Registro<DatosVital>[]; alto?: number }) {
  const a = useAcento();
  const disponibles = INDICADORES.filter((i) => vitales.some((v) => v.datos.indicador === i.id));
  const [elegido, setElegido] = useState<IndicadorId | null>(null);
  const actual = elegido && disponibles.some((d) => d.id === elegido) ? elegido : (disponibles[0]?.id ?? null);
  if (!actual) return <T v="suave" style={{ textAlign: 'center', paddingVertical: 30 }}>Todavía no hay mediciones. Agrega una en Salud.</T>;
  const ind = indicador(actual)!;
  const puntos: Punto[] = vitales
    .filter((v) => v.datos.indicador === actual)
    .map((v) => ({
      t: new Date(v.datos.medidoEn).getTime(),
      valor: v.datos.valor,
      etiqueta: v.datos.valor2 !== undefined ? `${v.datos.valor}/${v.datos.valor2}` : String(v.datos.valor),
      detalle: `${fechaHora(v.datos.medidoEn)} · ${ORIGEN[v.datos.origen]}`,
      forma: v.datos.origen === 'importada' ? ('cuadro' as const) : v.datos.origen === 'simulada' ? ('hueco' as const) : ('lleno' as const),
    }))
    .sort((x, y) => x.t - y.t)
    .slice(-30);
  return (
    <View style={{ gap: 12 }}>
      <View style={[est.fila, { flexWrap: 'wrap', gap: 6 }]}>
        {disponibles.map((d) => {
          const sel = d.id === actual;
          return (
            <Pressable key={d.id} accessibilityRole="tab" accessibilityState={{ selected: sel }} onPress={() => setElegido(d.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3, borderWidth: 1, borderColor: sel ? a.base : color.linea, backgroundColor: sel ? alfa(a.base, 0.2) : 'transparent' }}>
              <T v="tenue" style={{ color: sel ? a.base : color.suave, fontWeight: '600' }}>{d.nombre}</T>
            </Pressable>
          );
        })}
      </View>
      <Linea puntos={puntos} alto={alto} unidad={ind.unidad} />
      <LeyendaOrigen />
    </View>
  );
}
