const MOCK_USERS = {
  'alice': 'password123',
  'bob': 'password123',
  'charlie': 'password123'
};
const onlineUsers = new Map();
const userSockets = new Map();
const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    // Join with credentials
    socket.on("join", (credentials) => {
      const { username, password } = credentials;

      if (!username || !password || MOCK_USERS[username.toLowerCase()] !== password) {
        socket.emit("login_error", "Invalid username or password");
        return;
      }
      onlineUsers.set(socket.id, username);
      userSockets.set(username, socket.id);
      socket.emit("login_success", username);
      console.log(`${username} joined.`);
      // Broadcast updated user list to everyone
      io.emit("online_users", Array.from(onlineUsers.values()));
      // Notify others
      socket.broadcast.emit("user_joined", username);
    });
    // Send private message
    socket.on("private_message", (data) => {
      // data: { sender: 'username', receiver: 'username', text: 'message', timestamp: '...' }
      console.log("Private message received:", data);
      
      const receiverSocketId = userSockets.get(data.receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_private_message", data);
      }
    });
    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const username = onlineUsers.get(socket.id);
      if (username) {
        onlineUsers.delete(socket.id);
        userSockets.delete(username);
        io.emit("online_users", Array.from(onlineUsers.values()));
        socket.broadcast.emit("user_left", username);
      }
    });
  });
};
module.exports = setupSocket;