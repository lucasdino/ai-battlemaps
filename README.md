# 🏰 Dungeon Coder: AI-Powered 3D Battlemap Generation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)

> **Full-stack web application for real-time generation of custom 3D models and dungeons using state-of-the-art AI models**

## 📖 Overview

Dungeon Coder is a comprehensive web application that seamlessly integrates multiple cutting-edge AI technologies to generate custom 3D models and dungeons in real-time. Built for CS 252D: Advanced Computer Vision @ UCSD, this project demonstrates the power of combining modern generative AI with intuitive user interfaces.

![Dungeon Coder Interface](figs/Dungeon_Coder_Surfing_Prof.png)
*Primary Dungeon Coder interface for interacting with custom 3D models*

### 🎯 Key Features

- **🤖 AI-Powered 3D Asset Generation**: Convert text prompts and images into high-quality 3D models using TRELLIS
- **🏗️ Intelligent Dungeon Layout**: Procedural generation with LLM-driven asset placement
- **🎨 Real-time Image Editing**: GPT Image 1 integration for creative asset manipulation
- **🌐 Web-Based Interface**: Full-stack React + Three.js application with live previews
- **⚡ Fast Performance**: Sub-minute end-to-end generation with optimized rendering

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Engine      │
│  (React +       │◄──►│  (Node.js +     │◄──►│  (Python +      │
│   Three.js)     │    │   Express)      │    │   Flask)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  3D Rendering   │    │  Asset Storage  │    │  AI Models      │
│   & Controls    │    │  & Management   │    │  & Processing   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.8 or higher)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/WeiHanTu/ai-battlemaps.git
   cd ai-battlemaps
   ```

2. **Set up the Backend**
   ```bash
   cd website/backend
   npm install
   ```

3. **Set up the Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up the Layout Generation Engine**
   ```bash
   cd ../../engine/layoutgen
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd website/backend
   node server.js
   ```
   The backend will run on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   cd website/frontend
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`

3. **Start the Layout Generation Engine**
   ```bash
   cd engine/layoutgen
   source venv/bin/activate
   python app.py
   ```
   The layout engine will run on `http://localhost:3000`

## 🎮 Usage Guide

### 3D Asset Generation

1. **Text-to-3D**: Enter a text prompt to generate concept art, then convert to 3D
2. **Image Upload**: Upload existing images for 3D conversion
3. **Image Editing**: Use GPT Image 1 to modify and combine existing assets
4. **Asset Combination**: Merge multiple assets using AI-powered editing

![Asset Generation Methods](figs/CSE_252D_Project_Asset.png)
*Different methods of image generation allow for asset combination and creative control*

### Dungeon Creation

1. **Manual Placement**: Upload terrain images and place assets on a grid-based plane
2. **AI-Generated Dungeons**: Use the automated pipeline for complete dungeon generation
   - Set dungeon parameters (rooms, layout type, scale)
   - Provide a thematic prompt
   - Let the AI generate and place assets automatically

![Dungeon Generation Pipeline](figs/Dungeon_Generation_Pipeline__1_.png)
*Dungeon Coder dungeon generation pipeline that combines procedural generation with a custom agential system*

![Edit Plane Asset](figs/Edit_Plane_Asset_Image_CSE_252D_Project.png)
*Uploading an image as your terrain creates a playable board with grid-based placement and editing*

### Interactive Features

- **Real-time 3D Preview**: View assets and dungeons in an interactive 3D environment
- **Asset Manipulation**: Resize, rotate, and move assets on the playing board
- **Grid-based Placement**: Precise positioning for tactical gameplay
- **Undo/Redo**: Full control over your creative process

## 🔧 Technical Stack

### Frontend
- **React 19** - Modern UI framework
- **Three.js** - 3D graphics and rendering
- **React Three Fiber** - React integration for Three.js
- **Vite** - Fast build tool and dev server

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **Sharp** - Image processing
- **Puppeteer** - Screenshot generation

### AI Engine
- **TRELLIS** - 3D asset generation from images
- **GPT Image 1** - Image editing and manipulation
- **Google Imagen 4** - Text-to-image generation
- **Claude 4 Sonnet** - LLM-driven asset placement
- **Flask** - Python web framework for AI services

### 3D Processing
- **Draco3D** - 3D mesh compression
- **Meshopt** - Mesh optimization
- **Three.js GLTF** - 3D format handling

## 📊 Performance Metrics

