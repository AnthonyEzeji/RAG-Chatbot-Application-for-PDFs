const express = require('express')

const router = express.Router()


const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fileModel = require("../models/File")

const { Pinecone } = require("@pinecone-database/pinecone");




const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY, // Correctly initializes Pinecone
});

async function checkIndexConfig() {
    const indexInfo = await pinecone.describeIndex("pdf-embeddings-new");
    console.log(JSON.stringify(indexInfo, null, 2));
}

checkIndexConfig();

 const index = pinecone.index("pdf-embeddings-new", process.env.PINECONE_INDEX_HOST);
router.post("/:fileId", async (req, res) => {
    try {
        console.log("Processing request...");
         // Initialize chat history if empty
         if (!req.session.chatHistory) req.session.chatHistory = [
            { role: "system", content: "You are an assistant answering questions using provided context." }
        ];

        // Add the user's question to the history
        req.session.chatHistory.push({ role: "user", content: req.body.userQuestion });
        const fileId = req.params.fileId;
        const file = await fileModel.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        const pages = file.metadata.extractedText;
        const pageEmbeddings = file.embeddings;

        // ✅ Store embeddings in Pinecone using `upsertRecords()`
        await index.upsert(
             pageEmbeddings.map((embedding, i) => ({
                id: `page_${i}`,
                values: embedding, // Ensure this is a numerical array
                metadata: { text: pages[i], category: "document" }
            }))
        );
        

        // ✅ Convert user question into an embedding for search
        const queryEmbeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: req.body.userQuestion, // Take user input dynamically
        });

        const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

        // ✅ Query Pinecone for best-matching records
        const results = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true,
        });
     
        const matchedPages = results.matches.map((match) => match.metadata.text);
        
        // ✅ Use retrieved text for GPT-based Q&A
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: req.session.chatHistory,
        });
        console.log({ answer: response.choices[0].message.content })
        req.session.chatHistory.push({ role: "assistant", content: response.choices[0].message.content });
        res.json({ answer: response.choices[0].message.content });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
