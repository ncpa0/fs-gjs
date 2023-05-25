import { build } from "@ncpa0cpl/nodepack";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const p = (p) => path.resolve(__dirname, "..", p);

async function main() {
  try {
    await build({
      srcDir: p("src"),
      outDir: p("dist"),
      target: "ESNext",
      formats: ["esm"],
      declarations: true,
      tsConfig: p("tsconfig.json"),
      compileVendors: ["@ncpa0cpl/mutex.js"],
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
