from fastapi import FastAPI

app = FastAPI(title="TransitOps API")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API is healthy"}

@app.get("/")
def read_root():
    return {"message": "Welcome to TransitOps API"}
