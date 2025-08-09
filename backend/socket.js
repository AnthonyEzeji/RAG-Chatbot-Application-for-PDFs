const {Server}= require("socket.io");
const { processUserQuestion } = require("./services/aiService");
const { storeChatHistory, getChatHistory } = require("./services/chatHistoryService");
const jwt = require("jsonwebtoken");

function setupSocket(server) {
    console.log("Setting up Socket.IO server");
    
    const io = new Server(server, {
        path: "/socket.io/",
        cors: {
            origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // Restrict to frontend origins
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Authentication middleware for socket connections
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            socket.userId = decoded.userId; // Store authenticated user ID
            next();
        } catch (err) {
            console.error('Socket authentication error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });
    
    io.on("connection", async(socket) => {
        const userId = socket.userId; // Use authenticated user ID
        console.log("Authenticated user connected:", socket.id, "User ID:", userId);
          
        // Load user's chat history
        try {
            const chatHistory = await getChatHistory(userId);
            if (chatHistory) {
                socket.emit("loadChatHistory", chatHistory);  
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
        }

        socket.on("askQuestion", async (data) => {
            try {
                const { fileId, userQuestion } = data;
                
                // Validate input
                if (!fileId || !userQuestion || !userQuestion.trim()) {
                    socket.emit("botReply", { error: "Invalid request: fileId and userQuestion are required" });
                    return;
                }

                // Use authenticated userId instead of trusting client data
                const authenticatedUserId = socket.userId;

                // Retrieve user's past conversation
                let chatHistory = await getChatHistory(authenticatedUserId);

                if (!chatHistory) {
                    chatHistory = [{ role: "system", content: "You are an assistant answering questions using provided context." }];
                }

                // Add user question to chat history
                chatHistory.push({ role: "user", content: userQuestion });

                // Process question and get AI response
                const answer = await processUserQuestion(fileId, userQuestion, chatHistory);

                // Add AI response to chat history
                chatHistory.push({ role: "assistant", content: answer });

                // Store updated chat history
                await storeChatHistory(authenticatedUserId, chatHistory);

                // Send response to client
                socket.emit("botReply", { question: userQuestion, answer });

            } catch (error) {
                console.error("Socket error:", error);
                socket.emit("botReply", { error: "Internal server error" });
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id, "User ID:", userId);
        });
    });

    return io;
}

module.exports = setupSocket;
