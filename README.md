# Generative DnD Battlemaps

This is a project for CS 252D: Advanced Computer Vision @ UCSD. It's a web application that allows users to generate and manage 3D models for Dungeons & Dragons battle maps.

oh, btw we'll be totally abusing AI coding tools to assist with building the UI. The more interesting challenge will be building the agentic pipeline, systems, and backend :)

## Project Structure

```
├── backend/               # Node.js server
│   ├── assets/            # Default 3D models
│   ├── uploads/           # User uploaded models
│   └── server.js          # Express server implementation
│
└── frontend/              # React SPA
    ├── public/            # Static assets
    └── src/
        ├── components/    # React components
        │   ├── ModelViewer.jsx           # 3D model viewer component
        │   ├── ThumbnailRenderer.jsx     # Thumbnail generator for 3D models
        │   └── ViewAssets.jsx            # Asset management UI
        ├── theme.js       # UI theme configuration
        └── App.jsx        # Main application component
```

## Getting Started

To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ai-battlemaps
   ```

2. **Set up the Backend:**
   ```bash
   cd backend
   npm install
   ```

3. **Set up the Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the Application:**
   * **Start the Backend:**
     ```bash
     cd ../backend
     node server.js
     ```
     (The backend will run on http://localhost:3001)
   * **Start the Frontend (in a separate terminal):**
     ```bash
     cd ../frontend
     npm run dev
     ```
     (The frontend will be accessible at the URL provided by Vite, usually http://localhost:5173)