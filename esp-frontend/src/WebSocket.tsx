import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";

const socket = io('http://localhost:3000');

export default function WebSocketComponent() {
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        socket.on('newMessage', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
            if(message === "alert") {
                const audio = new Audio('/alert.mp3');
                audio.play();
            }
        });

        return () => {
            socket.off('newMessage');
        };
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">ESP32 Messages</h1>
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