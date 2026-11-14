import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Carga una ruta de la API y permite recargarla. */
export function useDatos<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(!!ruta);
  const actual = useRef(ruta);
  actual.current = ruta;

  const recargar = useCallback(async () => {
    if (!actual.current) return;
    const pedida = actual.current;
    setCargando(true);
    try {
      const d = await api.get<T>(pedida);
      if (actual.current === pedida) {
        setDatos(d);
        setError(null);
      }
    } catch (e) {
      if (actual.current === pedida) setError((e as Error).message);
    } finally {
      if (actual.current === pedida) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [ruta, recargar]);

  return { datos, error, cargando, recargar, setDatos };
}
