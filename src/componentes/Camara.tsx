import { Camera, CameraOff, RefreshCw, Check } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/componentes/ui/button";

type Estado = "iniciando" | "vivo" | "capturada" | "sin-camara" | "desactivada";

/**
 * Toma una foto con la cámara. Permite repetirla antes de guardar y seguir
 * sin foto si la cámara no está disponible.
 */
export function Camara({
  camaraId,
  activa,
  alGuardar,
  alOmitir,
  guardando,
}: {
  camaraId: string | null;
  activa: boolean;
  alGuardar: (imagen: string) => void;
  alOmitir: (motivo: string) => void;
  guardando: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>(activa ? "iniciando" : "desactivada");
  const [foto, setFoto] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [flash, setFlash] = useState(false);

  const detener = () => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
  };

  const iniciar = useCallback(async () => {
    if (!activa) return setEstado("desactivada");
    setEstado("iniciando");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMotivo("Este navegador no permite usar la cámara.");
      return setEstado("sin-camara");
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: camaraId ? { deviceId: { exact: camaraId } } : { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      flujo.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setEstado("vivo");
    } catch (e) {
      const nombre = (e as DOMException).name;
      setMotivo(
        nombre === "NotAllowedError"
          ? "No diste permiso para usar la cámara."
          : nombre === "NotFoundError" || nombre === "OverconstrainedError"
            ? "No se encontró una cámara."
            : "La cámara no está disponible.",
      );
      setEstado("sin-camara");
    }
  }, [activa, camaraId]);

  useEffect(() => {
    void iniciar();
    return detener;
  }, [iniciar]);

  const capturar = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const ancho = Math.min(960, v.videoWidth);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = Math.round((v.videoHeight / v.videoWidth) * ancho);
    const ctx = lienzo.getContext("2d")!;
    ctx.translate(ancho, 0);
    ctx.scale(-1, 1); // como espejo, igual que la vista previa
    ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
    setFoto(lienzo.toDataURL("image/jpeg", 0.85));
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    setEstado("capturada");
    detener();
  };

  const repetir = () => {
    setFoto(null);
    void iniciar();
  };

  if (estado === "sin-camara" || estado === "desactivada") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-casco/80 p-8 text-center ring-1 ring-borde">
        <CameraOff className="size-10 text-tinta-tenue" aria-hidden />
        <div>
          <p className="font-medium">{estado === "desactivada" ? "La cámara está desactivada en Ajustes." : motivo}</p>
          <p className="mt-1 text-sm text-tinta-suave">Puedes seguir sin foto. Quedará anotado que hoy no hubo foto.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {estado === "sin-camara" && (
            <Button variant="outline" onClick={() => void iniciar()}>
              <RefreshCw className="size-4" /> Intentar de nuevo
            </Button>
          )}
          <Button onClick={() => alOmitir(estado === "desactivada" ? "Cámara desactivada" : motivo)} disabled={guardando}>
            Seguir sin foto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl bg-black ring-1 ring-borde">
        <video ref={video} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${estado === "capturada" ? "hidden" : ""}`} />
        {foto && <img src={foto} alt="Tu foto de hoy" className="h-full w-full object-cover" />}
        {estado === "iniciando" && <p className="absolute inset-0 flex items-center justify-center text-sm text-tinta-suave">Encendiendo la cámara…</p>}
        {estado === "vivo" && (
          // Guía de encuadre
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 300" aria-hidden>
            <ellipse cx="200" cy="140" rx="78" ry="100" fill="none" stroke="var(--acento)" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>
        )}
        {flash && <motion.div initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} className="absolute inset-0 bg-white" />}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {estado === "capturada" ? (
          <>
            <Button variant="outline" onClick={repetir} disabled={guardando}>
              <RefreshCw className="size-4" /> Repetir
            </Button>
            <Button onClick={() => foto && alGuardar(foto)} disabled={guardando}>
              <Check className="size-4" /> Guardar foto
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={capturar} disabled={estado !== "vivo"} className="min-w-44">
              <Camera className="size-4" /> Tomar foto
            </Button>
            <Button variant="ghost" onClick={() => (detener(), alOmitir("Sin foto por decisión propia"))} disabled={guardando}>
              Seguir sin foto
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
