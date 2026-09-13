from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import *  # Ensure all models are registered with Base
from app.routers import (
    lots_router,
    prices_router,
    recyclers_router,
    authorizations_router,
    handovers_router,
    ledger_router,
    sync_router,
    admin_router,
    verify_router,
)

# Initialize database schema tables automatically for prototype development
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kabadiwala Connect API",
    description="Backend services for Kabadiwala Connect PWA — e-waste collector formalization & recycling platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lots_router)
app.include_router(prices_router)
app.include_router(recyclers_router)
app.include_router(authorizations_router)
app.include_router(handovers_router)
app.include_router(ledger_router)
app.include_router(sync_router)
app.include_router(admin_router)
app.include_router(verify_router)

@app.get("/")
def root():
    return {
        "app": "Kabadiwala Connect API",
        "status": "healthy",
        "version": "1.0.0",
        "docs_url": "/docs",
    }
