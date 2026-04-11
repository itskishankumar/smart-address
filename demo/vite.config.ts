import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "url-expander-dev",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api/expand")) return next();
          // Load through Vite so raw TS in node_modules (smart-address/node) is transpiled.
          const mod = await server.ssrLoadModule("/api/expand.ts");
          const url = new URL(req.url, "http://localhost").searchParams.get(
            "url",
          );
          const { status, body } = await mod.handleExpand(url);
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(body));
        });
      },
    },
  ],
  envPrefix: [
    "VITE_",
    "GOOGLE_MAPS_",
    "BING_MAPS_",
    "HERE_MAPS_",
    "YANDEX_MAPS_",
  ],
});
