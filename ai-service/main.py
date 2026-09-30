from fastapi import FastAPI
from pydantic import BaseModel
import requests

app = FastAPI()

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:3b"


class AIRequest(BaseModel):
    prompt: str


@app.get("/")
def home():
    return {
        "message": "Adaptive AI Learning Assistant AI Service is Running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/generate")
def generate_ai_response(request: AIRequest):

    payload = {
        "model": MODEL_NAME,
        "prompt": request.prompt,
        "stream": False
    }

    response = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=120
    )

    response.raise_for_status()

    ollama_result = response.json()

    return {
        "response": ollama_result["response"]
    }