// Vista previa del diseño en el navegador (no es la app real).
// La app de Windows se compila con React Native for Windows.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  root: path.join(raiz, 'vista'),
  plugins: [react()],
  resolve: {
    alias: { 'react-native': 'react-native-web' },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
  },
  define: { __DEV__: 'true', 'process.env.NODE_ENV': '"development"', global: 'globalThis' },
  server: { port: Number(process.env.PORT ?? 5180), host: '127.0.0.1' },
});
