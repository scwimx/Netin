import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ETAPAS, type EtapaId } from '../datos/catalogos';
import { estadoDia } from '../datos/registros';
import { useApp, useSesion, type Pantalla } from '../estado/App';
import { alfa, useAcento } from './Acento';
import { Barra, Boton, Icono, Panel, T, est } from './componentes';
import { DialogoAviso } from './DialogoAviso';
import { ACENTO, color, icono } from './tema';

const PRINCIPALES: { p: Pantalla; t: string; g: string }[] = [
  { p: 'inicio', t: 'Inicio', g: icono.inicio },
  { p: 'asistente', t: 'Asistente', g: icono.asistente },
  { p: 'salud', t: 'Salud', g: icono.salud },
  { p: 'registros', t: 'Registros', g: icono.registros },
];
const SECUNDARIOS: { p: Pantalla; t: string; g: string }[] = [
  { p: 'documentos', t: 'Documentos', g: icono.documentos },
  { p: 'ajustes', t: 'Ajustes', g: icono.ajustes },
];
export const ICONO_ETAPA: Record<EtapaId, string> = { tierra: icono.tierra, orbita: icono.orbita, transito: icono.transito, marte: icono.marte };

function BotonRiel({ p, t, g }: { p: Pantalla; t: string; g: string }) {
  const { pantalla, ir } = useApp();
  const a = useAcento();
  const activo = pantalla === p;
  const brillo = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(brillo, { toValue: activo ? 1 : 0, duration: 260, useNativeDriver: false }).start();
  }, [activo, brillo]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t} accessibilityState={{ selected: activo }} onPress={() => ir(p)}>
      {({ hovered }: any) => (
        <View style={est2.riel}>
          <Animated.View style={[est2.rielMarca, { backgroundColor: a.base, opacity: brillo, transform: [{ scaleY: brillo }] }]} />
          <Animated.View
            style={[
              est2.rielIcono,
              {
                backgroundColor: brillo.interpolate({ inputRange: [0, 1], outputRange: [hovered ? alfa(a.base, 0.08) : 'rgba(0,0,0,0)', alfa(a.base, 0.18)] }),
                borderColor: brillo.interpolate({ inputRange: [0, 1], outputRange: [hovered ? alfa(a.base, 0.4) : 'rgba(0,0,0,0)', a.base] }),
              },
            ]}
          >
            <Icono g={g} tam={22} c={activo ? a.base : hovered ? color.tinta : color.suave} />
          </Animated.View>
          <T v="tenue" style={{ color: activo ? a.base : color.suave, fontWeight: activo ? '700' : '400', marginTop: 4 }}>
            {t}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Avatar con anillos orbitales que giran. */
export function Avatar({ nombre, tam = 52 }: { nombre: string; tam?: number }) {
  const a = useAcento();
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false }));
    l.start();
    return () => l.stop();
  }, [giro]);
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  const rot = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotInv = giro.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  return (
    <View style={{ width: tam + 16, height: tam + 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: tam + 16, height: tam + 16, transform: [{ rotate: rot }] }}>
        <View style={{ position: 'absolute', top: 0, left: (tam + 16) / 2 - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: a.base }} />
        <View style={{ flex: 1, borderRadius: tam, borderWidth: 1, borderColor: alfa(a.base, 0.35) }} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: tam + 6, height: tam + 6, transform: [{ rotate: rotInv }] }}>
        <View style={{ position: 'absolute', bottom: 0, left: (tam + 6) / 2 - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: color.aviso }} />
      </Animated.View>
      <View style={{ width: tam, height: tam, borderRadius: tam, backgroundColor: alfa(a.base, 0.16), borderWidth: 2, borderColor: a.base, alignItems: 'center', justifyContent: 'center' }}>
        <T v="subtitulo" style={{ color: a.base, fontSize: tam * 0.36 }}>{iniciales}</T>
      </View>
    </View>
  );
}

