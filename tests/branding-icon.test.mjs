import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync("index.html", "utf8");
const studio = fs.readFileSync("reporting-studio.html", "utf8");
const styles = fs.readFileSync("dashboard.css", "utf8");
const icon = fs.readFileSync("favicon.svg", "utf8");
const manifestText = fs.readFileSync("site.webmanifest", "utf8");
const pagesWorkflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");

test("Dashboard and Studio share favicon, touch icon and web-app manifest", () => {
  for (const [name, html] of [["Dashboard", dashboard], ["Studio", studio]]) {
    assert.match(html, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg\?v=20261126-vwg-mark-v2"/, name+" favicon missing");
    assert.match(html, /rel="apple-touch-icon" href="\.\/favicon\.svg\?v=20261126-vwg-mark-v2"/, name+" touch icon missing");
    assert.match(html, /rel="mask-icon" href="\.\/favicon\.svg\?v=20261126-vwg-mark-v2" color="#ff174f"/, name+" pinned-tab icon missing");
    assert.match(html, /rel="manifest" href="\.\/site\.webmanifest\?v=20261126-vwg-mark-v2"/, name+" web-app manifest missing");
    assert.match(html, /name="apple-mobile-web-app-title" content="VWG Dispatcher"/, name+" home-screen title missing");
  }
});

test("The favicon uses the exact logo mask already used by the Dashboard", () => {
  const cssLogo = styles.match(/--vw-logo:\s*url\("data:image\/png;base64,([^"]+)"\)/);
  const svgLogo = icon.match(/<image href="data:image\/png;base64,([^"]+)" x="0" y="0" width="256" height="256"\/>/);
  assert.ok(cssLogo, "Dashboard logo mask not found in CSS");
  assert.ok(svgLogo, "Embedded original logo mask not found in favicon SVG");
  assert.equal(svgLogo[1], cssLogo[1], "Favicon must use the exact same underlying VW logo artwork");
  assert.match(icon, /linearGradient id="logo"/);
  assert.match(icon, /mask-type="alpha"/);
});

test("Web-app manifest is valid and points to the shared icon", () => {
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.name, "VWG Dispatch Intelligence");
  assert.equal(manifest.short_name, "VWG Dispatch");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(item => item.src === "./favicon.svg" && item.type === "image/svg+xml" && item.sizes === "any"));
});

test("GitHub Pages build publishes the icon and manifest", () => {
  assert.match(pagesWorkflow, /"favicon\.svg"/);
  assert.match(pagesWorkflow, /"site\.webmanifest"/);
  assert.match(pagesWorkflow, /cp favicon\.svg site\.webmanifest _site\//);
});
