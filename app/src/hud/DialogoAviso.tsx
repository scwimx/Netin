import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ErrorNetin } from '../datos/boveda';
import { crear } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa } from './Acento';
import { Boton, Campo, Estado, Icono, Panel, T, est } from './componentes';
import { color, icono } from './tema';

/**
 * Registra un aviso local o un simulacro. Netin no está conectada con la
 * tripulación ni con Tierra: «Compartido» se muestra como no disponible para
 * que nadie crea que el aviso salió del equipo.
 */
export function DialogoAviso({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const s = useSesion();
  const { refrescar } = useApp();
  const [alcance, setAlcance] = useState<'local' | 'simulacro'>('local');
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    alCerrar();
    setTitulo('');
    setDetalle('');
    setHecho(false);
    setError(null);
    setAlcance('local');
  };
  const guardar = async () => {
    try {
      await crear(s, 'aviso', { titulo, detalle, alcance });
      refrescar();
      setHecho(true);
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar el aviso.');
    }
  };

  const opciones = [
    { id: 'local' as const, g: icono.sirena, t: 'Local', d: 'Queda registrado en este equipo.' },
    { id: 'simulacro' as const, g: icono.jugar, t: 'Simulacro', d: 'Práctica. Se marca como simulacro.' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={cerrar}>
      <View style={estA.velo}>
        <View style={{ width: 620 }}>
          <Panel titulo="Registrar un aviso" icono={icono.sirena} c={color.critico} resaltado>
            <T v="suave" style={{ marginBottom: 16 }}>
              Si es una emergencia real, avisa a la tripulación en voz alta y sigue el procedimiento de la misión. Netin no envía avisos.
            </T>
            {hecho ? (
              <View style={{ gap: 14 }}>
                <Estado nivel={alcance === 'simulacro' ? 'neutro' : 'critico'} texto={alcance === 'simulacro' ? 'Simulacro registrado' : 'Aviso local registrado'} />
                <T v="suave">Lo encontrarás en Registros. No se envió a nadie.</T>
                <Boton texto="Listo" alPulsar={cerrar} style={{ alignSelf: 'flex-end' }} />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={[est.fila, { gap: 10 }]}>
                  {opciones.map((o) => {
                    const sel = alcance === o.id;
                    return (
                      <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={o.t} onPress={() => setAlcance(o.id)} style={[estA.opcion, { borderColor: sel ? color.critico : color.linea, backgroundColor: sel ? alfa(color.critico, 0.14) : color.panelAlto }]}>
                        <Icono g={o.g} tam={18} c={sel ? color.critico : color.suave} />
                        <T v="subtitulo" style={{ marginTop: 6, fontSize: 15 }}>{o.t}</T>
                        <T v="tenue">{o.d}</T>
                      </Pressable>
                    );
                  })}
                  <View style={[estA.opcion, { borderColor: color.linea, opacity: 0.5 }]} accessibilityState={{ disabled: true }}>
                    <Icono g={icono.personas} tam={18} c={color.tenue} />
                    <T v="subtitulo" style={{ marginTop: 6, fontSize: 15 }}>Compartido</T>
                    <T v="tenue">No disponible: falta la conexión con la tripulación.</T>
                  </View>
                </View>
                <Campo etiqueta="¿Qué pasa?" value={titulo} onChangeText={setTitulo} maxLength={100} placeholder="Ej.: mareo fuerte al despertar" />
                <Campo etiqueta="Detalles (opcional)" value={detalle} onChangeText={setDetalle} maxLength={1000} multiline />
                {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
                <View style={[est.fila, { justifyContent: 'flex-end', gap: 10 }]}>
                  <Boton texto="Cancelar" tipo="fantasma" alPulsar={cerrar} />
                  <Boton texto={alcance === 'simulacro' ? 'Registrar simulacro' : 'Registrar aviso'} tipo="peligro" icono={icono.sirena} desactivado={!titulo.trim()} alPulsar={guardar} />
                </View>
              </View>
            )}
          </Panel>
        </View>
      </View>
    </Modal>
  );
}

const estA = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(2,4,10,0.78)', alignItems: 'center', justifyContent: 'center' },
  opcion: { flex: 1, padding: 12, borderRadius: 4, borderWidth: 1, minHeight: 104 },
});
