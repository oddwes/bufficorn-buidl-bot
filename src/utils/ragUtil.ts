import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";
import { CHROMA_CONFIG } from "../../chromaConfig.js";
import { identifyRelevantSources } from "./documentUtils.js";

export async function getRelevantDocuments(queryText: string) {
  const embedding = new OpenAIEmbeddings({
    batchSize: 512,
    model: "text-embedding-3-large",
  });

  try {
    console.log(`Getting relevant documents for query: "${queryText}"`);
    const client = new ChromaClient({ path: CHROMA_CONFIG.url });
    // @ts-ignore
    const collection = await client.getCollection({
      name: CHROMA_CONFIG.collectionName,
    });

    // First, find the most relevant chunks to identify relevant documents
    const queryEmbedding = await embedding.embedQuery(queryText);
    let results;
    try {
      results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 25, // Start with 25 results
        // @ts-ignore
        include: ["metadatas", "documents", "distances"],
      });
    } catch (error) {
      console.warn(
        "Error with initial query, trying with fewer results:",
        error
      );
      // If the first query fails, try with fewer results
      results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 10, // Reduce to 10 results
        // @ts-ignore
        include: ["metadatas", "documents", "distances"],
      });
    }

    // Identify the most relevant sources
    const relevantSources = identifyRelevantSources(
      results.documents,
      results.metadatas,
      results.distances
    );

    console.log(
      "Relevant sources identified:",
      relevantSources.map((s) => s.source).join(", ")
    );

    // Now retrieve FULL documents for each relevant source by name
    const fullDocuments = await Promise.all(
      relevantSources.map(async ({ source, relevanceScore }) => {
        console.log(`Processing source: ${source}`);
        // First get all documents with this source
        const allSourceDocs = await collection.get({
          where: { source: source },
          // @ts-ignore
          include: ["metadatas", "documents"],
        });

        // Then filter for full documents
        const fullDocs = allSourceDocs.documents.filter(
          (_, idx) => allSourceDocs.metadatas[idx].is_full_document === true
        );

        // If we found a full document, use it
        if (fullDocs.length > 0) {
          console.log(`Found full document for source: ${source}`);
          return {
            source,
            content: fullDocs[0],
            relevanceScore,
          };
        }

        console.log(
          `No full document found for ${source}, reconstructing from chunks...`
        );
        // Fallback: If no full document is found, retrieve all chunks and reconstruct
        const chunksResults = await collection.get({
          where: { source: source },
          // @ts-ignore
          include: ["metadatas", "documents"],
        });

        console.log(
          `Found ${chunksResults.documents.length} chunks for source: ${source}`
        );

        // Sort chunks by chunk_id if available
        const sortedChunks = chunksResults.documents
          .map((content, idx) => ({
            content,
            chunkId:
              typeof chunksResults.metadatas[idx].chunk_id === "string"
                ? parseInt(chunksResults.metadatas[idx].chunk_id, 10)
                : chunksResults.metadatas[idx].chunk_id || idx,
          }))
          .sort(
            // @ts-ignore
            (a: { chunkId: number }, b: { chunkId: number }) =>
              a.chunkId - b.chunkId
          );

        // Reconstruct the full document
        const fullContent = sortedChunks
          .map((chunk) => chunk.content)
          .join("\n\n");

        return {
          source,
          content: fullContent,
          relevanceScore,
        };
      })
    );

    console.log(`Retrieved ${fullDocuments.length} documents in total`);

    // Format the full documents as a single string
    const result = fullDocuments
      .map(
        (doc) =>
          `Source: ${doc.source} (Relevance: ${doc.relevanceScore.toFixed(
            3
          )})\n\n${doc.content}`
      )
      .join("\n\n---\n\n");

    return result;
  } catch (error) {
    console.error("Error getting relevant documents:", error);
    return "";
  }
}
