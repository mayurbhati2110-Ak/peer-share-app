const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// keepalive & CORS (helps on Render)
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {}; // { roomId: [socketId,...] }

io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    const clients = rooms[roomId] || [];

    // Prevent duplicate entries for the same socket
    if (!clients.includes(socket.id)) {
      // If room full (2) then reject
      if (clients.length >= 2) {
        socket.emit("room-full");
        console.log(`❌ ${socket.id} denied join ${roomId} (full)`);
        return;
      }
      clients.push(socket.id);
      rooms[roomId] = clients;
      socket.join(roomId);
      console.log(`👤 ${socket.id} joined ${roomId}`);
    } else {
      // Already in room (reconnect) - re-join socket to room
      socket.join(roomId);
      console.log(`🔁 ${socket.id} re-joined ${roomId}`);
    }

    // Notify participants about room state
    const updated = rooms[roomId] || [];
    io.to(roomId).emit("room-update", { clients: updated });

    // When there are two users, emit ready to both
    if (updated.length === 2) {
      io.to(roomId).emit("ready");
    }
  });

  socket.on("offer", (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit("offer", { offer: data.offer, from: socket.id });
  });

  socket.on("answer", (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit("answer", { answer: data.answer, from: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    // Remove from rooms
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      else io.to(roomId).emit("room-update", { clients: rooms[roomId] });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
