from rag_pipeline import ingest_document, retrieve_relevant_chunks

# Fresh ingest, right now, so we know exactly what's in the store
document_id = "debug-test-1"
num_chunks = ingest_document("test.txt", document_id=document_id)
print(f"Ingested {num_chunks} chunks\n")

query = "What is my favorite hidden project codename?"
results = retrieve_relevant_chunks(query, document_id=document_id)

print(f"Query: {query}")
print(f"Number of chunks retrieved: {len(results)}\n")

for i, chunk in enumerate(results):
    print(f"--- Chunk {i + 1} ---")
    print(chunk)
    print()