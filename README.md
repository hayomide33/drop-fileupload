# Drop — Simple File Upload App

A clean file upload website with a Node.js backend and a polished HTML frontend.
**Zero external dependencies** — runs on any machine with Node.js installed.

---

## Project structure

```
fileupload/
├── backend/
│   └── server.js        ← Node.js HTTP server (built-ins only)
├── frontend/
│   └── index.html       ← Single-file frontend (HTML + CSS + JS)
└── README.md
```

---

## Setup & run

### 1. Start the backend

```bash
cd backend
node server.js
```

The server starts on **http://localhost:3000** and creates an `uploads/` folder automatically.

### 2. Open the frontend

Option A — served by the backend:
Visit **http://localhost:3000** in your browser.

Option B — open directly:
Open `frontend/index.html` in your browser (works for most browsers, though CORS must be allowed).

---

## API reference

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/upload`                   | Upload one or more files |
| GET    | `/api/files`                    | List all uploaded files  |
| GET    | `/api/files/:id/download`       | Download a file by ID    |
| DELETE | `/api/files/:id`                | Delete a file by ID      |

### Upload example (curl)

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/your/file.pdf"
```

### Response format

```json
{
  "success": true,
  "files": [
    {
      "id": "a1b2c3d4e5f6a7b8",
      "originalName": "report.pdf",
      "size": 204800,
      "sizeFormatted": "200.0 KB",
      "mimetype": "application/pdf",
      "uploadedAt": "2026-06-19T12:00:00.000Z"
    }
  ]
}
```

---

## Configuration

Edit the constants at the top of `backend/server.js`:

| Variable        | Default | Description               |
|-----------------|---------|---------------------------|
| `PORT`          | `3000`  | Server port               |
| `MAX_FILE_SIZE` | `50 MB` | Maximum upload size       |
| `UPLOAD_DIR`    | `./uploads` | Where files are stored |

---

## Features

- Drag-and-drop or click-to-browse file selection
- Multi-file upload with a pending queue
- Upload progress bar (real-time XHR progress)
- Download and delete uploaded files
- Live server status indicator
- 50 MB file size limit with validation
- No external packages required
