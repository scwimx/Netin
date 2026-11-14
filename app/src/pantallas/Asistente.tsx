import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorNetin } from '../datos/boveda';
import { agregarMensaje, estadoCola } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa, useAcento } from '../hud/Acento';
import { Boton, Campo, Entrada, Estado, Icono, Panel, Pulso, T, est } from '../hud/componentes';
import { ACENTO, color, icono } from '../hud/tema';

const SUGERENCIAS = ['Hoy me siento más cansado que ayer', 'Me duele la espalda al despertar', 'Me cuesta dormir con el ruido de la nave', '¿Qué debo medir hoy?'];

/**
 * La IA todavía no está conectada. La conversación se guarda cifrada en el
 * perfil y queda en la cola de datos para el asistente futuro. No se generan
 * respuestas simuladas.
 */
export function Asistente() {
  const s = useSesion();
  const { refrescar, version } = useApp();
  const a = useAcento();
  void version;
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const mensajes = s.contenido.mensajes;
  const cola = estadoCola(s);

  const enviar = async (t = texto) => {
    if (!t.trim()) return;
    try {
      await agregarMensaje(s, t);
      setTexto('');
      refrescar();
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setError(e instanceof ErrorNetin ? e.message : 'No se pudo guardar el mensaje.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 14 }}>
      <View style={[est.fila, { justifyContent: 'space-between' }]}>
        <T v="titulo">Asistente</T>
        <Estado nivel="neutro" texto="IA sin conectar" g={icono.asistente} />
      </View>
      <Panel resaltado>
        <View style={[est.fila, { gap: 14 }]}>
          <Pulso>
            <View style={{ width: 46, height: 46, borderRadius: 4, borderWidth: 2, borderColor: a.base, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
              <Icono g={icono.asistente} tam={20} c={a.base} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </Pulso>
          <View style={{ flex: 1 }}>
            <T v="cuerpo">Escribe lo que sientes. Tus mensajes se guardan cifrados en tu perfil y quedan listos para el asistente cuando se integre.</T>
            <T v="tenue">Por ahora no hay respuestas automáticas. Si algo te preocupa, avisa a la tripulación o al responsable médico de la misión. · {cola.pendientes} datos esperando a la IA.</T>
          </View>
        </View>
      </Panel>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 6, flexGrow: 1 }}>
        {!mensajes.length && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <T v="suave">Empieza contando cómo te sientes, un síntoma o una medición.</T>
            <View style={[est.fila, { flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 700 }]}>
              {SUGERENCIAS.map((x) => (
                <Boton key={x} texto={x} tipo="secundario" alPulsar={() => void enviar(x)} />
              ))}
            </View>
          </View>
        )}
        {mensajes.map((m, i) => (
          <Entrada key={m.id} retraso={i === mensajes.length - 1 ? 0 : 0} style={{ alignSelf: m.autor === 'usuario' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: a.base, backgroundColor: alfa(a.base, 0.18) }}>
              <T v="cuerpo">{m.texto}</T>
            </View>
            <T v="tenue" style={{ textAlign: 'right', marginTop: 3 }}>{new Date(m.creado).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {ACENTO[m.etapa].nombre} · guardado</T>
          </Entrada>
        ))}
      </ScrollView>

      <View style={[est.fila, { gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <Campo value={texto} onChangeText={setTexto} placeholder="Escribe un mensaje" maxLength={4000} onSubmitEditing={() => void enviar()} accessibilityLabel="Mensaje" />
        </View>
        <Boton texto="Guardar" icono={icono.enviar} desactivado={!texto.trim()} alPulsar={() => void enviar()} />
      </View>
      {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
    </View>
  );
}
