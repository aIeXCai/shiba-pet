import { defineConfig } from "vite";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // 开发时仍直接读取完整 public 素材库；生产包只携带运行时会用到的
  // 透明帧和动作清单，避免把参考图、绿幕源图与废弃样张一并打包。
  publicDir: command === "build" ? false : "public",
  plugins:
    command === "build"
      ? [
          {
            name: "copy-shiba-runtime-assets",
            closeBundle() {
              const output = resolve("dist/assets/shiba");
              mkdirSync(output, { recursive: true });
              cpSync(
                resolve("public/assets/shiba/manifest.json"),
                resolve(output, "manifest.json"),
              );
              cpSync(
                resolve("public/assets/shiba/sprites/cartoon-v1"),
                resolve(output, "sprites/cartoon-v1"),
                { recursive: true },
              );
            },
          },
        ]
      : [],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
