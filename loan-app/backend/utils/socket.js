let io;

module.exports = {
  init: (server) => {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const normalizedOrigin = origin.replace(/\/$/, "");
          const isLocalhost = normalizedOrigin.includes("localhost:") || normalizedOrigin.includes("127.0.0.1:");
          
          const allowed = process.env.FRONTEND_URL 
            ? process.env.FRONTEND_URL.split(",").map(o => o.trim().replace(/\/$/, "")) 
            : ["http://localhost:3000"];
            
          if (allowed.includes(normalizedOrigin) || isLocalhost) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join", (userId) => {
        if (userId) {
          socket.join(userId.toString());
          console.log(`User ${userId} joined their notification room`);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
