import { Radio, Siren, Users } from "lucide-react";
import { useState } from "react";
import { Estado } from "@/componentes/Estado";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Alcance = "local" | "simulacro";

/**
 * Registra un aviso. Netin todavía no tiene conexión con la tripulación ni con
 * Tierra, así que el aviso queda en este equipo. «Compartido» se muestra como
 * no disponible para que nadie crea que el aviso salió.
 */
export function DialogoAviso({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const [alcance, setAlcance] = useState<Alcance>("local");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  const cerrar = () => {
    alCerrar();
    setTimeout(() => {
      setTitulo("");
      setDetalle("");
      setHecho(false);
      setError(null);
      setAlcance("local");
    }, 200);
  };

  const guardar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.post("/registros", { tipo: "aviso", datos: { titulo, detalle, alcance } });
      setHecho(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const opciones = [
    { id: "local" as const, icono: Siren, titulo: "Local", texto: "Queda registrado en este equipo." },
    { id: "simulacro" as const, icono: Radio, titulo: "Simulacro", texto: "Práctica. Se marca como simulacro en todos lados." },
  ];

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Siren className="size-5 text-critico" aria-hidden /> Registrar un aviso
          </DialogTitle>
          <DialogDescription>Si es una emergencia real, avisa a la tripulación en voz alta y sigue el procedimiento de la misión. Netin no envía avisos.</DialogDescription>
        </DialogHeader>

        {hecho ? (
          <div className="space-y-3 py-2">
            <Estado nivel={alcance === "simulacro" ? "neutro" : "critico"}>{alcance === "simulacro" ? "Simulacro registrado" : "Aviso local registrado"}</Estado>
            <p className="text-sm text-tinta-suave">Lo encontrarás en Registros. No se envió a nadie.</p>
            <DialogFooter>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Alcance del aviso">
              {opciones.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={alcance === o.id}
                  onClick={() => setAlcance(o.id)}
                  className={cn(
                    "rounded-lg p-3 text-left ring-1 ring-inset transition-colors",
                    alcance === o.id ? "bg-acento-suave ring-acento" : "bg-casco-alto/50 ring-borde hover:ring-tinta-tenue",
                  )}
                >
                  <o.icono className="mb-1.5 size-4" aria-hidden />
                  <p className="text-sm font-medium">{o.titulo}</p>
                  <p className="text-xs text-tinta-suave">{o.texto}</p>
                </button>
              ))}
              <div className="rounded-lg bg-casco-alto/30 p-3 opacity-60 ring-1 ring-inset ring-borde" aria-disabled>
                <Users className="mb-1.5 size-4" aria-hidden />
                <p className="text-sm font-medium">Compartido</p>
                <p className="text-xs text-tinta-suave">No disponible: falta la conexión con la tripulación.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aviso-titulo">¿Qué pasa?</Label>
              <Input id="aviso-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} placeholder="Ej.: Mareo fuerte al despertar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aviso-detalle">Detalles (opcional)</Label>
              <Textarea id="aviso-detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={1000} rows={3} />
            </div>
            {error && <p className="text-sm text-critico">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={!titulo.trim() || enviando} className={alcance === "local" ? "bg-critico text-white hover:bg-critico/90" : ""}>
                {alcance === "simulacro" ? "Registrar simulacro" : "Registrar aviso"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
