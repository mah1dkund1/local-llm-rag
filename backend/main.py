from fastapi import FastAPI, UploadFile, File , HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import uuid
from rag_pipeline import ingest_document, retrieve_relevant_chunks

ALLOWED_EXTENSIONS = {".pdf" , ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 mb


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL= "http://localhost:11434/api/chat"
MODEL_NAME = "llama3.2:3b"
UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok = True)



class ChatRequest(BaseModel):
    message: str
    document_id: str | None = None
    
    
    
@app.get("/")
def root():
    return {"status": "backend is running"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Only PDF and TXT files are allowed."
        )
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code = 400,
            detail = "File is too large. Maximum size is 10MB."
        )
    
    
    
    
    document_id = str(uuid.uuid4())
    
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(content)
        
    num_chunks = ingest_document(file_path, document_id=document_id)
    
    return {
        "document_id": document_id,
        "filename": file.filename,
        "chunks_ingested": num_chunks,
    } 
    
    
    
        
@app.post("/chat")
async def chat(request: ChatRequest):
    user_message = request.message
    
    if request.document_id:
        relevant_chunks = retrieve_relevant_chunks(
            query = user_message,
            document_id = request.document_id
            )
        
        context = "\n\n".join(relevant_chunks)
        
        prompt = f"""Answer the question using the context below. If the context doesn't contain relevant information, say so rather than guessing
        
Context:
{context}

Question:
{user_message}"""
    else:
        prompt = user_message  
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user", "content": prompt
            }
        ],
        "stream": False
    }    
    
    async with httpx.AsyncClient(timeout=120.0)as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
    
    return {"reply": data["message"]["content"]}
    
    