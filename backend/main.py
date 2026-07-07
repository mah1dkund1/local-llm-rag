from fastapi import FastAPI
from pydantic import BaseModel
import httpx

app = FastAPI()

OLLAMA_URL= "http://localhost:11434/api/chat"
MODEL_NAME = "llama3.2:3b"

class ChatRequest(BaseModel):
    message: str
    
    
    
@app.get("/")
def root():
    return {"status": "backend is running"}


@app.post("/")
async def chat(request: ChatRequest):
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user", "content": request.message
            }
        ],
        "stream": False
    }    
    
    async with httpx.AsyncClient(timeout=120.0)as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
    
    return {"reply": data["message"]["content"]}
    
    