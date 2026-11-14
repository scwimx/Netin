import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CLAVE_MINIMA, ErrorNetin, gestionarPerfil } from '../datos/boveda';
import { ETAPAS } from '../datos/catalogos';
import { estadoCola } from '../datos/registros';
import { useApp, useSesion } from '../estado/App';
import { alfa, useAcento } from '../hud/Acento';
import { Boton, Campo, Entrada, Estado, Opciones, Panel, T, est } from '../hud/componentes';
import { ICONO_ETAPA } from '../hud/Marco';
import { color, icono } from '../hud/tema';
import { plataforma } from '../plataforma';

const msj = (e: unknown) => (e instanceof ErrorNetin ? e.message : 'Algo falló.');

function Interruptor({ valor, alCambiar, etiqueta }: { valor: boolean; alCambiar: (v: boolean) => void; etiqueta: string }) {
  const a = useAcento();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: valor }} accessibilityLabel={etiqueta} onPress={() => alCambiar(!valor)} style={[est.fila, { justifyContent: 'space-between', paddingVertical: 8 }]}>
      <T v="cuerpo">{etiqueta}</T>
      <View style={{ width: 48, height: 26, borderRadius: 13, borderWidth: 1, borderColor: valor ? a.base : color.linea, backgroundColor: valor ? alfa(a.base, 0.3) : color.panelAlto, padding: 3, alignItems: valor ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: valor ? a.base : color.tenue }} />
      </View>
    </Pressable>
  );
}

export function Ajustes() {
  const s = useSesion();
  const { refrescar, salir, version } = useApp();
  void version;
  const [nombre, setNombre] = useState(s.perfil.nombre);
  const [rol, setRol] = useState(s.perfil.rol);
  const [nac, setNac] = useState(s.contenido.nacimiento ?? '');
  const [corto, setCorto] = useState(s.contenido.ajustes.comoLlamarte);
  const [msjPerfil, setMsjPerfil] = useState<{ ok: boolean; t: string } | null>(null);
  const [carpeta, setCarpeta] = useState('');
  useEffect(() => {
    void plataforma.carpetaDatos().then(setCarpeta).catch(() => {});
  }, []);

  const guardarPerfil = async () => {
    try {
      if (nac && !/^\d{4}-\d{2}-\d{2}$/.test(nac)) throw new ErrorNetin('Escribe la fecha como AAAA-MM-DD.');
      await s.cambiarDatos({ nombre, rol });
      s.contenido.nacimiento = nac || null;
      s.contenido.ajustes.comoLlamarte = corto.trim().slice(0, 30);
      await s.guardar();
      refrescar();
      setMsjPerfil({ ok: true, t: 'Perfil guardado.' });
    } catch (e) {
      setMsjPerfil({ ok: false, t: msj(e) });
    }
  };
  const ajuste = async (c: Partial<typeof s.contenido.ajustes>) => {
    Object.assign(s.contenido.ajustes, c);
    await s.guardar();
    refrescar();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
      <T v="titulo">Ajustes</T>
      <View style={[est.fila, { gap: 18, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 18 }}>
          <Entrada>
            <Panel titulo="Perfil" icono={icono.persona}>
              <View style={{ gap: 12 }}>
                <View style={[est.fila, { gap: 12 }]}>
                  <View style={{ flex: 1 }}><Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} maxLength={60} /></View>
                  <View style={{ flex: 1 }}><Campo etiqueta="¿Cómo te llamamos?" value={corto} onChangeText={setCorto} maxLength={30} placeholder={s.perfil.nombre.split(' ')[0]} /></View>
                </View>
                <View style={[est.fila, { gap: 12 }]}>
                  <View style={{ flex: 1 }}><Campo etiqueta="Rol" value={rol} onChangeText={setRol} maxLength={60} /></View>
                  <View style={{ flex: 1 }}><Campo etiqueta="Nacimiento (AAAA-MM-DD)" value={nac} onChangeText={setNac} maxLength={10} placeholder="1990-04-12" /></View>
                </View>
                {msjPerfil && <T v="suave" style={{ color: msjPerfil.ok ? color.bien : color.critico }}>{msjPerfil.t}</T>}
                <Boton texto="Guardar perfil" icono={icono.ok} alPulsar={guardarPerfil} style={{ alignSelf: 'flex-start' }} />
              </View>
            </Panel>
          </Entrada>
          <Entrada retraso={60}>
            <Panel titulo="Etapa de la misión" icono={icono.satelite}>
              <T v="suave" style={{ marginBottom: 12 }}>Cada registro nuevo guarda la etapa en la que ocurrió. Los anteriores no cambian.</T>
              <Opciones
                columnas={4}
                valor={s.perfil.etapa}
                alElegir={async (e) => {
                  await s.cambiarEtapa(e);
                  refrescar();
                }}
                opciones={ETAPAS.map((e) => ({ v: e.id, t: e.nombre, g: ICONO_ETAPA[e.id] }))}
              />
            </Panel>
          </Entrada>
          <Entrada retraso={120}>
            <CambiarClave />
          </Entrada>
        </View>
        <View style={{ flex: 1, gap: 18 }}>
          <Entrada retraso={40}>
            <Panel titulo="Cámara" icono={icono.camara}>
              <Interruptor etiqueta="Pedir la foto diaria con la cámara" valor={s.contenido.ajustes.camaraActiva} alCambiar={(v) => void ajuste({ camaraActiva: v })} />
              <T v="tenue">La foto se toma con la cámara predeterminada de Windows tras una cuenta regresiva. Puedes repetirla antes de guardar.</T>
            </Panel>
          </Entrada>
          <Entrada retraso={100}>
            <Panel titulo="Asistente" icono={icono.asistente}>
              <Estado nivel="neutro" texto="IA pendiente de integración" />
              <Interruptor etiqueta="Respuestas cortas" valor={s.contenido.ajustes.respuestasBreves} alCambiar={(v) => void ajuste({ respuestasBreves: v })} />
              <T v="tenue">La preferencia se guarda y la usará el asistente cuando esté conectado.</T>
              <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: color.linea, borderRadius: 4, backgroundColor: color.panelAlto }}>
                <T v="subtitulo" style={{ fontSize: 15 }}>Datos para la IA</T>
                <T v="suave">Cada reporte que guardas, corriges o eliminas queda en una cola cifrada para el asistente. Pendientes: {estadoCola(s).pendientes}.</T>
              </View>
            </Panel>
          </Entrada>
          <Entrada retraso={160}>
            <Panel titulo="Sesión y perfiles" icono={icono.personas}>
              <View style={[est.fila, { gap: 10 }]}>
                <Boton texto="Cambiar de tripulante" icono={icono.personas} tipo="secundario" alPulsar={salir} />
                <Boton texto="Cerrar sesión" icono={icono.salir} tipo="fantasma" alPulsar={salir} />
              </View>
              <T v="tenue" style={{ marginTop: 12 }}>Datos guardados en: {carpeta}</T>
              <Peligro />
            </Panel>
          </Entrada>
        </View>
      </View>
    </ScrollView>
  );
}

