"use client"
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Send, MessageCircle, AlertCircle, Wifi, WifiOff, User, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
                .filter(msg => msg.role !== 'system')
                .map(({ role, content }) => ({ 
                    sender: role === "user" ? "user" : "assistant", 
                    text: content,
                    timestamp: new Date()
                }));
            setChatLog(formattedHistory);
        });

        newSocket.on("botReply", (data) => {
            setIsLoading(false);
            if (data.error) {
                setChatLog((prev) => [...prev, { 
                    sender: "system", 
                    text: data.error,
                    isError: true,
                    timestamp: new Date()
                }]);
            } else {
                setChatLog((prev) => [...prev, { 
                    sender: "assistant", 
                    text: data.answer,
                    timestamp: new Date()
                }]);
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
                sender: "system", 
                text: "Please select a document first to ask questions about it.",
                isError: true,
                timestamp: new Date()
            }]);
            return;
        }
        
        if (!message.trim()) return;
        
        if (!socket || connectionStatus !== "connected") {
            setChatLog(prev => [...prev, { 
                sender: "system", 
                text: "Not connected to server. Please refresh the page.",
                isError: true,
                timestamp: new Date()
            }]);
            return;
        }

        setIsLoading(true);
        socket.emit("askQuestion", { fileId: selectedFileId, userQuestion: message });
        setChatLog((prev) => [...prev, { 
            sender: "user", 
            text: message,
            timestamp: new Date()
        }]);
        setMessage("");  
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getConnectionIcon = () => {
        switch (connectionStatus) {
            case "connected": return <Wifi className="h-4 w-4 text-green-500" />;
            case "error": return <WifiOff className="h-4 w-4 text-red-500" />;
            default: return <WifiOff className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getConnectionText = () => {
        switch (connectionStatus) {
            case "connected": return "Connected";
            case "error": return "Connection Error";
            default: return "Connecting...";
        }
    };

    const renderMessage = (msg, index) => {
        const isUser = msg.sender === "user";
        const isSystem = msg.sender === "system";
        const isAssistant = msg.sender === "assistant";

        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={`text-xs ${
                            isUser ? 'bg-primary text-primary-foreground' : 
                            isSystem ? 'bg-muted text-muted-foreground' :
                            'bg-secondary text-secondary-foreground'
                        }`}>
                            {isUser ? <User className="h-4 w-4" /> : 
                             isSystem ? <AlertCircle className="h-4 w-4" /> :
                             <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className={`rounded-lg px-4 py-2 ${
                        isUser ? 'bg-primary text-primary-foreground ml-2' :
                        isSystem && msg.isError ? 'bg-destructive/10 text-destructive border border-destructive/20 mr-2' :
                        'bg-muted text-muted-foreground mr-2'
                    }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.timestamp && (
                            <p className="text-xs opacity-70 mt-1">
                                {msg.timestamp.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageCircle className="h-5 w-5" />
                            <span>Chat Assistant</span>
                        </CardTitle>
                        <CardDescription>
                            {selectedFileId ? "Ask questions about your selected document" : "Select a document to start chatting"}
                        </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        {getConnectionIcon()}
                        <Badge variant={connectionStatus === "connected" ? "default" : "secondary"} className="text-xs">
                            {getConnectionText()}
                        </Badge>
                    </div>
                </div>
                <Separator />
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                    {chatLog.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center">
                            <div className="space-y-4">
                                <div className="bg-muted rounded-full p-4 mx-auto w-fit">
                                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg">Start a conversation</h3>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        {selectedFileId 
                                            ? "Ask me anything about your document!"
                                            : "Select a document from the sidebar to begin chatting."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chatLog.map((msg, i) => renderMessage(msg, i))}
                            
                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start mb-4">
                                    <div className="flex items-start space-x-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                                                <Bot className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="bg-muted rounded-lg px-4 py-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-pulse flex space-x-1">
                                                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                </div>
                                                <span className="text-sm text-muted-foreground">Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-muted/5">
                    <div className="flex space-x-2">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={selectedFileId ? "Ask a question about the document..." : "Select a document first"}
                            disabled={!selectedFileId || connectionStatus !== "connected"}
                            className="flex-1"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!message.trim() || !selectedFileId || connectionStatus !== "connected" || isLoading}
                            size="icon"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    
                    {!selectedFileId && (
                        <Alert className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please select a document from the sidebar to start asking questions.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
