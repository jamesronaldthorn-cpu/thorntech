import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getSeoData, injectSeoIntoHtml } from "./seo";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");

    const seo = await getSeoData(req.path);
    if (seo) {
      html = injectSeoIntoHtml(html, seo);
    }

    res.set("Content-Type", "text/html").send(html);
  });
}
