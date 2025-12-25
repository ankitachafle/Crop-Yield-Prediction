import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from auth import signup_user, login_user
from model import predict_yield, get_options

app = FastAPI()

# Allow all origins for the API to be accessible from GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictInput(BaseModel):
    area: str
    item: str
    year: int
    rainfall: float
    pesticides: float
    temp: float

@app.get("/config")
def get_config():
    return get_options()

@app.post("/signup")
def signup(data: dict):
    return signup_user(data)

@app.post("/login")
def login(data: dict):
    return login_user(data)

@app.post("/predict")
def make_prediction(data: PredictInput):
    try:
        result = predict_yield(data.dict())
        return {"prediction": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount frontend files only if directory exists (for local testing)
frontend_path = os.path.dirname(__file__)
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    print(f"Warning: Frontend directory not found at {frontend_path}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
