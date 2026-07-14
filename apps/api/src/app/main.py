from fastapi import FastAPI

from app.routers import health

app = FastAPI(title="Tennisfolio API")

app.include_router(health.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Hello from the Tennisfolio API"}
