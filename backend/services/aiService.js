const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { retrieveFile } = require("./dbService");
const { Pinecone } = require("@pinecone-database/pinecone");
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY, // Correctly initializes Pinecone
});
const index = pinecone.index("pdf-embeddings-new", process.env.PINECONE_INDEX_HOST);


async function processUserQuestion(fileId, userQuestion, chatHistory) {
    console.log("Processing user question with file ID:", fileId);

    try {
        
        const file = await retrieveFile(fileId);
        if (!file) return "File not found.";
        
        // Generate query embedding
        const queryEmbeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: userQuestion,
        });

        const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

        // Search for relevant content in Pinecone
        const results = await index.query({
            vector: queryEmbedding,
            topK: 4,
            includeMetadata: true,
            filter: { fileId }
        });

        // Extract matched content
        const matchedPages = results.matches.map((match) => match.metadata.text);
        console.log("these are the matched pages from vector store", matchedPages);
        
        // Add system context with retrieved content
        chatHistory.push({
            role: "system",
            content: `Use the following document excerpts to provide a response: \n\n${matchedPages.join("\n\n")}`
        });

        // Limit chat history to prevent token overflow
        if(chatHistory.length > 5){
            chatHistory = chatHistory.slice(-5);
        }

        // Generate response using OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: chatHistory,  
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("AI error:", error);
        return "Error processing your request.";
    }
}

module.exports = { processUserQuestion };
