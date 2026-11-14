import { ExternalLink, FileText, FolderOpen, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { Estado } from "@/componentes/Estado";
import { Encabezado, Panel, Vacio } from "@/componentes/Panel";
import { Button } from "@/componentes/ui/button";
import { useDatos } from "@/hooks/useDatos";
import { fechaHora } from "@/lib/formato";

interface Doc {
  archivo: string;
  titulo: string;
  tipo: string;
  bytes: number;
  modificado: string;
}

const tamano = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function Documentos() {
  const { datos, recargar, cargando } = useDatos<{ carpeta: string; documentos: Doc[] }>("/documentos");

  return (
    <div>
      <Encabezado
        titulo="Documentos"
        descripcion="Los PDF y textos de la misión que consultará el asistente."
        accion={
          <Button variant="outline" onClick={() => void recargar()} disabled={cargando}>
            <RefreshCw className={cargando ? "size-4 animate-spin" : "size-4"} /> Actualizar lista
          </Button>
        }
      />

      <Panel className="mb-5 flex flex-wrap items-start gap-3 p-4">
        <FolderOpen className="mt-0.5 size-5 text-acento" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p>Coloca los archivos en esta carpeta y pulsa «Actualizar lista»:</p>
          <code className="mt-1 block break-all text-xs text-tinta-suave">{datos?.carpeta ?? "…"}</code>
        </div>
        <Estado nivel="neutro">El asistente aún no los consulta</Estado>
      </Panel>

      {datos && !datos.documentos.length ? (
        <Panel>
          <Vacio>Todavía no hay documentos. Cuando agregues PDF o archivos de texto a la carpeta, aparecerán aquí.</Vacio>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {datos?.documentos.map((d, i) => (
            <motion.li key={d.archivo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <a
                href={`/api/documentos/abrir?archivo=${encodeURIComponent(d.archivo)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-xl bg-casco/75 p-4 ring-1 ring-inset ring-borde transition-colors hover:ring-acento/60"
              >
                <FileText className="mt-0.5 size-5 shrink-0 text-acento" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium capitalize-first">{d.titulo}</span>
                  <span className="block truncate text-xs text-tinta-tenue">{d.archivo}</span>
                  <span className="block text-xs text-tinta-tenue">
                    {d.tipo.toUpperCase()} · {tamano(d.bytes)} · {fechaHora(d.modificado)}
                  </span>
                </span>
                <ExternalLink className="size-4 text-tinta-tenue" aria-hidden />
              </a>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
