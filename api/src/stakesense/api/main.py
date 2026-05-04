from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import text

from stakesense.api.routers import anomalies as anomalies_router
from stakesense.api.routers import backtest as backtest_router
from stakesense.api.routers import export as export_router
from stakesense.api.routers import portfolio as portfolio_router
from stakesense.api.routers import recommend as recommend_router
from stakesense.api.routers import validators as validators_router
from stakesense.db import engine

app = FastAPI(title="stakesense", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.get("/api/v1/health")
def health() -> dict:
    with engine.begin() as conn:
        max_epoch = conn.execute(text("SELECT MAX(epoch) FROM epoch_performance")).scalar()
        latest_pred = conn.execute(text("SELECT MAX(prediction_date) FROM predictions")).scalar()
        version = conn.execute(
            text("SELECT model_version FROM predictions ORDER BY prediction_date DESC LIMIT 1")
        ).scalar()
    return {
        "ok": True,
        "last_update_epoch": max_epoch,
        "last_prediction_date": str(latest_pred) if latest_pred else None,
        "model_version": version,
    }


app.include_router(validators_router.router)
app.include_router(recommend_router.router)
app.include_router(backtest_router.router)
app.include_router(export_router.router)
app.include_router(portfolio_router.router)
app.include_router(anomalies_router.router)
