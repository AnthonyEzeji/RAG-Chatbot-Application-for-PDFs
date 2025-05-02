const {Server}= require("socket.io");
const { processUserQuestion } = require("./services/aiService");
const { storeChatHistory, getChatHistory } = require("./services/chatHistoryService"); // ✅ New chat history module

function setupSocket(server) {
  console.log(1)
    const io = new Server(server,{path:"/socket.io/",cors:{origin:"*"}});
    io.on("connection", async(socket) => {
        
        const userId = socket.handshake.query?.userId;
        console.log("User connected:", socket.id);
          // ✅ Fetch chat history from session storage
    const chatHistory = await getChatHistory(userId);
    if (chatHistory) {
        socket.emit("loadChatHistory", chatHistory); // ✅ Send history to frontend
    }
        socket.on("askQuestion", async (data) => {
            try {
                const { userId, fileId, userQuestion } = data;

                // ✅ Retrieve user's past conversation
                let chatHistory = await getChatHistory(userId);

                if (!chatHistory) {
                    chatHistory = [{ role: "system", content: "You are an assistant answering questions using provided context." }];
                }

                // Add user's new question to chat history
                chatHistory.push({ role: "user", content: userQuestion });

                // ✅ Get AI response (keeping conversation history)
                const answer = await processUserQuestion(fileId, userQuestion, chatHistory);

                // ✅ Store bot response in chat history
                chatHistory.push({ role: "assistant", content: answer });

                // ✅ Save updated chat history in database or memory
                await storeChatHistory(userId, chatHistory);

                // ✅ Send answer to user via WebSockets
                socket.emit("botReply", { question: userQuestion, answer });

            } catch (error) {
                console.error("Socket error:", error);
                socket.emit("botReply", { error: "Internal server error" });
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
}

module.exports = setupSocket;