- **3D Asset Generation**: ~20 seconds per asset (TRELLIS on L40S GPU)
- **Dungeon Generation**: ~1 minute end-to-end
- **Asset Placement**: ~20 seconds (Claude 4 Sonnet)
- **Real-time Rendering**: 60 FPS target with LOD optimization

## 🎨 Key Innovations

### 1. Seamless AI Integration
- **Multi-modal Pipeline**: Text → Image → 3D → Scene
- **Real-time Processing**: Sub-minute generation times
- **Creative Control**: High steerability across all generation stages

### 2. Intelligent Asset Placement
- **LLM-Driven Selection**: Semantic asset choice based on room descriptions
- **Procedural Layout**: Polyomino-based dungeon generation
- **Consistency Enforcement**: Thematic and stylistic uniformity across rooms

### 3. User Experience
- **Intuitive Interface**: Complex AI workflows hidden behind simple UI
- **Live Previews**: Real-time 3D rendering with immediate feedback
- **Interactive Editing**: Full control over asset placement and manipulation

## 📈 Results & Examples

### Generated Assets
![Default Assets](figs/CSE_252D_Project_Assets__1_.png)
*Examples of assets generated using the Dungeon Coder application that are used in the dungeon generator pipeline*

### Rendered Scenes
![Rendered Scene](figs/CSE_252D_Project_Render.png)
*Rendered scene designed with the automated dungeon generator pipeline*

### Asset Placement Results
![Asset Placement](figs/3x3_Grid_CSE_252D_Project.png)
*Asset placement examples across LLM families. Each cell shows model output for one room*

### Layout Generation
![Layout Generation Screen](figs/CSE_252D_Project_Layout_Gen_Screen.png)
*Layout Generation Screen with example generated layout*

### Error Analysis
![TRELLIS Errors](figs/Visual_Bug_Trellis_Blacksmith_Table.png)
*Examples of 3D reconstruction artifacts arising from SLAT's sparse voxel encoding*

## 📁 Project Structure

```
ai-battlemaps/
├── website/                 # Full-stack web application
│   ├── backend/            # Node.js server
│   │   ├── assets/         # 3D models and textures
│   │   ├── routes/         # API endpoints
│   │   └── server.js       # Express server
│   └── frontend/           # React SPA
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom React hooks
│       │   └── utils/      # Utility functions
│       └── public/         # Static assets
├── engine/                 # AI and processing engines
│   ├── layoutgen/          # Dungeon layout generation
│   ├── controlnet/         # Image conditioning
│   ├── scene_generator/    # 3D scene synthesis
│   └── image_scene_synthesis/ # Image-to-scene pipeline
├── figs/                   # Project documentation images
└── README.md              # This file
```

## 🔬 Research Contributions

This project demonstrates several key innovations in AI-driven content creation:

1. **Multi-stage AI Pipeline**: Seamless integration of text-to-image, image-to-3D, and scene synthesis
2. **Real-time Generation**: Optimized for interactive use with sub-minute generation times
3. **Creative Control**: High steerability while maintaining generation quality
4. **Web Accessibility**: Bringing cutting-edge AI to browser-based applications

## 📚 Documentation

- **Project Report**: `CSE_252D_Project_report.pdf` (excluded from repo)
- **Presentation Slides**: `DungeonCoder_slides.pdf`
- **API Documentation**: Available in `/website/backend/routes/`
- **Component Documentation**: Available in `/website/frontend/src/components/`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- **Lucas Dionisopoulos** - Custom TRELLIS Docker container, Flask API, full-stack web application, default asset library, agentic LLM backend
- **Matthew O'Malley-Nichols** - Layout generation Flask server, image scene synthesis, terrain generation, frontend/backend components
- **Ryosuke Matsuzawa** - 3D map asset placement API, perspective conversion, Blender geometry node studies
- **Wei-Han Tu** - Asset drag movement, 3D map asset component library, related work comparison

## 🙏 Acknowledgments

- **TRELLIS Team** - For the 3D asset generation technology
- **OpenAI** - For GPT Image 1 integration
- **Google** - For Imagen 4 text-to-image capabilities
- **Anthropic** - For Claude 4 Sonnet LLM capabilities
- **Three.js Community** - For the excellent 3D web framework

## 📞 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/WeiHanTu/ai-battlemaps/issues)
- **Live Demo**: [tinyurl.com/dungeoncoder](https://tinyurl.com/dungeoncoder)

---

**Built with ❤️ for CS 252D: Advanced Computer Vision @ UCSD**

*This project showcases the transformative power of modern AI in creative applications, bringing cutting-edge computer vision research to practical, user-friendly web applications.*
