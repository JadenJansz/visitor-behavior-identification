const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const webpush = require("web-push");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

webpush.setVapidDetails(
  "https://weatherlk.onrender.com/",
  process.env.WEB_PUSH_PUBLIC_KEY,
  process.env.WEB_PUSH_PRIVATE_KEY
);

let subscriptions = [];

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({});
});

app.post("/message", (req, res) => {
  const { message } = req.body;
  io.emit("newMessage", message);

  // Send push notification to all subscribed clients
  subscriptions.forEach((subscription) => {
    webpush
      .sendNotification(
        subscription,
        JSON.stringify({
          title: "New Message",
          body: message,
        })
      )
      .catch((error) => {
        console.error("Error sending push notification:", error);
      });
  });

  res.sendStatus(200);
});

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.get("/vapidPublicKey", (req, res) => {
  res.json({
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
