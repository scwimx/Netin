import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { alfa, useAcento } from './Acento';
import { color, fuente, icono } from './tema';

// ---------- Texto ----------

type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'suave' | 'tenue' | 'etiqueta' | 'cifra' | 'cifraGrande';
const VARIANTES: Record<Variante, TextStyle> = {
  titulo: { fontFamily: fuente.hud, fontSize: 30, fontWeight: '700', color: color.tinta, letterSpacing: 0.5 },
  subtitulo: { fontFamily: fuente.hud, fontSize: 18, fontWeight: '600', color: color.tinta, letterSpacing: 0.4 },
  cuerpo: { fontFamily: fuente.texto, fontSize: 15, color: color.tinta, lineHeight: 22 },
  suave: { fontFamily: fuente.texto, fontSize: 14, color: color.suave, lineHeight: 20 },
  tenue: { fontFamily: fuente.texto, fontSize: 12, color: color.tenue, lineHeight: 17 },
  etiqueta: { fontFamily: fuente.hud, fontSize: 12, fontWeight: '600', color: color.suave, letterSpacing: 1.6 },
  cifra: { fontFamily: fuente.hud, fontSize: 24, fontWeight: '700', color: color.tinta, fontVariant: ['tabular-nums'] },
  cifraGrande: { fontFamily: fuente.hud, fontSize: 52, fontWeight: '700', color: color.tinta, fontVariant: ['tabular-nums'], letterSpacing: -1 },
};

