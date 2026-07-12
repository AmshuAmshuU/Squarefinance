const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const keepAlive = require("./utils/keepAlive");
const socketUtils = require("./utils/socket");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
socketUtils.init(server);

// Connect to Database then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start keep-alive ping
    keepAlive();
  });
});
