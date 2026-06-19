# Drop — File Upload App

A clean, simple file upload website. Upload files, share them, download them anytime.

🌐 **Live at:** [https://drop-fileupload.onrender.com](https://drop-fileupload.onrender.com)

---

## How to use

1. Go to [https://drop-fileupload.onrender.com](https://drop-fileupload.onrender.com)
2. Drag and drop files onto the page, or click to browse
3. Click **Upload files**
4. Download or delete your files anytime from the list below

Max file size: **50 MB**

---

## Features

- Drag-and-drop or click-to-browse file selection
- Upload multiple files at once
- Real-time upload progress bar
- Download and delete uploaded files
- Works on any device

---

## Tech stack

- **Backend:** Node.js (no external dependencies)
- **Frontend:** Plain HTML, CSS, JavaScript
- **Hosting:** Render.com

---

## Project structure

```
├── backend/
│   ├── server.js        ← Node.js HTTP server
│   └── public/
│       └── index.html   ← Frontend served by backend
├── frontend/
│   └── index.html       ← Source frontend file
└── README.md
```

---

## API reference

| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| POST   | `/api/upload`               | Upload one or more files |
| GET    | `/api/files`                | List all uploaded files  |
| GET    | `/api/files/:id/download`   | Download a file by ID    |
| DELETE | `/api/files/:id`            | Delete a file by ID      |