export function T({ v = 'cuerpo', style, children, numberOfLines }: { v?: Variante; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return (
    <Text style={[VARIANTES[v], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Icono({ g, tam = 18, c, style }: { g: string; tam?: number; c?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: fuente.iconos, fontSize: tam, color: c ?? color.tinta }, style]}>{g}</Text>;
}

// ---------- Panel con esquinas de HUD ----------

function Esquinas({ c, tam = 12 }: { c: string; tam?: number }) {
  const g = 2;
  const base: ViewStyle = { position: 'absolute', width: tam, height: tam, borderColor: c };
  return (
    <>
      <View pointerEvents="none" style={[base, { top: -1, left: -1, borderTopWidth: g, borderLeftWidth: g }]} />
      <View pointerEvents="none" style={[base, { top: -1, right: -1, borderTopWidth: g, borderRightWidth: g }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, left: -1, borderBottomWidth: g, borderLeftWidth: g }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, right: -1, borderBottomWidth: g, borderRightWidth: g }]} />
    </>
  );
}

export function Panel({
  titulo,
  icono: g,
  accion,
  children,
  style,
  resaltado = false,
  c,
  mayusculas = true,
}: {
  mayusculas?: boolean;
  titulo?: string;
  icono?: string;
  accion?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  resaltado?: boolean;
  c?: string;
}) {
  const a = useAcento();
  const tono = c ?? a.base;
  return (
    <View style={[est.panel, resaltado && { borderColor: alfa(tono, 0.55), backgroundColor: alfa(tono, 0.07) }, style]}>
      <Esquinas c={resaltado ? tono : alfa(tono, 0.7)} />
      {(titulo || accion) && (
        <View style={est.panelCabeza}>
          <View style={est.fila}>
            {g && <Icono g={g} tam={15} c={tono} style={{ marginRight: 8 }} />}
            {titulo && <T v="etiqueta" style={{ color: tono }}>{mayusculas ? titulo.toUpperCase() : titulo}</T>}
          </View>
          {accion}
        </View>
      )}
      {children}
    </View>
  );
}

// ---------- Botón ----------

type TipoBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';
export function Boton({
  texto,
  icono: g,
  alPulsar,
  tipo = 'primario',
  desactivado = false,
  grande = false,
  style,
  etiqueta,
}: {
  texto: string;
  icono?: string;
  alPulsar: () => void;
  tipo?: TipoBoton;
  desactivado?: boolean;
  grande?: boolean;
  style?: StyleProp<ViewStyle>;
  etiqueta?: string;
}) {
  const a = useAcento();
  const escala = useRef(new Animated.Value(1)).current;
  const [encima, setEncima] = useState(false);
  const animar = (v: number) => Animated.spring(escala, { toValue: v, useNativeDriver: false, speed: 40, bounciness: 8 }).start();
  const tono = tipo === 'peligro' ? color.critico : a.base;
  const fondo =
    tipo === 'primario' ? tono : tipo === 'peligro' ? alfa(color.critico, encima ? 0.28 : 0.16) : tipo === 'secundario' ? alfa(tono, encima ? 0.22 : 0.12) : encima ? alfa(tono, 0.1) : 'transparent';
  const tinta = tipo === 'primario' ? a.oscuro : tipo === 'peligro' ? color.critico : tipo === 'fantasma' ? color.suave : tono;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      accessibilityState={{ disabled: desactivado }}
      disabled={desactivado}
      onPress={alPulsar}
      onPressIn={() => animar(0.95)}
      onPressOut={() => animar(1)}
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      style={style}
    >
      <Animated.View
        style={[
          est.boton,
          grande && est.botonGrande,
          {
            backgroundColor: fondo,
            borderColor: tipo === 'fantasma' ? 'transparent' : tipo === 'primario' ? alfa('#ffffff', encima ? 0.6 : 0.25) : alfa(tono, 0.5),
            opacity: desactivado ? 0.4 : 1,
            transform: [{ scale: escala }],
          },
          tipo === 'primario' && encima && !desactivado && { shadowColor: tono, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
        ]}
      >
        {g && <Icono g={g} tam={grande ? 18 : 15} c={tinta} style={{ marginRight: texto ? 8 : 0 }} />}
        {!!texto && <T v="subtitulo" style={{ color: tinta, fontSize: grande ? 17 : 15 }}>{texto}</T>}
      </Animated.View>
    </Pressable>
  );
}

// ---------- Estado (color + ícono + etiqueta) ----------

export type Nivel = 'bien' | 'aviso' | 'serio' | 'critico' | 'info' | 'neutro';
const NIVELES: Record<Nivel, { c: string; g: string }> = {
  bien: { c: color.bien, g: icono.ok },
  aviso: { c: color.aviso, g: icono.alerta },
  serio: { c: color.serio, g: icono.alerta },
  critico: { c: color.critico, g: icono.sirena },
  info: { c: color.info, g: icono.info },
  neutro: { c: color.suave, g: icono.info },
};
export function Estado({ nivel, texto, g }: { nivel: Nivel; texto: string; g?: string }) {
  const n = NIVELES[nivel];
  return (
    <View style={[est.estado, { backgroundColor: alfa(n.c, 0.12), borderColor: alfa(n.c, 0.45) }]}>
      <Icono g={g ?? n.g} tam={12} c={n.c} style={{ marginRight: 6 }} />
      <T v="tenue" style={{ color: n.c, fontWeight: '600' }}>{texto}</T>
    </View>
  );
}
export const nivelIntensidad = (n: number): Nivel => (n >= 4 ? 'critico' : n === 3 ? 'serio' : 'aviso');
export const colorIntensidad = (n: number) => NIVELES[nivelIntensidad(n)].c;

export function Origen({ origen }: { origen: string }) {
  const m: Record<string, [Nivel, string]> = {
    manual: ['info', 'Manual'],
    simulada: ['neutro', 'Simulada'],
    importada: ['bien', 'Importada'],
    automatico: ['neutro', 'Resumen automático'],
    ia: ['info', 'Resumen de IA'],
    simulado: ['neutro', 'Simulado'],
  };
  const [nivel, texto] = m[origen] ?? ['neutro', origen];
  return <Estado nivel={nivel} texto={texto} />;
}

// ---------- Medidor circular segmentado ----------

/** Anillo de segmentos que se llenan con animación. valor entre 0 y 1. */
export function Anillo({ valor, tam = 140, segmentos = 36, c, grosor = 10, children }: { valor: number; tam?: number; segmentos?: number; c?: string; grosor?: number; children?: ReactNode }) {
  const a = useAcento();
  const tono = c ?? a.base;
  const [lleno, setLleno] = useState(0);
  const objetivo = Math.round(Math.max(0, Math.min(1, valor)) * segmentos);
  useEffect(() => {
    if (lleno === objetivo) return;
    const t = setTimeout(() => setLleno((n) => n + (objetivo > n ? 1 : -1)), 18);
    return () => clearTimeout(t);
  }, [lleno, objetivo]);
  const r = tam / 2;
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: segmentos }, (_, i) => {
        const ang = (i / segmentos) * 360;
        const activo = i < lleno;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: r - 2,
              top: 0,
              width: 4,
              height: tam,
              alignItems: 'center',
              transform: [{ rotate: `${ang}deg` }],
            }}
          >
            <View style={{ width: 4, height: grosor, borderRadius: 1, backgroundColor: activo ? tono : alfa(tono, 0.14) }} />
          </View>
        );
      })}
      <View style={{ position: 'absolute', width: tam - grosor * 2 - 14, height: tam - grosor * 2 - 14, borderRadius: tam, borderWidth: 1, borderColor: alfa(tono, 0.25) }} />
      {children}
    </View>
  );
}

