# ViewSync - Synchronized Multi-Video Viewer

A React-based web application that allows you to watch multiple YouTube videos simultaneously with synchronized playback controls. Features cross-window synchronization, master control system, and shareable video setups.

## 🎥 Features

- **Multi-Video Layout**: Display multiple YouTube videos in a responsive grid
- **Synchronized Playback**: Play, pause, and seek all videos simultaneously
- **Cross-Window Sync**: Open videos in separate windows with real-time synchronization
- **Master Control**: First video acts as master controller for all others
- **Loop Functionality**: Enable/disable looping for all videos
- **Time Synchronization**: Sync all videos to start (0:00) or to current time
- **Shareable URLs**: Generate links to share your synchronized video setup
- **Channel Browser**: Browse a YouTube channel and click videos to add them
- **Responsive Design**: Works on desktop and mobile devices
- **Quality Control**: Default 144p quality for better performance

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/viewsync.git
cd viewsync
```

2. **Install dependencies:**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. **Start the application:**
```bash
# Start backend server (port 5000)
npm run server

# In another terminal, start frontend (port 3000)
cd client
npm start
```

Or use the convenience scripts:
```bash
# Windows
install.bat
start.bat
```

## 📖 Usage

### Basic Usage
1. **Add Videos**: Enter YouTube URLs and click "Add Video"
2. **Browse a Channel**: Paste a YouTube channel URL such as `https://www.youtube.com/@channel` and click "Browse Channel". Click any result to add it.
3. **Synchronize**: Use the control bar at the bottom
   - **▶ Play All**: Start all videos simultaneously
   - **⏸ Pause All**: Pause all videos
   - **🔄 Loop**: Enable/disable looping
   - **⏮ Reset**: Reset all videos to start
   - **🔄 Sync**: Open videos in separate synchronized windows

### Advanced Features
- **Master Control**: The first video (marked with 👑) controls all others
- **Cross-Window Sync**: Click "Open All in Sync Windows" to open each video in a separate window
- **Time Sync**: Use "Sync to Start" or "Sync to Current Time" to align videos
- **Share**: Copy the URL to share your video setup with others

## 🏗️ Technical Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **YouTube Player API** for video playback control
- **BroadcastChannel API** for cross-window communication
- **localStorage fallback** for synchronization
- **Responsive CSS Grid** for multi-video layout

### Backend (Express.js)
- **Express.js** server for API endpoints
- **CORS enabled** for cross-origin requests
- **Static file serving** for production builds

### Key Components
- `App.tsx` - Main application logic and state management
- `YouTubePlayer.tsx` - YouTube Player API wrapper
- Cross-window synchronization system
- Master-slave video control pattern

## 🎯 Use Cases

- **Multi-angle viewing**: Watch events from different camera angles
- **Content comparison**: Compare original vs remix vs commentary
- **Educational content**: Language learners comparing different renditions
- **Reaction videos**: Show original content alongside reactions
- **Content creation**: Create synchronized multi-video experiences
- **Live streaming**: Synchronize multiple live streams

## 🌐 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## 📁 Project Structure

```
viewsyncboost/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── App.tsx        # Main application
│   │   ├── App.css        # Styles
│   │   ├── YouTubePlayer.tsx  # YouTube API wrapper
│   │   └── index.tsx      # Entry point
│   └── package.json       # Frontend dependencies
├── server/                # Express backend
│   └── index.js          # Server code
├── package.json          # Root dependencies
├── install.bat          # Windows install script
├── start.bat            # Windows start script
└── README.md            # This file
```

## 🔧 Development

### Available Scripts
```bash
# Root level
npm run server          # Start backend server
npm install            # Install root dependencies

# Client level
cd client
npm start              # Start React dev server
npm run build          # Build for production
npm test               # Run tests
```

### Environment Variables
- `PORT` - Backend server port (default: 5000)
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Test cross-window synchronization
- Ensure mobile responsiveness
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube Player API for video control capabilities
- React community for excellent documentation and tools
- BroadcastChannel API for cross-window communication

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/syedrazaalino/viewsync/issues) page
2. Create a new issue with detailed description
3. Include browser version and error messages

---

**Made with ❤️ for synchronized video viewing**