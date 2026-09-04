const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store rooms and their state
const rooms = new Map();

// Room structure:
// {
//   id: string,
//   name: string,
//   videoUrl: string,
//   isPlaying: boolean,
//   currentTime: number,
//   users: Map<socketId, userInfo>,
//   createdAt: Date
// }

// User structure:
// {
//   id: string,
//   name: string,
//   isHost: boolean,
//   socketId: string
// }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (data) => {
    const { roomId, userName } = data;
    
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomId);
    const isHost = room.users.size === 0;
    
    const user = {
      id: uuidv4(),
      name: userName,
      isHost,
      socketId: socket.id
    };

    room.users.set(socket.id, user);
    socket.join(roomId);

    // Send current room state to the new user
    socket.emit('room-joined', {
      room: {
        id: room.id,
        name: room.name,
        videoUrl: room.videoUrl,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime
      },
      user,
      users: Array.from(room.users.values())
    });

    // Notify other users in the room
    socket.to(roomId).emit('user-joined', {
      user,
      users: Array.from(room.users.values())
    });

    console.log(`User ${userName} joined room ${roomId}`);
  });

  // Create room
  socket.on('create-room', (data) => {
    const { roomName, userName, videoUrl } = data;
    const roomId = uuidv4();
    
    const room = {
      id: roomId,
      name: roomName,
      videoUrl: videoUrl || '',
      isPlaying: false,
      currentTime: 0,
      users: new Map(),
      createdAt: new Date()
    };

    rooms.set(roomId, room);

    const user = {
      id: uuidv4(),
      name: userName,
      isHost: true,
      socketId: socket.id
    };

    room.users.set(socket.id, user);
    socket.join(roomId);

    socket.emit('room-created', {
      room: {
        id: room.id,
        name: room.name,
        videoUrl: room.videoUrl,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime
      },
      user,
      users: Array.from(room.users.values())
    });

    console.log(`Room ${roomId} created by ${userName}`);
  });

  // Video control events
  socket.on('play', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      room.isPlaying = true;
      room.currentTime = currentTime;
      socket.to(roomId).emit('play', { currentTime });
    }
  });

  socket.on('pause', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      room.isPlaying = false;
      room.currentTime = currentTime;
      socket.to(roomId).emit('pause', { currentTime });
    }
  });

  socket.on('seek', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      room.currentTime = currentTime;
      socket.to(roomId).emit('seek', { currentTime });
    }
  });

  socket.on('change-video', (data) => {
    const { roomId, videoUrl } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      room.videoUrl = videoUrl;
      room.isPlaying = false;
      room.currentTime = 0;
      io.to(roomId).emit('video-changed', { videoUrl });
    }
  });

  // Chat events
  socket.on('send-message', (data) => {
    const { roomId, message, userName } = data;
    const messageData = {
      id: uuidv4(),
      userName,
      message,
      timestamp: new Date().toISOString()
    };
    
    io.to(roomId).emit('new-message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove user from rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        // If host left, assign new host
        if (user.isHost && room.users.size > 0) {
          const newHost = room.users.values().next().value;
          newHost.isHost = true;
        }
        
        // If room is empty, delete it
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // Notify remaining users
          socket.to(roomId).emit('user-left', {
            user,
            users: Array.from(room.users.values())
          });
        }
        
        break;
      }
    }
  });
});

// Get available rooms (for discovery)
app.get('/api/rooms', (req, res) => {
  const publicRooms = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    createdAt: room.createdAt
  }));
  
  res.json(publicRooms);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
