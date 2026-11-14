import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { EtapaId } from '../datos/catalogos';
import { alfa } from './Acento';
import { ACENTO, color } from './tema';

// Fondo vivo: estrellas que titilan y se desplazan, el horizonte del lugar de
// la misión y una línea de barrido que recorre la pantalla.

const PLANETA: Record<EtapaId, { cuerpo: string; radio: number; bajo: number }> = {
  tierra: { cuerpo: '#0a3a46', radio: 1.6, bajo: 0.78 },
  orbita: { cuerpo: '#0d4f86', radio: 1.05, bajo: 0.72 },
  transito: { cuerpo: '#140f33', radio: 0, bajo: 0 },
  marte: { cuerpo: '#7a3a1c', radio: 1.15, bajo: 0.74 },
};

function estrellas(n: number, semilla: number) {
  let s = semilla;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => ({ x: azar(), y: azar(), r: azar() * 1.8 + 0.6, fase: azar() }));
}

function Estrella({ x, y, r, fase, ancho, alto, brillo }: { x: number; y: number; r: number; fase: number; ancho: number; alto: number; brillo: Animated.Value }) {
  const op = brillo.interpolate({ inputRange: [0, 0.5, 1], outputRange: fase > 0.5 ? [0.9, 0.25, 0.9] : [0.3, 0.95, 0.3] });
  return <Animated.View style={{ position: 'absolute', left: x * ancho, top: y * alto, width: r, height: r, borderRadius: r, backgroundColor: '#dfe9ff', opacity: op }} />;
}

export function Fondo({ etapa }: { etapa: EtapaId }) {
  const { width: ancho, height: alto } = useWindowDimensions();
  const brillo = useRef(new Animated.Value(0)).current;
  const deriva = useRef(new Animated.Value(0)).current;
  const barrido = useRef(new Animated.Value(0)).current;
  const aparicion = useRef(new Animated.Value(0)).current;
  const puntos = useMemo(() => estrellas(etapa === 'transito' ? 110 : 70, 17), [etapa]);
  const p = PLANETA[etapa];
  const acento = ACENTO[etapa].base;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(brillo, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: false }));
    const b = Animated.loop(Animated.timing(deriva, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: false }));
    const c = Animated.loop(Animated.sequence([Animated.timing(barrido, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }), Animated.delay(3000)]));
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [brillo, deriva, barrido]);

  useEffect(() => {
    aparicion.setValue(0);
    Animated.timing(aparicion, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [etapa, aparicion]);

  const radio = p.radio * ancho;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color.espacio, overflow: 'hidden' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: deriva.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }] }]}>
        {puntos.map((e, i) => (
          <Estrella key={i} {...e} ancho={ancho + 60} alto={alto} brillo={brillo} />
        ))}
      </Animated.View>

      {/* Rejilla del HUD */}
      {Array.from({ length: Math.ceil(alto / 80) }, (_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * 80, height: 1, backgroundColor: color.lineaSuave, opacity: 0.35 }} />
      ))}
      {Array.from({ length: Math.ceil(ancho / 80) }, (_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 80, width: 1, backgroundColor: color.lineaSuave, opacity: 0.35 }} />
      ))}

      {radio > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: radio * 2,
            height: radio * 2,
            left: ancho / 2 - radio,
            top: alto * p.bajo,
            opacity: aparicion,
            transform: [{ translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          }}
        >
          <View style={{ position: 'absolute', inset: -40, borderRadius: radio + 40, backgroundColor: alfa(acento, 0.06) }} />
          <View style={{ position: 'absolute', inset: -14, borderRadius: radio + 14, backgroundColor: alfa(acento, 0.1) }} />
          <View style={{ flex: 1, borderRadius: radio, backgroundColor: p.cuerpo, borderTopWidth: 2, borderColor: alfa(acento, 0.7) }} />
        </Animated.View>
      ) : (
        <View style={{ position: 'absolute', right: ancho * 0.18, top: alto * 0.22 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: alfa('#7fc8ff', 0.15), alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#7fc8ff' }} />
          </View>
        </View>
      )}

      {/* Línea de barrido */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 120,
          top: -120,
          transform: [{ translateY: barrido.interpolate({ inputRange: [0, 1], outputRange: [0, alto + 120] }) }],
        }}
      >
        <View style={{ flex: 1, backgroundColor: alfa(acento, 0.025) }} />
        <View style={{ height: 1, backgroundColor: alfa(acento, 0.35) }} />
      </Animated.View>

      {/* Velo para que el contenido se lea */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,12,0.35)' }]} />
    </View>
  );
}
