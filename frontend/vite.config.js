import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'node:dns';
dns.setDefaultResultOrder('verbatim');
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
    build: {
        outDir: 'dist',
    }
});
