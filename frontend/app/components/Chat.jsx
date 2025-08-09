"use client"
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { ClipLoader } from "react-spinners";

export default function Chat({selectedFileId}) {
    const [chatLog, setChatLog] = useState([]);
    const [message, setMessage] = useState("");
    const [socket, setSocket] = useState(null);
    const [token, setToken] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("disconnected");
    const chatEndRef = useRef(null);
    
    console.log('Selected file ID:', selectedFileId);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setToken(localStorage.getItem("token"));
            setUserData(localStorage.getItem("user"));
        }
    }, []);
 
    const userId = userData ? JSON.parse(userData)._id : null;

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog]);

    useEffect(() => {
        if (!userId || !token) return; 

        const newSocket = io("http://localhost:5050", {
            auth: {
                token: token
            }
        });
        
        newSocket.on('connect', () => {
            console.log('Connected to server with authentication');
            setConnectionStatus("connected");
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection failed:', error.message);
            setConnectionStatus("error");
            if (error.message.includes('Authentication error')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setConnectionStatus("disconnected");
        });
        
        setSocket(newSocket);

        newSocket.on("loadChatHistory", (history) => {
            const formattedHistory = history
                .filter(msg => msg.role !== 'system') // Filter out system messages from display
                .map(({ role, content }) => ({ 
                    sender: role === "user" ? "You" : "Bot", 
                    text: content 
                }));
            setChatLog(formattedHistory);
        });

        newSocket.on("botReply", (data) => {
            setIsLoading(false);
            if (data.error) {
                setChatLog((prev) => [...prev, { 
                    sender: "Bot", 
                    text: `Error: ${data.error}`,
                    isError: true 
                }]);
            } else {
                setChatLog((prev) => [...prev, { sender: "Bot", text: data.answer }]);
            }
        });

        return () => {
            newSocket.disconnect();
            setConnectionStatus("disconnected");
        };  
    }, [userId, token]);

    const sendMessage = () => {
        if (!selectedFileId) {
            setChatLog(prev => [...prev, { 
                sender: "System", 
                text: "Please select a file first to ask questions about it.",
                isError: true 
            }]);
            return;
        }
        
        if (!message.trim()) return;
        
        if (!socket || connectionStatus !== "connected") {
            setChatLog(prev => [...prev, { 
                sender: "System", 
                text: "Not connected to server. Please refresh the page.",
                isError: true 
            }]);
            return;
        }

        setIsLoading(true);
        socket.emit("askQuestion", { fileId: selectedFileId, userQuestion: message });
        setChatLog((prev) => [...prev, { sender: "You", text: message }]);
        setMessage("");  
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case "connected": return "text-green-400";
            case "error": return "text-red-400";
            default: return "text-yellow-400";
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-lg mx-auto p-4 bg-gray-900 rounded-lg shadow-lg">
            {/* Connection Status */}
            <div className="w-full mb-2 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-300">Chat</h3>
                <div className={`text-xs ${getConnectionStatusColor()}`}>
                    ● {connectionStatus}
                </div>
            </div>

            {/* Selected File Indicator */}
            {selectedFileId && (
                <div className="w-full mb-2 p-2 bg-blue-900 rounded text-xs text-blue-200">
                    💬 Chatting about selected file
                </div>
            )}
         
            {/* Chat Messages */}
            <div className="w-full h-80 overflow-y-auto p-3 bg-gray-800 rounded-lg shadow-md">
                {chatLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-center">
                        <div>
                            <p>💭 No messages yet</p>
                            <p className="text-xs mt-1">Select a file and start asking questions!</p>
                        </div>
                    </div>
                ) : (
                    chatLog.map((msg, i) => (
                        <div key={i} className={`mb-3 ${msg.sender === "You" ? "text-right" : "text-left"}`}>
                            <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                                msg.sender === "You" 
                                    ? "bg-blue-500 text-white" 
                                    : msg.isError 
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-700 text-gray-300"
                            }`}>
                                <div className="font-semibold text-xs mb-1">{msg.sender}</div>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        </div>
                    ))
                )}
                
                {/* Loading indicator */}
                {isLoading && (
                    <div className="text-left mb-3">
                        <div className="inline-block bg-gray-700 text-gray-300 p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <ClipLoader color="white" size={16} />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={chatEndRef} />
            </div>
        
            {/* Message Input */}
            <div className="w-full flex items-center mt-4 space-x-3">
                <input
                    className="flex-1 px-4 py-2 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedFileId ? "Ask a question about the file..." : "Select a file first"}
                    disabled={!selectedFileId || connectionStatus !== "connected"}
                />
                <button
                    onClick={sendMessage}
                    disabled={!message.trim() || !selectedFileId || connectionStatus !== "connected" || isLoading}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <ClipLoader color="white" size={16} /> : "Send 🚀"}
                </button>
            </div>
        </div>
    );
}
