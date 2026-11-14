import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Marco } from "@/componentes/Marco";
import { TooltipProvider } from "@/componentes/ui/tooltip";
import { ProveedorSesion, useSesion } from "@/hooks/useSesion";
import { Acceso } from "@/pantallas/Acceso";
import { Ajustes } from "@/pantallas/Ajustes";
import { Asistente } from "@/pantallas/Asistente";
import { FlujoDiario } from "@/pantallas/diario/FlujoDiario";
import { Documentos } from "@/pantallas/Documentos";
import { Inicio } from "@/pantallas/Inicio";
import { Registros } from "@/pantallas/Registros";
import { Salud } from "@/pantallas/salud/Salud";

const clavePospuesto = (perfilId: string, fecha: string) => `netin.pospuesto.${perfilId}.${fecha}`;
function leerPospuesto(clave: string) {
  try {
    return sessionStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
}

function Rutas() {
  const { perfil, dia, cargando } = useSesion();
  const navegar = useNavigate();
  const [, refrescar] = useState(0);
  // Una vez abierto, el flujo sigue visible hasta que la persona sale,
  // así se ve la pantalla final aunque ya no queden pasos.
  const [enFlujo, setEnFlujo] = useState(false);
  const clave = perfil && dia ? clavePospuesto(perfil.id, dia.fecha) : "";
  // La foto se pide siempre la primera vez del día. Los otros pasos se ofrecen
  // hasta que la persona decida seguir después.
  const forzarFlujo = !!dia && (dia.siguiente === "foto" || (dia.siguiente !== null && !leerPospuesto(clave)));
  useEffect(() => {
    if (forzarFlujo) setEnFlujo(true);
  }, [forzarFlujo]);
  useEffect(() => {
    if (!perfil) setEnFlujo(false);
  }, [perfil]);

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <img src="/netin.svg" alt="Cargando Netin" className="respira size-12" />
      </div>
    );
  }
  if (!perfil) return <Acceso />;
  if (!dia) return null;

  const salirDelFlujo = () => {
    try {
      sessionStorage.setItem(clave, "1");
    } catch {
      // sin almacenamiento: el flujo puede volver a ofrecerse
    }
    setEnFlujo(false);
    refrescar((n) => n + 1);
    navegar("/");
  };

  if (forzarFlujo || enFlujo) return <FlujoDiario alSalir={salirDelFlujo} />;

  return (
    <Routes>
      <Route path="/registro-diario" element={<FlujoDiario alSalir={salirDelFlujo} />} />
      <Route
        path="*"
        element={
          <Marco>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/asistente" element={<Asistente />} />
              <Route path="/salud/*" element={<Salud />} />
              <Route path="/registros" element={<Registros />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Marco>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <ProveedorSesion>
          <Rutas />
        </ProveedorSesion>
      </TooltipProvider>
    </BrowserRouter>
  );
}
