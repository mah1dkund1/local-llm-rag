import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

CHROMA_DIR = "chroma_store"
EMBEDDING_MODEL = "nomic-embed-text"

embeddings = OllamaEmbeddings(model = EMBEDDING_MODEL)

def load_document(file_path: str):
      #Loads a docu from disk based on its file ext
      
    if file_path.endswith(".pdf"):
        loader= PyPDFLoader(file_path)
    else: 
        loader = TextLoader(file_path)
    return loader.load()

def chunk_document(docs):
    # splits loaded docs into overlapping chunks
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size = 500,
        chunk_overlap  =50,
    )
    return splitter.split_documents(docs) 

def ingest_document(file_path: str, document_id: str):
    
    docs = load_document(file_path)
    chunks = chunk_document(docs)
    
    for chunk in chunks:
        chunk.metadata["document_id"] = document_id
        
    vectorstore = Chroma(
        collection_name = "documents",
        embedding_function  = embeddings,
        persist_directory=CHROMA_DIR,
                       
    )       
    
    vectorstore.add_documents(chunks)
    
    return len(chunks)
     
def retrieve_relevant_chunks(query: str, document_id: str, k: int = 3):
    # return top k most relevant chunks given a query and a docu
    
    vectorstore = Chroma(
        collection_name="documents",
        embedding_function = embeddings,
        persist_directory=CHROMA_DIR,
    )     
    
    results = vectorstore.similarity_search(
        query,
        k=k,
        filter={"document_id": document_id},
        
    )
    
    return [doc.page_content for doc in results]