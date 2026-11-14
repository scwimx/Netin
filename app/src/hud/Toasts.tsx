import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useApp } from '../estado/App';
import { alfa, useAcento } from './Acento';
import { Icono, T } from './componentes';
import { icono } from './tema';

function Toast({ texto }: { texto: string }) {
  const a = useAcento();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(v, { toValue: 1, useNativeDriver: false, bounciness: 14, speed: 14 }),
      Animated.delay(1700),
      Animated.timing(v, { toValue: 2, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1, 2], outputRange: [30, 0, -24] }) }, { scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.8, 1, 1] }) }],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: a.base,
        backgroundColor: alfa(a.base, 0.16),
        shadowColor: a.base,
        shadowOpacity: 0.7,
        shadowRadius: 18,
      }}
    >
      <Icono g={icono.ok} tam={20} c={a.base} />
      <T v="subtitulo" style={{ fontSize: 16 }}>{texto}</T>
    </Animated.View>
  );
}

/** Confirmaciones breves al guardar un paso del día. */
export function Toasts() {
  const { toasts } = useApp();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
      {toasts.map((t) => (
        <Toast key={t.id} texto={t.texto} />
      ))}
    </View>
  );
}
