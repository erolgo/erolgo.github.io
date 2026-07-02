import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const SB_URL = process.env.SUPABASE_URL || "https://luyhfyhwqyzwdjpcfyyn.supabase.co/rest/v1/bina_liste";
const SB_KEY = process.env.SUPABASE_KEY || "sb_publishable_FftwyHK-9ZkFEp37Ejrv6A_ctj6mLFy";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json());

  // API Route: Search by Bina ID
  app.get("/api/bina/search", async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID is required" });

    try {
      // Use explicit encoding for Turkish characters and spaces
      const encodedIdKey = encodeURIComponent("BİNA ID");
      const url = `${SB_URL}?${encodedIdKey}=eq.${id}&select=*`;

      console.log(`[Search] ID: ${id} -> URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Search] Supabase error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "Supabase API error", details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Search] Internal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Route: Filter by address
  app.get("/api/bina/filter", async (req, res) => {
    const { text } = req.query;
    if (!text || (text as string).length < 3) {
      return res.status(400).json({ error: "Search text must be at least 3 characters" });
    }

    try {
      const query = `or=(MAHALLE.ilike.*${text}*,"CADDE / SOKAK".ilike.*${text}*,"BİNA ADI".ilike.*${text}*,"SİTE ADI".ilike.*${text}*,"BLOK ADI".ilike.*${text}*,"KAPI NO".ilike.*${text}*,İL.ilike.*${text}*,İLÇE.ilike.*${text}*)`;
      const url = `${SB_URL}?${query}&limit=20&select=*`;

      console.log(`[Filter] Text: ${text} -> URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Filter] Supabase error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: "Supabase API error", details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Filter] Internal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
