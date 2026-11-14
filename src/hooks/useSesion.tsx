import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { EstadoDia, Perfil } from "@compartido/catalogos";
import { alPerderSesion, api } from "@/lib/api";

interface Sesion {
  perfil: Perfil | null;
  cargando: boolean;
  dia: EstadoDia | null;
  entrar: (p: Perfil) => void;
  salir: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  refrescarDia: () => Promise<EstadoDia | null>;
  cambiarEtapa: (etapa: Perfil["etapa"]) => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [dia, setDia] = useState<EstadoDia | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescarDia = useCallback(async () => {
    try {
      const d = await api.get<EstadoDia>("/dia");
      setDia(d);
      return d;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    alPerderSesion(() => {
      setPerfil(null);
      setDia(null);
    });
    api
      .get<Perfil>("/yo")
      .then(async (p) => {
        setPerfil(p);
        await refrescarDia();
      })
      .catch(() => setPerfil(null))
      .finally(() => setCargando(false));
  }, [refrescarDia]);

  // La etapa tiñe toda la interfaz.
  useEffect(() => {
    document.documentElement.dataset.etapa = perfil?.etapa ?? "tierra";
  }, [perfil?.etapa]);

  // Si la app queda abierta al cambiar de día, se vuelve a pedir la foto.
  useEffect(() => {
    if (!perfil) return;
    const t = setInterval(() => void refrescarDia(), 60_000);
    const alVolver = () => document.visibilityState === "visible" && void refrescarDia();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [perfil, refrescarDia]);

  const valor: Sesion = {
    perfil,
    cargando,
    dia,
    entrar: (p) => {
      setPerfil(p);
      void refrescarDia();
    },
    salir: async () => {
      await api.del("/sesion").catch(() => {});
      setPerfil(null);
      setDia(null);
    },
    refrescarPerfil: async () => setPerfil(await api.get<Perfil>("/yo")),
    refrescarDia,
    cambiarEtapa: async (etapa) => setPerfil(await api.patch<Perfil>("/yo", { etapa })),
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSesion fuera de ProveedorSesion");
  return c;
}

/** Perfil garantizado (para pantallas detrás del acceso). */
export function usePerfil(): Perfil {
  const { perfil } = useSesion();
  if (!perfil) throw new Error("Sin perfil");
  return perfil;
}
