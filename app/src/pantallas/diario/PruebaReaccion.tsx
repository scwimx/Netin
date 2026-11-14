import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { alfa, useAcento } from '../../hud/Acento';
import { Barra, Boton, Icono, T, est } from '../../hud/componentes';
import { color, icono } from '../../hud/tema';

const INTENTOS = 5;
type Fase = 'lista' | 'espera' | 'estimulo' | 'anticipo' | 'resultado' | 'fin';

export interface ResultadoReaccion {
  intentos: number[];
  anticipos: number;
}

/**
 * Prueba de reacción visual: pulsa en cuanto el núcleo se encienda. Cinco
 * intentos válidos; pulsar antes cuenta como anticipo y repite el intento.
 */
export function PruebaReaccion({ alTerminar }: { alTerminar: (r: ResultadoReaccion) => void }) {
  const a = useAcento();
  const [fase, setFase] = useState<Fase>('lista');
  const [tiempos, setTiempos] = useState<number[]>([]);
  const [anticipos, setAnticipos] = useState(0);
  const inicio = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const destello = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const l = Animated.loop(Animated.timing(giro, { toValue: 1, duration: fase === 'espera' ? 1600 : 6000, easing: Easing.linear, useNativeDriver: false }));
    l.start();
    return () => l.stop();
  }, [giro, fase]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const programar = useCallback(() => {
    setFase('espera');
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      inicio.current = Date.now();
      destello.setValue(1);
      setFase('estimulo');
    }, 1200 + Math.random() * 2600);
  }, [destello]);

  const tocar = useCallback(() => {
    if (fase === 'fin') return;
    if (fase === 'lista' || fase === 'resultado' || fase === 'anticipo') return programar();
    if (fase === 'espera') {
      clearTimeout(temporizador.current);
      setAnticipos((n) => n + 1);
      setFase('anticipo');
      return;
    }
    const t = Date.now() - inicio.current;
    Animated.timing(destello, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    const nuevos = [...tiempos, t];
    setTiempos(nuevos);
    setFase(nuevos.length >= INTENTOS ? 'fin' : 'resultado');
  }, [fase, programar, tiempos, destello]);

  const textos: Record<Fase, string> = {
    lista: 'Pulsa el núcleo para empezar',
    espera: 'Espera la señal…',
    estimulo: '¡AHORA!',
    anticipo: 'Muy pronto. Pulsa para repetir el intento',
    resultado: 'Pulsa para el siguiente intento',
    fin: 'Prueba completa',
  };
  const tono = fase === 'anticipo' ? color.aviso : a.base;
  const rot = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <View style={{ width: 320 }}>
        <Barra valor={tiempos.length / INTENTOS} segmentos={INTENTOS} alto={8} />
        <T v="tenue" style={{ textAlign: 'center', marginTop: 6 }}>Intento {Math.min(tiempos.length + 1, INTENTOS)} de {INTENTOS}</T>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Núcleo de reacción" onPressIn={tocar} disabled={fase === 'fin'}>
        <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 280, height: 280, transform: [{ rotate: rot }] }}>
            {Array.from({ length: 12 }, (_, i) => (
              <View key={i} style={{ position: 'absolute', left: 138, top: 0, width: 4, height: 280, alignItems: 'center', transform: [{ rotate: `${i * 30}deg` }] }}>
                <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: alfa(tono, i % 3 === 0 ? 0.9 : 0.3) }} />
              </View>
            ))}
          </Animated.View>
          <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: alfa(tono, 0.5) }} />
          <Animated.View
            style={{
              width: 180,
              height: 180,
              borderRadius: 90,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fase === 'estimulo' ? a.base : alfa(tono, 0.1),
              borderWidth: 2,
              borderColor: tono,
              shadowColor: a.base,
              shadowOpacity: fase === 'estimulo' ? 1 : 0.3,
              shadowRadius: fase === 'estimulo' ? 50 : 12,
              transform: [{ scale: destello.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
            }}
          >
            {fase === 'estimulo' ? (
              <Icono g={icono.rayo} tam={64} c={a.oscuro} />
            ) : fase === 'resultado' || fase === 'fin' ? (
              <View style={{ alignItems: 'center' }}>
                <T v="cifraGrande" style={{ color: a.base }}>{tiempos.at(-1)}</T>
                <T v="etiqueta">MILISEGUNDOS</T>
              </View>
            ) : (
              <Icono g={fase === 'anticipo' ? icono.alerta : icono.jugar} tam={44} c={tono} />
            )}
          </Animated.View>
        </View>
      </Pressable>

      <T v="subtitulo" style={{ color: fase === 'estimulo' ? a.base : color.suave, letterSpacing: fase === 'estimulo' ? 4 : 0.4 }}>{textos[fase]}</T>
      {fase !== 'fin' && <T v="tenue">También puedes pulsar con el ratón en cualquier parte del núcleo.</T>}

      {fase === 'fin' && (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={[est.fila, { gap: 8 }]}>
            {tiempos.map((t, i) => (
              <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: color.linea, borderRadius: 3, backgroundColor: color.panelAlto }}>
                <T v="cifra" style={{ fontSize: 16 }}>{t} ms</T>
              </View>
            ))}
          </View>
          {anticipos > 0 && <T v="tenue">Anticipos: {anticipos}</T>}
          <View style={[est.fila, { gap: 10 }]}>
            <Boton
              texto="Repetir prueba"
              icono={icono.actualizar}
              tipo="secundario"
              alPulsar={() => {
                setTiempos([]);
                setAnticipos(0);
                setFase('lista');
              }}
            />
            <Boton texto="Guardar resultado" icono={icono.ok} alPulsar={() => alTerminar({ intentos: tiempos, anticipos })} />
          </View>
        </View>
      )}
    </View>
  );
}
