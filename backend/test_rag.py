from rag_pipeline import ingest_document, retreive_relevant_chunks

num_chunks = ingest_document("test.txt", document_id="test-doc-1")

print(f"Ingested {num_chunks} chunks from test.txt")


query = "What is the capital of France mentioned in the document?"
results = retreive_relevant_chunks(query, document_id="test-doc-1")

print (f"\nQuery {query}")
print ("Retreived Chunks:")

for i, chunk in enumerate(results):
    print(f"\n--- Chunk {i+1} ---")
    print (chunk)
