import { createContext, useContext, type ReactNode } from 'react';
import type { EtapaId } from '../datos/catalogos';
import { ACENTO } from './tema';

const Contexto = createContext<{ etapa: EtapaId; base: string; oscuro: string }>({ etapa: 'orbita', ...ACENTO.orbita });

export function ProveedorAcento({ etapa, children }: { etapa: EtapaId; children: ReactNode }) {
  return <Contexto.Provider value={{ etapa, ...ACENTO[etapa] }}>{children}</Contexto.Provider>;
}

/** Color de acento de la etapa actual. */
export const useAcento = () => useContext(Contexto);

/** Mezcla un color #rrggbb con transparencia. */
export function alfa(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
