"use client"
import { useState, useEffect } from "react";
import io from "socket.io-client";

export default function Chat({selectedFileId}) {
    const [chatLog, setChatLog] = useState([]);
    const [message, setMessage] = useState("");
    const [socket, setSocket] = useState(null);
    console.log('this is the selected file id', selectedFileId)
 
    const [token, setToken] = useState(null);
    const [userData,setUserData] = useState(null)

    useEffect(() => {
        if (typeof window !== "undefined") {
            setToken(localStorage.getItem("token"));
            setUserData(localStorage.getItem("user"))
        }
    }, []);
 
    const userId = userData ? JSON.parse(userData)._id : null;

    useEffect(() => {
     
        if (!userId || !token) return; 

        const newSocket = io("http://localhost:5050", {
            auth: {
                token: token
            }
        });
        
        newSocket.on('connect', () => {
            console.log('Connected to server with authentication');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection failed:', error.message);
            if (error.message.includes('Authentication error')) {
                // Handle authentication failure - maybe redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            }
        });
        
        setSocket(newSocket);

         
        newSocket.on("loadChatHistory", (history) => {
            setChatLog(history.map(({ role, content }) => ({ sender: role === "user" ? "You" : "Bot", text: content })));
        });

        
        newSocket.on("botReply", (data) => {
            if (data.error) {
                setChatLog((prev) => [...prev, { sender: "Bot", text: `Error: ${data.error}` }]);
            } else {
                setChatLog((prev) => [...prev, { sender: "Bot", text: data.answer }]);
            }
        });

        return () => newSocket.disconnect();  
    }, [userId, token]);

    const sendMessage = () => {
        if(!selectedFileId){
            alert("Select a file please...")
            return
        }
        if (!message.trim() || !socket) return;  

        // Remove userId from the emit since it's now authenticated on the server
        socket.emit("askQuestion", { fileId: selectedFileId, userQuestion: message });

        
        setChatLog((prev) => [...prev, { sender: "You", text: message }]);

        setMessage("");  
    };

    return (
        <div className="flex flex-col items-center w-full max-w-lg mx-auto p-4 bg-gray-900 rounded-lg shadow-lg">
         
        <div className="w-full h-80 overflow-y-auto p-3 bg-gray-800 rounded-lg shadow-md">
            {chatLog.map((msg, i) => (
                <p key={i} className={`text-sm p-2 rounded-md mb-2 ${msg.sender === "You" ? "bg-blue-500 text-white self-end" : "bg-gray-700 text-gray-300 self-start"}`}>
                    <b>{msg.sender}:</b> {msg.text}
                </p>
            ))}
        </div>
    
        
        <div className="w-full flex items-center mt-4 space-x-3">
            <input
                className="flex-1 px-4 py-2 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
            />
            <button
                onClick={sendMessage}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                Send 🚀
            </button>
        </div>
    </div>
    
    );
}
