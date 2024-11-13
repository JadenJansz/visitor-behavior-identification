import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL;
// const socket = io(serverUrl);

const webSocket = new WebSocket("ws://localhost:3000");

export default function WebSocketComponent() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  //   useEffect(() => {
  //     socket.on("newMessage", (message) => {
  //       setMessages((prevMessages) => [...prevMessages, message]);
  //       if (message === "alert") {
  //         const audio = new Audio("/alert.mp3");
  //         audio.play();
  //       }
  //     });

  //     return () => {
  //       socket.off("newMessage");
  //     };
  //   }, []);

  useEffect(() => {
    webSocket.addEventListener("message", (event) => {
      const parsedMessage = JSON.parse(event.data);
      console.log("Message from server ", parsedMessage);
      setMessages((prevMessages) => [...prevMessages, parsedMessage.body]);
      if (parsedMessage.title === "Alert") {
        if (parsedMessage.body === "Banging Detected!") {
          const audio = new Audio("/bang.mp3");
          audio.play();
        } else if (parsedMessage.body === "Very loud noise detected!") {
          const audio = new Audio("/sound.mp3");
          audio.play();
        } else if (parsedMessage.body === "Visitor is Feeding!") {
          const audio = new Audio("/feed.mp3");
          audio.play();
        } else if (parsedMessage.body === "Intruder Alert!") {
          const audio = new Audio("/restricted.mp3");
          audio.play();
        } else {
          const audio = new Audio("/alert.mp3");
          audio.play();
        }
      }
    });
  }, []);

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );
      const response = await fetch(`${serverUrl}/vapidPublicKey`);
      const { publicKey } = await response.json();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch(`${serverUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
    }
  };

  return (
    <div className="p-4">
      {!isSubscribed && (
        <button
          onClick={subscribeToNotifications}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
          Subscribe to Notifications
        </button>
      )}
      <ul className="space-y-2">
        {messages.map((message, index) => (
          <li key={index} className="bg-gray-100 p-2 rounded">
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
}
