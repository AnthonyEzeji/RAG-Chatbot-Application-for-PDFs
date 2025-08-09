const redis = require("redis");

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});

client.on("error", (err) => console.error("Redis Client Error:", err));
client.on("connect", () => console.log("Connected to Redis"));
client.on("disconnect", () => console.log("Disconnected from Redis"));

// Initialize Redis connection
(async () => {
    try {
        await client.connect();
        console.log("Redis connection established successfully");
    } catch (err) {
        console.error("Failed to connect to Redis:", err);
    }
})();

async function getChatHistory(userId) {
    try {
        if (!client.isOpen) {
            console.log("Redis not connected, attempting to reconnect...");
            await client.connect();
        }
        
        if (!userId) {
            throw new Error("User ID is required");
        }
        
        const chatHistory = await client.get(`chatHistory:${userId}`);
        return chatHistory ? JSON.parse(chatHistory) : null;
    } catch (error) {
        console.error("Error getting chat history:", error);
        return null; // Return null instead of throwing to prevent app crashes
    }
}

async function storeChatHistory(userId, chatHistory) {
    try {
        if (!client.isOpen) {
            console.log("Redis not connected, attempting to reconnect...");
            await client.connect();
        }
        
        if (!userId || !chatHistory) {
            throw new Error("User ID and chat history are required");
        }
        
        // Store for 24 hours
        await client.set(`chatHistory:${userId}`, JSON.stringify(chatHistory), { EX: 86400 });
        console.log(`Chat history stored for user: ${userId}`);
    } catch (error) {
        console.error("Error storing chat history:", error);
        // Don't throw - just log the error to prevent app crashes
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    if (client.isOpen) {
        await client.quit();
    }
});

module.exports = { getChatHistory, storeChatHistory };

