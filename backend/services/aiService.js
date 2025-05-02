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
        // ✅ Retrieve file
        const file = await retrieveFile(fileId);
        if (!file) return "File not found.";
        const pages = file.metadata.extractedText;
        const pageEmbeddings = file.embeddings;
        
console.log("these are the pages of the request doc", pages)
for (let i = 0; i < pageEmbeddings.length; i++) {
    await index.update({
        id: `page_${i}`, // ✅ Each vector must be updated individually
        values: pageEmbeddings[i], // ✅ Ensure this is an array of numbers
        metadata: { text: pages[i],fileId, category: "document" }
    });
}


        // ✅ Get query embedding from OpenAI
        const queryEmbeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: userQuestion,
        });

        const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

        // ✅ Query Pinecone for best-matching pages
        const results = await index.query({
            vector: queryEmbedding,
            topK: 4,
            includeMetadata: true,
            filter: { fileId }
        });

        // ✅ Extract matched page text
        const matchedPages = results.matches.map((match) => match.metadata.text);
        console.log("these are the matched pages form vector store",matchedPages)
        // ✅ Integrate matched page content into chat history
        chatHistory.push({
            role: "system",
            content: `Use the following document excerpts to provide a response: \n\n${matchedPages.join("\n\n")}`
        });

        chatHistory.push({ role: "user", content: userQuestion });
        if(chatHistory.length>5){
            chatHistory = chatHistory.slice(-5);
        }


        // ✅ Query AI with updated context
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: chatHistory, // ✅ Includes full conversation and matched pages
            
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("AI error:", error);
        return "Error processing your request.";
    }
}

module.exports = { processUserQuestion };
