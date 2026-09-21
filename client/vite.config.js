import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // Pre-bundle dependencies at server startup to eliminate first-load browser delay
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
    ],
  },
  server: {
    port: 5173,
    // Warm up entry files on dev server launch so initial page load is instant
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/index.css',
        './src/pages/DiscoverMeldsPage.jsx',
        './src/pages/LoginPage.jsx',
        './src/pages/RegisterPage.jsx',
        './src/components/Navbar.jsx',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
