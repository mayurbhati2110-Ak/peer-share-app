const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// 💡 keepalive & CORS fix for Render
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {}; // Track connections per room

io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    const clients = rooms[roomId] || [];

    if (clients.length >= 2) {
      socket.emit("room-full");
      return;
    }

    clients.push(socket.id);
    rooms[roomId] = clients;
    socket.join(roomId);
    console.log(`👤 ${socket.id} joined ${roomId}`);

    // Notify only the *other* peer that someone joined
    if (clients.length === 2) {
      io.to(clients[0]).emit("ready");
      io.to(clients[1]).emit("ready");
    }
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", { offer: data.offer });
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", { answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
