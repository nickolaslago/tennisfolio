from fastapi import FastAPI

from app.errors import register_exception_handlers
from app.routers import clubs, export, health, matches, opponents, stats, tournaments

app = FastAPI(title="Tennisfolio API")

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(opponents.router)
app.include_router(clubs.router)
app.include_router(tournaments.router)
app.include_router(matches.router)
app.include_router(stats.router)
app.include_router(export.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Hello from the Tennisfolio API"}
