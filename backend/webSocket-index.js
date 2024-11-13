const WebSocket = require("./node_modules/ws");
const express = require("express");
const http = require("http");
const cors = require("cors");
const webpush = require("web-push");
const dotenv = require("dotenv");
dotenv.config();

// Create an Express application
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
  broadcastMessage(message);

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

// Set up WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Listen for messages from clients
  ws.on("message", (message) => {
    // Convert the message from Buffer to string
    const receivedMessage = message.toString();
    console.log("Received:", receivedMessage);

    broadcastMessage(receivedMessage);

    subscriptions.forEach((subscription) => {
      webpush
        .sendNotification(
          subscription,
          JSON.stringify({
            title: "Alert",
            body: receivedMessage,
          })
        )
        .catch((error) => {
          console.error("Error sending push notification:", error);
        });
    });
  });

  // Optionally send a welcome message
  // ws.send("Welcome to the WebSocket server");
});

function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          title: "Alert",
          body: message,
        })
      );
    }
  });
}

app.get("/vapidPublicKey", (req, res) => {
  res.json({
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
  });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
