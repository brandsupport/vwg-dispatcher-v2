import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public");
const assets = ["index.html", "dashboard.css", "dashboard.js", "login.html"];

await mkdir(output, { recursive: true });
for (const asset of assets) {
  await copyFile(join(root, asset), join(output, asset));
}
console.log("Prepared Worker static assets:", assets.join(", "));
