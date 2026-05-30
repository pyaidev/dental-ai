import uvicorn

if __name__ == "__main__":
    import os
    is_dev = os.getenv("ENV", "production") == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=is_dev)