function FichaTripulante() {
  const s = useSesion();
  const { version, ir } = useApp();
  const a = useAcento();
  void version;
  const dia = estadoDia(s);
  const hechos = [dia.foto !== 'pendiente', dia.chequeo, dia.motora, dia.bitacora].filter(Boolean).length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Registro de hoy: ${hechos} de 4 pasos`} onPress={() => ir(hechos < 4 ? 'diario' : 'inicio')}>
      <View style={[est.fila, { gap: 10 }]}>
        <Avatar nombre={s.perfil.nombre} tam={40} />
        <View style={{ width: 220, gap: 4 }}>
          <View style={[est.fila, { justifyContent: 'space-between' }]}>
            <T v="subtitulo" style={{ fontSize: 15 }} numberOfLines={1}>
              {s.contenido.ajustes.comoLlamarte || s.perfil.nombre.split(' ')[0]}
            </T>
            <T v="tenue">{s.perfil.rol || 'Tripulación'}</T>
          </View>
          <Barra valor={hechos / 4} segmentos={4} alto={6} />
          <T v="tenue" style={{ color: hechos === 4 ? a.base : color.suave }}>{hechos === 4 ? 'Registro de hoy completo' : `Registro de hoy: ${hechos} de 4 pasos`}</T>
        </View>
      </View>
    </Pressable>
  );
}

function SelectorEtapaModal({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const s = useSesion();
  const { refrescar } = useApp();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={alCerrar}>
      <Pressable style={est2.velo} onPress={alCerrar}>
        <Pressable onPress={() => {}} style={{ width: 560 }}>
          <Panel titulo="¿Dónde está la misión?" icono={icono.satelite}>
            <T v="suave" style={{ marginBottom: 14 }}>Cada registro nuevo guarda la etapa en la que ocurrió.</T>
            <View style={[est.fila, { gap: 10 }]}>
              {ETAPAS.map((e) => {
                const sel = e.id === s.perfil.etapa;
                const c = ACENTO[e.id].base;
                return (
                  <Pressable
                    key={e.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    accessibilityLabel={e.nombre}
                    onPress={async () => {
                      await s.cambiarEtapa(e.id);
                      refrescar();
                      alCerrar();
                    }}
                    style={({ hovered }: any) => [est2.etapa, { borderColor: sel || hovered ? c : color.linea, backgroundColor: sel ? alfa(c, 0.18) : color.panelAlto }]}
                  >
                    <Icono g={ICONO_ETAPA[e.id]} tam={28} c={c} />
                    <T v="subtitulo" style={{ color: sel ? c : color.tinta, marginTop: 8, fontSize: 15, textAlign: 'center' }}>
                      {e.nombre}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Marco({ children }: { children: ReactNode }) {
  const s = useSesion();
  const a = useAcento();
  const [etapa, setEtapa] = useState(false);
  const [aviso, setAviso] = useState(false);
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={est2.lateral}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={[est2.logo, { borderColor: a.base }]}>
            <Icono g={icono.salud} tam={20} c={a.base} />
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {PRINCIPALES.map((b) => (
            <BotonRiel key={b.p} {...b} />
          ))}
        </View>
        <View style={{ marginTop: 'auto', gap: 6 }}>
          {SECUNDARIOS.map((b) => (
            <BotonRiel key={b.p} {...b} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={est2.barra}>
          <FichaTripulante />
          <View style={[est.fila, { gap: 10 }]}>
            <Boton texto="Aviso" icono={icono.sirena} tipo="peligro" alPulsar={() => setAviso(true)} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Netin, etapa ${ACENTO[s.perfil.etapa].nombre}. Cambiar etapa`} onPress={() => setEtapa(true)}>
              {({ hovered }: any) => (
                <View style={[est2.etapaChip, { borderColor: hovered ? a.base : alfa(a.base, 0.45) }]}>
                  <T v="subtitulo" style={{ letterSpacing: 3, fontSize: 16 }}>NETIN</T>
                  <View style={{ width: 1, height: 18, backgroundColor: color.linea, marginHorizontal: 12 }} />
                  <Icono g={ICONO_ETAPA[s.perfil.etapa]} tam={16} c={a.base} style={{ marginRight: 8 }} />
                  <T v="subtitulo" style={{ color: a.base, fontSize: 15 }}>{ACENTO[s.perfil.etapa].nombre}</T>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>

      <SelectorEtapaModal visible={etapa} alCerrar={() => setEtapa(false)} />
      <DialogoAviso visible={aviso} alCerrar={() => setAviso(false)} />
    </View>
  );
}

const est2 = StyleSheet.create({
  lateral: { width: 96, paddingVertical: 18, borderRightWidth: 1, borderColor: color.linea, backgroundColor: 'rgba(5,10,22,0.85)' },
  logo: { width: 44, height: 44, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  riel: { alignItems: 'center', paddingVertical: 6 },
  rielMarca: { position: 'absolute', left: 0, top: 10, width: 3, height: 40, borderRadius: 2 },
  rielIcono: { width: 48, height: 48, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.linea, backgroundColor: 'rgba(5,10,22,0.7)' },
  etapaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 4, borderWidth: 1, backgroundColor: color.panel },
  velo: { flex: 1, backgroundColor: 'rgba(2,4,10,0.75)', alignItems: 'center', justifyContent: 'center' },
  etapa: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 4, borderWidth: 1 },
});
