import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      target: "react",
      autoCodeSplitting: true,
      server: { preset: process.env.NITRO_PRESET ?? "vercel" },
    }),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
