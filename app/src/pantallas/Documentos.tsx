import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { alfa, useAcento } from '../hud/Acento';
import { Boton, Entrada, Estado, Icono, Panel, T, est } from '../hud/componentes';
import { color, icono } from '../hud/tema';
import { plataforma } from '../plataforma';

const tamano = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function Documentos() {
  const a = useAcento();
  const [carpeta, setCarpeta] = useState('');
  const [docs, setDocs] = useState<{ archivo: string; bytes: number; modificado: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = async () => {
    try {
      setCarpeta(await plataforma.carpetaDocumentos());
      setDocs(await plataforma.listarDocumentos());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void cargar();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
      <View style={[est.fila, { justifyContent: 'space-between' }]}>
        <View>
          <T v="titulo">Documentos</T>
          <T v="suave">Los PDF y textos de la misión que consultará el asistente.</T>
        </View>
        <Boton texto="Actualizar lista" icono={icono.actualizar} tipo="secundario" alPulsar={cargar} />
      </View>
      <Panel titulo="Carpeta de documentos" icono={icono.carpeta}>
        <T v="cuerpo">Coloca los archivos en esta carpeta y pulsa «Actualizar lista»:</T>
        <T v="suave" style={{ marginTop: 6 }}>{carpeta || '…'}</T>
        <View style={{ marginTop: 10 }}>
          <Estado nivel="neutro" texto="El asistente aún no los consulta" />
        </View>
      </Panel>
      {error && <T v="suave" style={{ color: color.critico }}>{error}</T>}
      {docs && !docs.length && (
        <Panel>
          <T v="suave">Todavía no hay documentos. Cuando agregues PDF o archivos de texto a la carpeta, aparecerán aquí.</T>
        </Panel>
      )}
      <View style={[est.fila, { flexWrap: 'wrap', gap: 12 }]}>
        {docs?.map((d, i) => (
          <Entrada key={d.archivo} retraso={i * 40} style={{ width: '48%', flexGrow: 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${d.archivo}`} onPress={() => void plataforma.abrirDocumento(d.archivo)} style={({ hovered }: any) => [est.fila, { gap: 12, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: hovered ? a.base : color.linea, backgroundColor: hovered ? alfa(a.base, 0.06) : color.panel }]}>
              <Icono g={icono.documentos} tam={22} c={a.base} />
              <View style={{ flex: 1 }}>
                <T v="subtitulo" style={{ fontSize: 15 }} numberOfLines={1}>{d.archivo.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')}</T>
                <T v="tenue" numberOfLines={1}>{d.archivo} · {tamano(d.bytes)} · {new Date(d.modificado).toLocaleDateString('es')}</T>
              </View>
              <Icono g={icono.abrir} tam={14} c={color.tenue} />
            </Pressable>
          </Entrada>
        ))}
      </View>
    </ScrollView>
  );
}
