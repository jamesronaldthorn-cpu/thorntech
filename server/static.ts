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

  app.use(express.static(distPath, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  app.use("/{*path}", async (req, res) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let html = await fs.promises.readFile(indexPath, "utf-8");

      try {
        const seo = await getSeoData(req.path);
        if (seo) {
          html = injectSeoIntoHtml(html, seo);
        }
      } catch (seoErr) {
        console.error("[SEO] Error generating SEO data for", req.path, seoErr);
      }

      res.set("Content-Type", "text/html");
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.send(html);
    } catch (err) {
      console.error("[Static] Error serving", req.path, err);
      res.status(500).send("Internal Server Error");
    }
  });
}
