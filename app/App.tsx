import { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { estadoDia } from './src/datos/registros';
import { ProveedorApp, useApp } from './src/estado/App';
import { ProveedorAcento } from './src/hud/Acento';
import { Fondo } from './src/hud/Fondo';
import { Marco } from './src/hud/Marco';
import { Toasts } from './src/hud/Toasts';
import { Acceso } from './src/pantallas/Acceso';
import { Ajustes } from './src/pantallas/Ajustes';
import { Asistente } from './src/pantallas/Asistente';
import { FlujoDiario } from './src/pantallas/diario/FlujoDiario';
import { Documentos } from './src/pantallas/Documentos';
import { Inicio } from './src/pantallas/Inicio';
import { Registros } from './src/pantallas/Registros';
import { Salud } from './src/pantallas/Salud';

function Contenido() {
  const { sesion, pantalla, ir, version } = useApp();
  void version;
  // Fecha en que la persona eligió «Seguir después» (por sesión de la app).
  const [pospuesto, setPospuesto] = useState<string | null>(null);
  // Una vez abierto, el flujo queda visible hasta salir, así se ve la pantalla final.
  const [enFlujo, setEnFlujo] = useState(false);
  const dia = sesion ? estadoDia(sesion) : null;
  // La foto se pide siempre la primera vez del día; los otros pasos se
  // ofrecen hasta que la persona decide seguir después.
  const forzar = !!dia && (dia.siguiente === 'foto' || (dia.siguiente !== null && pospuesto !== dia.fecha));
  useEffect(() => {
    if (forzar) setEnFlujo(true);
  }, [forzar]);
  useEffect(() => {
    if (!sesion) setEnFlujo(false);
  }, [sesion]);

  if (!sesion || !dia) {
    return (
      <>
        <Fondo etapa="orbita" />
        <Acceso />
      </>
    );
  }

  const salirDelFlujo = () => {
    setPospuesto(dia.fecha);
    setEnFlujo(false);
    ir('inicio');
  };

  return (
    <ProveedorAcento etapa={sesion.perfil.etapa}>
      <Fondo etapa={sesion.perfil.etapa} />
      {forzar || enFlujo || pantalla === 'diario' ? (
        <FlujoDiario alSalir={salirDelFlujo} />
      ) : (
        <Marco>
          {pantalla === 'inicio' && <Inicio />}
          {pantalla === 'asistente' && <Asistente />}
          {pantalla === 'salud' && <Salud />}
          {pantalla === 'registros' && <Registros />}
          {pantalla === 'documentos' && <Documentos />}
          {pantalla === 'ajustes' && <Ajustes />}
        </Marco>
      )}
      <Toasts />
    </ProveedorAcento>
  );
}

export default function App() {
  return (
    <ProveedorApp>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#03050c' }}>
        <Contenido />
      </View>
    </ProveedorApp>
  );
}
