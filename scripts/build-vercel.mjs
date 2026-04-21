/**
 * Post-build step that turns the TanStack Start Vite SSR output
 * (dist/client + dist/server/server.js) into a Vercel Build Output API v3
 * deployable structure (.vercel/output/).
 *
 * Why: TanStack Start 1.167 no longer ships a Nitro/Vercel adapter.
 *      `vite build` produces plain SSR output, so we wire it up to Vercel
 *      ourselves with a single catch-all serverless function.
 */
import { build as esbuild } from "esbuild";
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const distClient = join(root, "dist", "client");
const distServer = join(root, "dist", "server");
const serverEntry = join(distServer, "server.js");

if (!existsSync(serverEntry)) {
  throw new Error(
    `[build-vercel] No se encontró ${serverEntry}. ¿Corrió 'vite build' antes?`,
  );
}

const out = join(root, ".vercel", "output");
const staticDir = join(out, "static");
const funcDir = join(out, "functions", "__ssr.func");

console.log("[build-vercel] Limpiando .vercel/output/");
await rm(out, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await mkdir(funcDir, { recursive: true });

console.log("[build-vercel] Copiando assets estáticos → .vercel/output/static");
await cp(distClient, staticDir, { recursive: true });

// Wrapper mínimo: adapta el handler web (Request → Response) del server.js
// de TanStack Start a la API de Vercel (req/res de Node).
const wrapperSource = `
import app from ${JSON.stringify(serverEntry.split("\\\\").join("/"))};

export default async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = new URL(req.url || "/", proto + "://" + host);

  const init = {
    method: req.method,
    headers: req.headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req;
    init.duplex = "half";
  }

  try {
    const webRes = await app.fetch(new Request(url, init));
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error("[__ssr] error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
`.trimStart();

const wrapperPath = join(root, ".vercel", "_ssr-wrapper.mjs");
await writeFile(wrapperPath, wrapperSource);

console.log("[build-vercel] Bundling SSR con esbuild → functions/__ssr.func/");
await esbuild({
  entryPoints: [{ in: wrapperPath, out: "index" }],
  bundle: true,
  outdir: funcDir,
  outExtension: { ".js": ".mjs" },
  platform: "node",
  target: "node22",
  format: "esm",
  splitting: true,
  // createRequire shim: algunos paquetes CJS dependen de require().
  banner: {
    js: `import { createRequire as __cr } from "module";const require = __cr(import.meta.url);`,
  },
  logLevel: "info",
  legalComments: "none",
  mainFields: ["module", "main"],
  conditions: ["node", "import", "module", "default"],
});

await rm(wrapperPath, { force: true });

console.log("[build-vercel] Escribiendo .vc-config.json y package.json");
await writeFile(
  join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      maxDuration: 30,
    },
    null,
    2,
  ),
);

await writeFile(
  join(funcDir, "package.json"),
  JSON.stringify({ type: "module" }),
);

console.log("[build-vercel] Escribiendo config.json (Build Output API v3)");
await writeFile(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/__ssr" },
      ],
    },
    null,
    2,
  ),
);

console.log("[build-vercel] ✔ .vercel/output/ listo para desplegar");
