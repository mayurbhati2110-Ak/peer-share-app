const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on("offer", (data) => socket.to(data.roomId).emit("offer", data.offer));
  socket.on("answer", (data) => socket.to(data.roomId).emit("answer", data.answer));
  socket.on("ice-candidate", (data) =>
    socket.to(data.roomId).emit("ice-candidate", data.candidate)
  );

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// ✅ Use Render's PORT variable (important!)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