function CambiarClave() {
  const s = useSesion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const enviar = async () => {
    if (nueva !== repetir) return setM({ ok: false, t: 'Las contraseñas nuevas no coinciden.' });
    setOcupado(true);
    try {
      await s.cambiarClave(actual, nueva);
      setActual('');
      setNueva('');
      setRepetir('');
      setM({ ok: true, t: 'Contraseña cambiada. Tus datos se volvieron a cifrar.' });
    } catch (e) {
      setM({ ok: false, t: msj(e) });
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Panel titulo="Contraseña" icono={icono.llave}>
      <View style={{ gap: 10 }}>
        <Campo etiqueta="Actual" secureTextEntry value={actual} onChangeText={setActual} />
        <View style={[est.fila, { gap: 12 }]}>
          <View style={{ flex: 1 }}><Campo etiqueta={`Nueva (${CLAVE_MINIMA} o más)`} secureTextEntry value={nueva} onChangeText={setNueva} /></View>
          <View style={{ flex: 1 }}><Campo etiqueta="Repite la nueva" secureTextEntry value={repetir} onChangeText={setRepetir} /></View>
        </View>
        {m && <T v="suave" style={{ color: m.ok ? color.bien : color.critico }}>{m.t}</T>}
        <Boton texto={ocupado ? 'Cifrando…' : 'Cambiar contraseña'} tipo="secundario" icono={icono.llave} desactivado={!actual || nueva.length < CLAVE_MINIMA || ocupado} alPulsar={enviar} style={{ alignSelf: 'flex-start' }} />
      </View>
    </Panel>
  );
}

function Peligro() {
  const s = useSesion();
  const { salir } = useApp();
  const [accion, setAccion] = useState<'archivar' | 'eliminar' | null>(null);
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: color.linea, gap: 10 }}>
      <T v="suave">Archivar oculta el perfil y conserva sus datos. Eliminar lo borra todo y no se puede deshacer.</T>
      {accion ? (
        <View style={{ gap: 10 }}>
          <Campo etiqueta="Confirma con tu contraseña" secureTextEntry autoFocus value={clave} onChangeText={setClave} />
          {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
          <View style={[est.fila, { gap: 10 }]}>
            <Boton texto="Cancelar" tipo="fantasma" alPulsar={() => (setAccion(null), setClave(''))} />
            <Boton
              texto={accion === 'archivar' ? 'Archivar' : 'Eliminar para siempre'}
              tipo={accion === 'eliminar' ? 'peligro' : 'primario'}
              desactivado={!clave}
              alPulsar={async () => {
                try {
                  await gestionarPerfil(s.perfil.id, clave, accion);
                  salir();
                } catch (e) {
                  setError(msj(e));
                }
              }}
            />
          </View>
        </View>
      ) : (
        <View style={[est.fila, { gap: 10 }]}>
          <Boton texto="Archivar perfil" icono={icono.archivar} tipo="secundario" alPulsar={() => setAccion('archivar')} />
          <Boton texto="Eliminar perfil" icono={icono.borrar} tipo="peligro" alPulsar={() => setAccion('eliminar')} />
        </View>
      )}
    </View>
  );
}
