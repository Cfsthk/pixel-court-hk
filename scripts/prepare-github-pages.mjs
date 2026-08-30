import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const clientOutput = resolve(projectRoot, "dist", "client");
const pagesOutput = resolve(projectRoot, "_site");

await rm(pagesOutput, { recursive: true, force: true });
await mkdir(pagesOutput, { recursive: true });
await cp(clientOutput, pagesOutput, { recursive: true });

// GitHub Pages serves project sites below /pixel-court-hk/. Vinext's static
// export emits root-relative asset URLs, so make only the generated asset and
// metadata references document-relative; this keeps the same artifact usable
// at the repository Pages URL without changing the Cloudflare build.
for (const filename of ["index.html", "404.html", "index.rsc"]) {
  const filepath = resolve(pagesOutput, filename);
  let source;
  try {
    source = await readFile(filepath, "utf8");
  } catch {
    continue;
  }

  const rewritten = source.replace(
    /(["'(])\/(assets\/|favicon\.svg|og\.svg)/g,
    "$1./$2",
  );
  await writeFile(filepath, rewritten, "utf8");
}

// Prevent GitHub Pages' Jekyll pass from interpreting the generated asset
// directories or metadata files.
await writeFile(resolve(pagesOutput, ".nojekyll"), "", "utf8");

console.log(`Prepared GitHub Pages artifact at ${pagesOutput}`);
