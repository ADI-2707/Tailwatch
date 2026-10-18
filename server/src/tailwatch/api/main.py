from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    app = FastAPI(title="Tailwatch API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health/live")
    def live():
        return {"status": "ok"}

    @app.get("/health/ready")
    def ready():
        return {"status": "ready"}

    from tailwatch.api.routes.ingest import router as ingest_router
    from tailwatch.api.routes.search import router as search_router
    from tailwatch.api.routes.histogram import router as histogram_router
    from tailwatch.api.routes.tail import router as tail_router
    from tailwatch.api.routes.projects import router as projects_router
    from tailwatch.api.routes.auth import router as auth_router
    from tailwatch.api.routes.alerts import router as alerts_router
    from tailwatch.api.routes.telemetry import router as telemetry_router
    app.include_router(ingest_router)
    app.include_router(search_router)
    app.include_router(histogram_router)
    app.include_router(tail_router)
    app.include_router(projects_router)
    app.include_router(auth_router)
    app.include_router(alerts_router)
    app.include_router(telemetry_router)

    return app

app = create_app()
