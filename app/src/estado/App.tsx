import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { Sesion } from '../datos/boveda';

export type Pantalla = 'inicio' | 'asistente' | 'salud' | 'registros' | 'documentos' | 'ajustes' | 'diario';

interface Toast {
  id: number;
  texto: string;
}

interface Estado {
  sesion: Sesion | null;
  /** Cambia con cada modificación de datos para volver a pintar. */
  version: number;
  pantalla: Pantalla;
  params: Record<string, string>;
  toasts: Toast[];
  entrar: (s: Sesion) => void;
  salir: () => void;
  refrescar: () => void;
  ir: (p: Pantalla, params?: Record<string, string>) => void;
  avisar: (texto: string) => void;
}

const Contexto = createContext<Estado | null>(null);

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [version, setVersion] = useState(0);
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [params, setParams] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguiente = useRef(1);

  const avisar = useCallback((texto: string) => {
    const id = siguiente.current++;
    setToasts((t) => [...t, { id, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const valor: Estado = {
    sesion,
    version,
    pantalla,
    params,
    toasts,
    entrar: (s) => {
      setSesion(s);
      setPantalla('inicio');
      setVersion((v) => v + 1);
    },
    salir: () => {
      setSesion(null);
      setPantalla('inicio');
    },
    refrescar: () => setVersion((v) => v + 1),
    ir: (p, pr = {}) => {
      setPantalla(p);
      setParams(pr);
    },
    avisar,
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useApp fuera de ProveedorApp');
  return c;
}

/** Sesión abierta garantizada (pantallas detrás del acceso). */
export function useSesion(): Sesion {
  const { sesion } = useApp();
  if (!sesion) throw new Error('Sin sesión');
  return sesion;
}
