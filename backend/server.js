/**
 * File Upload Server
 * Pure Node.js — no external dependencies required.
 * Run: node server.js
 * Default port: 3000
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Readable } = require("stream");

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// In-memory file registry (use a DB in production)
const fileRegistry = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

function mime(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif",  ".webp": "image/webp",  ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".txt": "text/plain",
    ".mp4": "video/mp4",  ".mp3": "audio/mpeg",
    ".zip": "application/zip", ".json": "application/json",
  };
  return types[ext] || "application/octet-stream";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

// ── Multipart parser (no external deps) ───────────────────────────────────

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const boundary = (() => {
      const ct = req.headers["content-type"] || "";
      const m = ct.match(/boundary=(.+)/);
      return m ? m[1].trim() : null;
    })();

    if (!boundary) return reject(new Error("No boundary found"));

    const chunks = [];
    let totalSize = 0;

    req.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE) {
        req.destroy();
        return reject(new Error("File too large (max 50 MB)"));
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const buf = Buffer.concat(chunks);
        const delim = Buffer.from(`--${boundary}`);
        const files = [];

        let pos = 0;
        while (pos < buf.length) {
          const start = indexOf(buf, delim, pos);
          if (start === -1) break;
          pos = start + delim.length;

          // Skip \r\n after boundary
          if (buf[pos] === 0x0d && buf[pos + 1] === 0x0a) pos += 2;
          if (buf[pos] === 0x2d && buf[pos + 1] === 0x2d) break; // --boundary--

          // Read headers
          const headerEnd = indexOf(buf, Buffer.from("\r\n\r\n"), pos);
          if (headerEnd === -1) break;
          const headerStr = buf.slice(pos, headerEnd).toString();
          pos = headerEnd + 4;

          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const fileMatch = headerStr.match(/filename="([^"]+)"/);
          if (!fileMatch) continue; // skip non-file fields

          const next = indexOf(buf, delim, pos);
          const end = next === -1 ? buf.length : next - 2; // strip \r\n before next boundary
          const data = buf.slice(pos, end);
          pos = next;

          files.push({
            fieldname: nameMatch ? nameMatch[1] : "file",
            originalname: fileMatch[1],
            buffer: data,
            size: data.length,
          });
        }

        resolve(files);
      } catch (e) {
        reject(e);
      }
    });

    req.on("error", reject);
  });
}

function indexOf(buf, search, start = 0) {
  for (let i = start; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

// ── Route handlers ─────────────────────────────────────────────────────────

async function handleUpload(req, res) {
  try {
    const files = await parseMultipart(req);
    if (!files.length) return json(res, 400, { error: "No file received" });

    const uploaded = files.map((f) => {
      const id = uid();
      const ext = path.extname(f.originalname);
      const storedName = `${id}${ext}`;
      const dest = path.join(UPLOAD_DIR, storedName);
      fs.writeFileSync(dest, f.buffer);

      const record = {
        id,
        originalName: f.originalname,
        storedName,
        size: f.size,
        sizeFormatted: formatSize(f.size),
        mimetype: mime(f.originalname),
        uploadedAt: new Date().toISOString(),
      };
      fileRegistry.set(id, record);
      return record;
    });

    json(res, 200, { success: true, files: uploaded });
  } catch (err) {
    json(res, 400, { error: err.message });
  }
}

function handleList(req, res) {
  const files = Array.from(fileRegistry.values()).sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
  json(res, 200, { files });
}

function handleDownload(req, res, id) {
  const record = fileRegistry.get(id);
  if (!record) return json(res, 404, { error: "File not found" });

  const filePath = path.join(UPLOAD_DIR, record.storedName);
  if (!fs.existsSync(filePath)) return json(res, 404, { error: "File missing from disk" });

  res.writeHead(200, {
    "Content-Type": record.mimetype,
    "Content-Disposition": `attachment; filename="${record.originalName}"`,
    "Content-Length": record.size,
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(filePath).pipe(res);
}

function handleDelete(req, res, id) {
  const record = fileRegistry.get(id);
  if (!record) return json(res, 404, { error: "File not found" });

  const filePath = path.join(UPLOAD_DIR, record.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fileRegistry.delete(id);

  json(res, 200, { success: true, id });
}

// ── Serve static frontend ──────────────────────────────────────────────────

function serveStatic(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const ext = path.extname(filePath);
  const mimeTypes = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
  fs.createReadStream(filePath).pipe(res);
}

// ── Router ─────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // API routes
  if (pathname === "/api/upload" && method === "POST") return handleUpload(req, res);
  if (pathname === "/api/files" && method === "GET") return handleList(req, res);

  const dlMatch = pathname.match(/^\/api\/files\/([a-f0-9]+)\/download$/);
  if (dlMatch && method === "GET") return handleDownload(req, res, dlMatch[1]);

  const delMatch = pathname.match(/^\/api\/files\/([a-f0-9]+)$/);
  if (delMatch && method === "DELETE") return handleDelete(req, res, delMatch[1]);

  // Serve frontend
  const frontendDir = path.join(__dirname, "public");
  if (pathname === "/" || pathname === "/index.html") {
    return serveStatic(req, res, path.join(frontendDir, "index.html"));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`\n🚀  File Upload Server running at http://localhost:${PORT}`);
  console.log(`📁  Uploads stored in: ${UPLOAD_DIR}`);
  console.log(`📦  Max file size: ${formatSize(MAX_FILE_SIZE)}\n`);
});
