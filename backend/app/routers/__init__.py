from app.routers.lots import router as lots_router
from app.routers.prices import router as prices_router
from app.routers.recyclers import router as recyclers_router
from app.routers.authorizations import router as authorizations_router
from app.routers.handovers import router as handovers_router
from app.routers.ledger import router as ledger_router
from app.routers.sync import router as sync_router
from app.routers.admin import router as admin_router
from app.routers.verify import router as verify_router

__all__ = [
    "lots_router",
    "prices_router",
    "recyclers_router",
    "authorizations_router",
    "handovers_router",
    "ledger_router",
    "sync_router",
    "admin_router",
    "verify_router",
]
