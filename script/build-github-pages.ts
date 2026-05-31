import { build as viteBuild } from "vite";
import path from "path";

async function buildPages() {
  process.env.VITE_BASE_URL = process.env.VITE_BASE_URL || "/EQ-Interview-Bot/";

  console.log("Building site for GitHub Pages...");

  await viteBuild({
    configFile: path.resolve("vite.config.ts"),
    build: {
      outDir: path.resolve("docs"),
      emptyOutDir: true,
    },
  });

  console.log("GitHub Pages build complete. Files are in ./docs");
}

buildPages().catch((error) => {
  console.error(error);
  process.exit(1);
});