// Vercel & Netlify-ready TanStack Start configuration.
// The original application structure is preserved; deployment adapters
// can be toggled based on the platform.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [netlify()],
    server: {
      host: "0.0.0.0",
    },
  },
});
