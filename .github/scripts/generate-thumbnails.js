const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const THUMB_DIR = "images/link-thumbnails";
const SITE_BASE = "https://tektite-tv.github.io/tektite-chat";

fs.mkdirSync(THUMB_DIR, { recursive: true });

function findHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (
        file === ".git" ||
        file === ".github" ||
        file === "node_modules" ||
        file === "images"
      ) {
        return;
      }
      results = results.concat(findHtmlFiles(filePath));
    } else if (file.endsWith(".html")) {
      results.push(filePath);
    }
  });

  return results;
}

function toSiteUrl(filePath) {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return `${SITE_BASE}/${normalized}`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const htmlFiles = findHtmlFiles(".");
  const page = await browser.newPage();

  await page.setViewport({
    width: 1400,
    height: 1000,
    deviceScaleFactor: 1
  });

  for (const file of htmlFiles) {
    const filename = path.basename(file, ".html");
    const output = path.join(THUMB_DIR, filename + ".webp");
    const url = toSiteUrl(file);

    try {
      console.log("Rendering:", url);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000
      });

      await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            });
          })
        );
      });

      await new Promise(resolve => setTimeout(resolve, 2500));

      await page.screenshot({
        path: output,
        type: "webp",
        quality: 80,
        clip: {
          x: 0,
          y: 0,
          width: 960,
          height: 540
        }
      });

      console.log("Generated:", output);
    } catch (err) {
      console.log("Failed:", url);
      console.log(err.message);
    }
  }

  await browser.close();
})();
