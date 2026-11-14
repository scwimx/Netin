import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { nombreZona, type Vista, type ZonaId } from '../datos/catalogos';
import { alfa, useAcento } from './Acento';
import { colorIntensidad, T } from './componentes';
import { color } from './tema';

// Figura en un lienzo de 200 × 460, escalada al alto disponible. En la vista
// frontal la derecha de la persona queda a la izquierda del dibujo.

type Lado = 'izq' | 'der' | 'centro';
interface Forma {
  base: string;
  lado: Lado;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  solo?: Vista;
}
const FORMAS: Forma[] = [
  { base: 'cabeza', lado: 'centro', x: 76, y: 10, w: 48, h: 60, r: 24 },
  { base: 'cuello', lado: 'centro', x: 89, y: 68, w: 22, h: 17, r: 5 },
  { base: 'hombro', lado: 'izq', x: 53, y: 85, w: 30, h: 24, r: 12 },
  { base: 'hombro', lado: 'der', x: 117, y: 85, w: 30, h: 24, r: 12 },
  { base: 'pecho', lado: 'centro', x: 78, y: 87, w: 44, h: 55, r: 9, solo: 'frontal' },
  { base: 'abdomen', lado: 'centro', x: 80, y: 145, w: 40, h: 45, r: 7, solo: 'frontal' },
  { base: 'espalda_alta', lado: 'centro', x: 78, y: 87, w: 44, h: 55, r: 9, solo: 'posterior' },
  { base: 'espalda_baja', lado: 'centro', x: 80, y: 145, w: 40, h: 45, r: 7, solo: 'posterior' },
  { base: 'cadera', lado: 'centro', x: 76, y: 193, w: 48, h: 29, r: 9 },
  { base: 'brazo', lado: 'izq', x: 50, y: 112, w: 18, h: 56, r: 8 },
  { base: 'brazo', lado: 'der', x: 132, y: 112, w: 18, h: 56, r: 8 },
  { base: 'antebrazo', lado: 'izq', x: 43, y: 171, w: 17, h: 56, r: 7 },
  { base: 'antebrazo', lado: 'der', x: 140, y: 171, w: 17, h: 56, r: 7 },
  { base: 'mano', lado: 'izq', x: 41, y: 230, w: 18, h: 26, r: 9 },
  { base: 'mano', lado: 'der', x: 141, y: 230, w: 18, h: 26, r: 9 },
  { base: 'muslo', lado: 'izq', x: 78, y: 225, w: 20, h: 80, r: 9 },
  { base: 'muslo', lado: 'der', x: 102, y: 225, w: 20, h: 80, r: 9 },
  { base: 'rodilla', lado: 'izq', x: 78, y: 307, w: 20, h: 20, r: 10 },
  { base: 'rodilla', lado: 'der', x: 102, y: 307, w: 20, h: 20, r: 10 },
  { base: 'pierna', lado: 'izq', x: 80, y: 330, w: 17, h: 80, r: 8 },
  { base: 'pierna', lado: 'der', x: 103, y: 330, w: 17, h: 80, r: 8 },
  { base: 'pie', lado: 'izq', x: 76, y: 414, w: 22, h: 16, r: 8 },
  { base: 'pie', lado: 'der', x: 102, y: 414, w: 22, h: 16, r: 8 },
];

function zonaDe(f: Forma, vista: Vista): ZonaId {
  if (f.lado === 'centro') return f.base as ZonaId;
  const derechaPersona = vista === 'frontal' ? f.lado === 'izq' : f.lado === 'der';
  return `${f.base}_${derechaPersona ? 'der' : 'izq'}` as ZonaId;
}

function Zona({ f, zona, escala, intensidad, elegida, latido, alElegir }: { f: Forma; zona: ZonaId; escala: number; intensidad?: number; elegida: boolean; latido: Animated.Value; alElegir: (z: ZonaId) => void }) {
  const a = useAcento();
  const tono = intensidad ? colorIntensidad(intensidad) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombreZona(zona)}${intensidad ? `, síntoma activo de intensidad ${intensidad}` : ''}`}
      accessibilityState={{ selected: elegida }}
      onPress={() => alElegir(zona)}
      style={({ hovered }: any) => ({
        position: 'absolute',
        left: f.x * escala,
        top: f.y * escala,
        width: f.w * escala,
        height: f.h * escala,
        borderRadius: f.r * escala,
        borderWidth: elegida ? 2.5 : 1,
        borderColor: elegida ? a.base : tono ?? (hovered ? alfa(a.base, 0.7) : color.linea),
        backgroundColor: hovered && !tono ? alfa(a.base, 0.15) : '#13223d',
        overflow: 'hidden',
      })}
    >
      {tono && <Animated.View style={{ flex: 1, backgroundColor: tono, opacity: latido.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }) }} />}
    </Pressable>
  );
}

export function Figura({ vista, alto, intensidades, seleccionada, alElegir, escanear = false }: { vista: Vista; alto: number; intensidades: Partial<Record<ZonaId, number>>; seleccionada: ZonaId | null; alElegir: (z: ZonaId) => void; escanear?: boolean }) {
  const a = useAcento();
  const escala = alto / 440;
  const latido = useRef(new Animated.Value(0)).current;
  const barrido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(latido, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    const b = Animated.loop(Animated.sequence([Animated.timing(barrido, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }), Animated.delay(1600)]));
    l.start();
    if (escanear) b.start();
    return () => {
      l.stop();
      b.stop();
    };
  }, [latido, barrido, escanear]);

  return (
    <View style={{ width: 200 * escala, height: alto }}>
      {FORMAS.filter((f) => !f.solo || f.solo === vista).map((f, i) => {
        const zona = zonaDe(f, vista);
        return <Zona key={i} f={f} zona={zona} escala={escala} intensidad={intensidades[zona]} elegida={seleccionada === zona} latido={latido} alElegir={alElegir} />;
      })}
      {escanear && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 30 * escala, right: 30 * escala, height: 2, backgroundColor: a.base, opacity: 0.8, top: 0, transform: [{ translateY: barrido.interpolate({ inputRange: [0, 1], outputRange: [0, alto] }) }], shadowColor: a.base, shadowOpacity: 1, shadowRadius: 10 }}
        />
      )}
    </View>
  );
}

export function MapaCorporal(props: { alto: number; intensidades: Partial<Record<ZonaId, number>>; seleccionada: ZonaId | null; alElegir: (z: ZonaId) => void; escanear?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
      {(['frontal', 'posterior'] as const).map((v) => (
        <View key={v} style={{ alignItems: 'center', gap: 8 }}>
          <T v="etiqueta">{v === 'frontal' ? 'FRENTE' : 'ESPALDA'}</T>
          <Figura vista={v} {...props} />
        </View>
      ))}
    </View>
  );
}

export function LeyendaMapa() {
  const items: [string, string][] = [
    ['#13223d', 'Sin síntomas'],
    [color.aviso, 'Leve o molesto'],
    [color.serio, 'Moderado'],
    [color.critico, 'Severo o más'],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {items.map(([c, t]) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c, borderWidth: 1, borderColor: color.linea }} />
          <T v="tenue">{t}</T>
        </View>
      ))}
    </View>
  );
}
