import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type PluginOption } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// Standard TanStack Start Vite config (no @lovable.dev wrapper).
// Reference: https://tanstack.com/start/latest/docs/framework/react/building-the-server
export default defineConfig(async ({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Inject every VITE_* env var (from .env files and process.env) as a static
  // define so import.meta.env.VITE_* resolves identically in client and SSR.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins: PluginOption[] = [];

  // Dev server only: TanStack devtools overlay.
  if (command === "serve") {
    const { devtools } = await import("@tanstack/devtools-vite");
    plugins.push(devtools());
  }

  // TanStack Start: SSR, server functions, route generation, server entry.
  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  plugins.push(
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts, which
      // wraps the default entry with our SSR error handler. nitro/vite builds
      // the worker from this entry.
      server: { entry: "server" },
    }),
  );

  const { default: react } = await import("@vitejs/plugin-react");
  plugins.push(react());

  const { default: tailwindcss } = await import("@tailwindcss/vite");
  plugins.push(tailwindcss());

  const { default: tsConfigPaths } = await import("vite-tsconfig-paths");
  plugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));

  // Build only: nitro bundles the SSR server. The Cloudflare module preset
  // emits .output/server/wrangler.json for `wrangler deploy`.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    define: envDefine,
    environments: isDevBuild
      ? {
          client: {
            define: { "process.env.NODE_ENV": JSON.stringify("development") },
          },
        }
      : undefined,
    esbuild: isDevBuild ? { keepNames: true } : undefined,
    resolve: {
      alias: { "@": srcDir },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins,
  };
});
