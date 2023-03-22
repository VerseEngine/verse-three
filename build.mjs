import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import external from "esbuild-plugin-external-global";
import rimraf from "rimraf";

const ORIG_WASM_PATH =
  "./node_modules/@verseengine/verse-core/verse_core_bg.wasm";

async function buildCommon(minify) {
  const res = await esbuild
    .build({
      entryPoints: ["src/index.ts"],
      format: "iife",
      globalName: "VerseThree",
      minify,
      sourcemap: true,
      bundle: true,
      metafile: true,
      tsconfig: "tsconfig.json",
      outfile: "dist/" + (minify ? "index.min.js" : "index.js"),
      plugins: [
        external.externalGlobalPlugin({
          three: "window.THREE",
          "@pixiv/three-vrm": "window.THREE_VRM",
        }),
      ],
    })
    .catch((err) => {
      console.error(err);
      // eslint-disable-next-line no-undef
      process.exit(1);
    });
  const analyzeLog = await esbuild.analyzeMetafile(res.metafile);
  console.log(analyzeLog);
}

async function buildEsm(minify) {
  const res = await esbuild
    .build({
      entryPoints: ["src/index.ts"],
      format: "esm",
      minify,
      sourcemap: true,
      bundle: true,
      metafile: true,
      external: ["three", "@pixiv/three-vrm"],
      tsconfig: "tsconfig.json",
      outfile: "dist/esm/" + (minify ? "index.min.js" : "index.js"),
    })
    .catch((err) => {
      console.error(err);
      // eslint-disable-next-line no-undef
      process.exit(1);
    });
  const analyzeLog = await esbuild.analyzeMetafile(res.metafile);
  console.log(analyzeLog);
}

function getNameWithChecksum(srcPath) {
  const checksum = crypto
    .createHash("shake256", { outputLength: 8 })
    .update(fs.readFileSync(srcPath))
    .digest("hex");
  return path.basename(srcPath).replace(/\.[.\w]+$/, (m) => `.${checksum}${m}`);
}
function createChecksumCopy(srcPath) {
  const distName = getNameWithChecksum(srcPath);
  fs.copyFileSync(srcPath, path.join(path.dirname(srcPath), distName));
  return distName;
}

rimraf.sync("./dist");
fs.mkdirSync("./dist");

await buildCommon(false);
await buildCommon(true);
await buildEsm(false);
await buildEsm(true);

createChecksumCopy("dist/index.js");
createChecksumCopy("dist/index.min.js");
createChecksumCopy("dist/esm/index.js");
const esmMinName = createChecksumCopy("dist/esm/index.min.js");
fs.copyFileSync(
  ORIG_WASM_PATH,
  path.join("dist", path.basename(ORIG_WASM_PATH))
);
const distWasmName = createChecksumCopy(
  path.join("dist", path.basename(ORIG_WASM_PATH))
);

for (const file of [
  "example/index.html",
  "demo/index.html",
  "example/setup-verse.js",
  "demo/setup-verse.js",
]) {
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file)
      .toString()
      .replace(
        /"..\/dist\/esm\/index(?:\.[a-z0-9]+?)*\.min\.js"/,
        `"../dist/esm/${esmMinName}"`
      )
      .replace(
        /"..\/dist\/verse_core_bg(?:\.[a-z0-9]+?)*\.wasm"/,
        `"../dist/${distWasmName}"`
      )
  );
}
