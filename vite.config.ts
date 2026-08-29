import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import vercel from "vite-plugin-vercel";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Define VITE_TARGET=capacitor en tu script de build de Android
  const isCapacitor = env.VITE_TARGET === "capacitor";

  return {
    plugins: [
      react(),
      legacy(),
      vercel(),
      VitePWA({
        // En Capacitor no necesitas service worker/PWA real: la app ya es nativa.
        // Lo desactivamos para el build de Android y evitamos el error de precache.
        disable: isCapacitor,
        registerType: "autoUpdate",
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB, solo aplica al build web
          globIgnores: ["**/index-legacy-*.js", "**/polyfills-legacy-*.js"],
        },
      }),
    ],
    define: {
      "process.env": env,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 800, // aviso realista una vez que ya hiciste code-splitting
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": [
              "react",
              "react-dom",
              "react-router",
              "react-router-dom",
            ],
            "vendor-ionic": ["@ionic/react", "@ionic/react-router", "ionicons"],
            "vendor-firebase": ["firebase/app", "firebase/messaging"],
            "vendor-charts": ["apexcharts", "react-apexcharts"],
            "vendor-pdf": ["jspdf"],
            "vendor-motion": ["framer-motion", "motion", "lottie-react"],
            "vendor-maps": ["pigeon-maps"],
            "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          },
        },
      },
    },
  };
});