// ---------- Barra de energía segmentada ----------

export function Barra({ valor, segmentos = 20, c, alto = 8 }: { valor: number; segmentos?: number; c?: string; alto?: number }) {
  const a = useAcento();
  const tono = c ?? a.base;
  const lleno = Math.round(Math.max(0, Math.min(1, valor)) * segmentos);
  return (
    <View style={[est.fila, { gap: 2 }]}>
      {Array.from({ length: segmentos }, (_, i) => (
        <View key={i} style={{ flex: 1, height: alto, borderRadius: 1, backgroundColor: i < lleno ? tono : alfa(tono, 0.14) }} />
      ))}
    </View>
  );
}

// ---------- Número que cuenta ----------

export function Contador({ valor, decimales = 0, style }: { valor: number; decimales?: number; style?: StyleProp<TextStyle> }) {
  const [mostrado, setMostrado] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = anim.addListener(({ value }) => setMostrado(value));
    Animated.timing(anim, { toValue: valor, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [valor, anim]);
  return <T v="cifra" style={style}>{mostrado.toFixed(decimales)}</T>;
}

// ---------- Pulso ----------

export function Pulso({ children, activo = true, escala = 1.08, ms = 1400 }: { children: ReactNode; activo?: boolean; escala?: number; ms?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!activo) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(v, { toValue: 0, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activo, v, ms]);
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, escala] }) }], opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }}>{children}</Animated.View>;
}

/** Aparece deslizándose; útil al cambiar de pantalla. */
export function Entrada({ children, retraso = 0, style }: { children: ReactNode; retraso?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: retraso, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, retraso]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

// ---------- Campos ----------

export function Campo({ etiqueta, style, ...props }: TextInputProps & { etiqueta?: string }) {
  const a = useAcento();
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {etiqueta && <T v="etiqueta">{etiqueta.toUpperCase()}</T>}
      <TextInput
        placeholderTextColor={color.tenue}
        {...props}
        onFocus={(e) => {
          setFoco(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          props.onBlur?.(e);
        }}
        style={[est.campo, foco && { borderColor: a.base, backgroundColor: alfa(a.base, 0.06) }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

/** Grupo de opciones tipo botones de juego. */
export function Opciones<T extends string | number>({
  opciones,
  valor,
  alElegir,
  columnas,
}: {
  opciones: { v: T; t: string; sub?: string; g?: string }[];
  valor: T | null;
  alElegir: (v: T) => void;
  columnas?: number;
}) {
  const a = useAcento();
  return (
    <View style={[est.fila, { flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }]} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const sel = o.v === valor;
        return (
          <Pressable
            key={String(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: sel }}
            accessibilityLabel={o.t}
            onPress={() => alElegir(o.v)}
            style={({ hovered }: any) => [
              est.opcion,
              columnas ? { flexBasis: `${100 / columnas - 2}%`, flexGrow: 1 } : null,
              { borderColor: sel ? a.base : hovered ? alfa(a.base, 0.5) : color.linea, backgroundColor: sel ? alfa(a.base, 0.18) : hovered ? alfa(a.base, 0.06) : color.panelAlto },
            ]}
          >
            {o.g && <Icono g={o.g} tam={18} c={sel ? a.base : color.suave} style={{ marginBottom: 4 }} />}
            <T v="subtitulo" style={{ fontSize: o.sub ? 22 : 15, color: sel ? a.base : color.tinta, textAlign: 'center' }}>
              {o.t}
            </T>
            {o.sub && <T v="tenue" style={{ textAlign: 'center', color: sel ? a.base : color.suave }}>{o.sub}</T>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Separador() {
  return <View style={{ height: 1, backgroundColor: color.linea, marginVertical: 12 }} />;
}

export const est = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  panel: { backgroundColor: color.panel, borderWidth: 1, borderColor: color.linea, borderRadius: 4, padding: 18 },
  panelCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 4, borderWidth: 1 },
  botonGrande: { paddingHorizontal: 26, paddingVertical: 15 },
  estado: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 3, borderWidth: 1 },
  campo: { fontFamily: fuente.texto, fontSize: 15, color: color.tinta, backgroundColor: color.panelAlto, borderWidth: 1, borderColor: color.linea, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  opcion: { minWidth: 76, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
