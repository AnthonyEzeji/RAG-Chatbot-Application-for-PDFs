const redis = require("redis");

const client = redis.createClient();

client.on("error", (err) => console.error("Redis Client Error:", err));

(async () => {
    await client.connect(); // ✅ Ensure Redis is connected before using it
})();

async function getChatHistory(userId) {
    if (!client.isOpen) await client.connect(); // ✅ Reconnect if closed
    const chatHistory = await client.get(`chatHistory:${userId}`);
    return chatHistory ? JSON.parse(chatHistory) : null;
}

async function storeChatHistory(userId, chatHistory) {
    if (!client.isOpen) await client.connect(); // ✅ Prevent closed client errors
    await client.set(`chatHistory:${userId}`, JSON.stringify(chatHistory), { EX: 86400 });
}

module.exports = { getChatHistory, storeChatHistory };

