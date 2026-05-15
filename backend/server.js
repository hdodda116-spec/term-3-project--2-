const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const setupSocket = require("./src/socket/socket");
const PORT = 5000;
// Create HTTP server
const server = http.createServer(app);
// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Initialize socket logic
setupSocket(io);
// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});