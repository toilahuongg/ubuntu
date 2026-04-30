import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import rsc from "@vitejs/plugin-rsc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterRSC(), rsc(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    allowedHosts: ['dev2.misoapps.com']
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^mongoose$/, replacement: "/src/react-router-shims/mongoose.ts" },
    ],
  },
});
