const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const THUMB_DIR = "images/link-thumbnails";

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

(async () => {

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files"
    ]
  });

  const page = await browser.newPage();

  const htmlFiles = findHtmlFiles(".");

  for (const file of htmlFiles) {

    const filename = path.basename(file, ".html");
    const output = path.join(THUMB_DIR, filename + ".webp");

    const fileUrl = "file://" + path.resolve(file);

    try {

      console.log("Rendering:", file);

      await page.goto(fileUrl, {
        waitUntil: "networkidle2",
        timeout: 30000
      });

      await page.setViewport({
        width: 1200,
        height: 800
      });

      await page.screenshot({
        path: output,
        type: "webp",
        quality: 80,
        clip: {
          x: 0,
          y: 0,
          width: 800,
          height: 450
        }
      });

      console.log("Generated:", output);

    } catch (err) {

      console.log("Failed:", file);
      console.log(err.message);

    }
  }

  await browser.close();

})();
