import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { abrirSesion, CLAVE_MINIMA, crearPerfil, ErrorNetin, gestionarPerfil, listarPerfiles, type PerfilPublico } from '../datos/boveda';
import { ETAPAS, type EtapaId } from '../datos/catalogos';
import { crearDemo, DEMO, existeDemo } from '../datos/demo';
import { useApp } from '../estado/App';
import { alfa, ProveedorAcento, useAcento } from '../hud/Acento';
import { Boton, Campo, Entrada, Estado, Icono, Opciones, Panel, Pulso, T, est } from '../hud/componentes';
import { Avatar, ICONO_ETAPA } from '../hud/Marco';
import { ACENTO, color, icono } from '../hud/tema';

type Vista = { tipo: 'lista' } | { tipo: 'entrar'; p: PerfilPublico } | { tipo: 'crear' } | { tipo: 'gestionar'; p: PerfilPublico; accion: 'archivar' | 'restaurar' | 'eliminar' };
const msj = (e: unknown) => (e instanceof ErrorNetin ? e.message : 'Algo falló. Intenta de nuevo.');

export function Acceso() {
  const { entrar } = useApp();
  const [perfiles, setPerfiles] = useState<PerfilPublico[] | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [hayDemo, setHayDemo] = useState(true);
  const [creandoDemo, setCreandoDemo] = useState(false);

  const cargar = async () => {
    const l = await listarPerfiles();
    setPerfiles(l);
    setHayDemo(await existeDemo());
  };
  useEffect(() => {
    void cargar();
  }, []);

  const etapa: EtapaId = vista.tipo === 'entrar' || vista.tipo === 'gestionar' ? vista.p.etapa : 'orbita';
  const activos = perfiles?.filter((p) => !p.archivado) ?? [];
  const archivados = perfiles?.filter((p) => p.archivado) ?? [];

  return (
    <ProveedorAcento etapa={etapa}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: '100%', maxWidth: 960 }}>
          <Entrada>
            <View style={[est.fila, { gap: 16, marginBottom: 34 }]}>
              <Pulso escala={1.06} ms={2400}>
                <View style={[estA.logo, { borderColor: ACENTO[etapa].base }]}>
                  <Icono g={icono.salud} tam={26} c={ACENTO[etapa].base} />
                </View>
              </Pulso>
              <View>
                <T v="titulo" style={{ fontSize: 44, letterSpacing: 8 }}>NETIN</T>
                <T v="suave">Monitoreo de salud de la tripulación · Tierra, órbita, tránsito y Marte</T>
              </View>
            </View>
          </Entrada>

          {vista.tipo === 'lista' && perfiles && (
            <View>
              <T v="etiqueta" style={{ marginBottom: 14 }}>ELIGE TRIPULANTE</T>
              <View style={[est.fila, { flexWrap: 'wrap', gap: 16 }]}>
                {activos.map((p, i) => (
                  <Entrada key={p.id} retraso={i * 70}>
                    <TarjetaTripulante p={p} alElegir={() => setVista({ tipo: 'entrar', p })} alGestionar={(accion) => setVista({ tipo: 'gestionar', p, accion })} />
                  </Entrada>
                ))}
                <Entrada retraso={activos.length * 70}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Crear perfil" onPress={() => setVista({ tipo: 'crear' })}>
                    {({ hovered }: any) => (
                      <View style={[estA.tarjeta, estA.nueva, hovered && { borderColor: ACENTO.orbita.base }]}>
                        <Icono g={icono.agregar} tam={34} c={hovered ? ACENTO.orbita.base : color.suave} />
                        <T v="subtitulo" style={{ marginTop: 12, color: hovered ? ACENTO.orbita.base : color.suave }}>Nuevo tripulante</T>
                      </View>
                    )}
                  </Pressable>
                </Entrada>
              </View>
              {!hayDemo && (
                <View style={[est.fila, { gap: 12, marginTop: 22 }]}>
                  <Boton
                    texto={creandoDemo ? 'Generando datos ficticios…' : 'Cargar tripulante de demostración'}
                    icono={icono.jugar}
                    tipo="secundario"
                    desactivado={creandoDemo}
                    alPulsar={async () => {
                      setCreandoDemo(true);
                      entrar(await crearDemo());
                    }}
                  />
                  <T v="tenue">«{DEMO.nombre}», contraseña «{DEMO.clave}». 14 días de datos ficticios, marcados como demo.</T>
                </View>
              )}
              {archivados.length > 0 && (
                <View style={{ marginTop: 30, gap: 8 }}>
                  <T v="etiqueta">ARCHIVADOS</T>
                  {archivados.map((p) => (
                    <View key={p.id} style={[est.fila, estA.archivado]}>
                      <T v="cuerpo" style={{ flex: 1 }}>{p.nombre}</T>
                      <Boton texto="Restaurar" icono={icono.archivar} tipo="secundario" alPulsar={() => setVista({ tipo: 'gestionar', p, accion: 'restaurar' })} />
                      <Boton texto="Eliminar" icono={icono.borrar} tipo="peligro" alPulsar={() => setVista({ tipo: 'gestionar', p, accion: 'eliminar' })} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {vista.tipo === 'entrar' && <FormEntrar p={vista.p} alVolver={() => setVista({ tipo: 'lista' })} alEntrar={entrar} />}
          {vista.tipo === 'crear' && <FormCrear puedeVolver={!!perfiles?.length} alVolver={() => setVista({ tipo: 'lista' })} alCrear={entrar} />}
          {vista.tipo === 'gestionar' && (
            <FormGestion
              p={vista.p}
              accion={vista.accion}
              alVolver={() => setVista({ tipo: 'lista' })}
              alTerminar={async () => {
                setVista({ tipo: 'lista' });
                await cargar();
              }}
            />
          )}
        </View>
      </ScrollView>
    </ProveedorAcento>
  );
}

function TarjetaTripulante({ p, alElegir, alGestionar }: { p: PerfilPublico; alElegir: () => void; alGestionar: (a: 'archivar' | 'eliminar') => void }) {
  const c = ACENTO[p.etapa].base;
  const [encima, setEncima] = useState(false);
  return (
    <ProveedorAcento etapa={p.etapa}>
      <View
        // @ts-expect-error onMouseEnter/onMouseLeave existen en Windows y web
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
        style={[estA.tarjeta, { borderColor: encima ? c : color.linea, backgroundColor: encima ? alfa(c, 0.08) : color.panel, transform: [{ translateY: encima ? -4 : 0 }] }]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={`Entrar como ${p.nombre}`} onPress={alElegir} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
          <Avatar nombre={p.nombre} tam={64} />
          <T v="subtitulo" style={{ marginTop: 12 }} numberOfLines={1}>{p.nombre}</T>
          <T v="tenue" numberOfLines={1}>{p.rol || 'Tripulación'}</T>
          <View style={[est.fila, { gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }]}>
            <Estado nivel="info" texto={ACENTO[p.etapa].nombre} g={ICONO_ETAPA[p.etapa]} />
            {p.demo && <Estado nivel="neutro" texto="Datos ficticios" />}
          </View>
        </Pressable>
        {/* Fuera del botón de la tarjeta: no se anidan botones */}
        <View style={[est.fila, { gap: 4, marginTop: 'auto', paddingTop: 10, opacity: encima ? 1 : 0.5 }]}>
          <Boton texto="" etiqueta={`Archivar ${p.nombre}`} icono={icono.archivar} tipo="fantasma" alPulsar={() => alGestionar('archivar')} />
          <Boton texto="" etiqueta={`Eliminar ${p.nombre}`} icono={icono.borrar} tipo="fantasma" alPulsar={() => alGestionar('eliminar')} />
        </View>
      </View>
    </ProveedorAcento>
  );
}

function FormEntrar({ p, alVolver, alEntrar }: { p: PerfilPublico; alVolver: () => void; alEntrar: (s: Awaited<ReturnType<typeof abrirSesion>>) => void }) {
  const a = useAcento();
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const enviar = async () => {
    setAbriendo(true);
    setError(null);
    try {
      alEntrar(await abrirSesion(p.id, clave));
    } catch (e) {
      setError(msj(e));
      setClave('');
      setAbriendo(false);
    }
  };
  return (
    <Entrada style={{ alignSelf: 'center', width: 440 }}>
      <Panel resaltado>
        <Boton texto="Cambiar de tripulante" icono={icono.atras} tipo="fantasma" alPulsar={alVolver} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Avatar nombre={p.nombre} tam={84} />
          <T v="titulo" style={{ marginTop: 12, fontSize: 26 }}>{p.nombre}</T>
          <T v="suave">{p.rol || 'Tripulación'}</T>
        </View>
        <Campo etiqueta="Contraseña" secureTextEntry autoFocus value={clave} onChangeText={setClave} onSubmitEditing={enviar} />
        {error && <T v="suave" style={{ color: color.critico, marginTop: 8 }}>{error}</T>}
        <Boton texto={abriendo ? 'Abriendo bóveda…' : 'Entrar'} icono={icono.candado} grande desactivado={!clave || abriendo} alPulsar={enviar} style={{ marginTop: 18 }} />
        <T v="tenue" style={{ marginTop: 12, textAlign: 'center', color: alfa(a.base, 0.8) }}>Tus datos están cifrados con tu contraseña.</T>
      </Panel>
    </Entrada>
  );
}

function FormCrear({ puedeVolver, alVolver, alCrear }: { puedeVolver: boolean; alVolver: () => void; alCrear: (s: Awaited<ReturnType<typeof crearPerfil>>) => void }) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [etapa, setEtapa] = useState<EtapaId>('tierra');
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const coinciden = !repetir || clave === repetir;
  const enviar = async () => {
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    setCreando(true);
    setError(null);
    try {
      alCrear(await crearPerfil({ nombre, rol, clave, etapa }));
    } catch (e) {
      setError(msj(e));
      setCreando(false);
    }
  };
  return (
    <ProveedorAcento etapa={etapa}>
      <Entrada style={{ alignSelf: 'center', width: 640 }}>
        <Panel titulo="Nuevo tripulante" icono={icono.persona} resaltado>
          {puedeVolver && <Boton texto="Volver" icono={icono.atras} tipo="fantasma" alPulsar={alVolver} style={{ alignSelf: 'flex-start', marginBottom: 10 }} />}
          <View style={{ gap: 14 }}>
            <View style={[est.fila, { gap: 14 }]}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} maxLength={60} autoFocus />
              </View>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Rol en la misión" value={rol} onChangeText={setRol} maxLength={60} placeholder="Ej.: especialista de misión" />
              </View>
            </View>
            <View style={[est.fila, { gap: 14, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Campo etiqueta="Contraseña" secureTextEntry value={clave} onChangeText={setClave} />
                <T v="tenue" style={{ color: clave.length >= CLAVE_MINIMA ? color.bien : color.tenue }}>Al menos {CLAVE_MINIMA} caracteres</T>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Campo etiqueta="Repite la contraseña" secureTextEntry value={repetir} onChangeText={setRepetir} />
                {!coinciden && <T v="tenue" style={{ color: color.critico }}>No coincide</T>}
              </View>
            </View>
            <T v="etiqueta">ETAPA ACTUAL</T>
            <Opciones columnas={4} valor={etapa} alElegir={setEtapa} opciones={ETAPAS.map((e) => ({ v: e.id, t: e.nombre, g: ICONO_ETAPA[e.id] }))} />
            {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
            <Boton texto={creando ? 'Creando bóveda cifrada…' : 'Crear y entrar'} icono={icono.jugar} grande desactivado={!nombre.trim() || clave.length < CLAVE_MINIMA || !coinciden || creando} alPulsar={enviar} />
          </View>
        </Panel>
      </Entrada>
    </ProveedorAcento>
  );
}

function FormGestion({ p, accion, alVolver, alTerminar }: { p: PerfilPublico; accion: 'archivar' | 'restaurar' | 'eliminar'; alVolver: () => void; alTerminar: () => void }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textos = {
    archivar: ['Archivar perfil', 'Deja de aparecer en la lista hasta restaurarlo. Sus datos se conservan.', 'Archivar'],
    restaurar: ['Restaurar perfil', 'Vuelve a la lista con todos sus datos.', 'Restaurar'],
    eliminar: ['Eliminar perfil', 'Se borran el perfil, sus registros, fotos y conversación. No se puede deshacer.', 'Eliminar para siempre'],
  }[accion];
  const confirmar = async () => {
    try {
      await gestionarPerfil(p.id, clave, accion);
      alTerminar();
    } catch (e) {
      setError(msj(e));
    }
  };
  return (
    <Entrada style={{ alignSelf: 'center', width: 480 }}>
      <Panel titulo={`${textos[0]}: ${p.nombre}`} icono={accion === 'eliminar' ? icono.borrar : icono.archivar} c={accion === 'eliminar' ? color.critico : undefined} resaltado>
        <T v="suave" style={{ marginBottom: 14 }}>{textos[1]}</T>
        <Campo etiqueta="Contraseña de este perfil" secureTextEntry autoFocus value={clave} onChangeText={setClave} />
        {error && <T v="suave" style={{ color: color.critico, marginTop: 8 }}>{error}</T>}
        <View style={[est.fila, { justifyContent: 'flex-end', gap: 10, marginTop: 16 }]}>
          <Boton texto="Cancelar" tipo="fantasma" alPulsar={alVolver} />
          <Boton texto={textos[2]} tipo={accion === 'eliminar' ? 'peligro' : 'primario'} desactivado={!clave} alPulsar={confirmar} />
        </View>
      </Panel>
    </Entrada>
  );
}

const estA = StyleSheet.create({
  logo: { width: 56, height: 56, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  tarjeta: { width: 210, minHeight: 280, alignItems: 'center', padding: 18, borderWidth: 1, borderRadius: 4 },
  nueva: { justifyContent: 'center', borderStyle: 'dashed', borderColor: color.linea, backgroundColor: 'rgba(9,17,34,0.5)' },
  archivado: { gap: 10, padding: 12, borderWidth: 1, borderColor: color.linea, borderRadius: 4, backgroundColor: color.panel },
});
