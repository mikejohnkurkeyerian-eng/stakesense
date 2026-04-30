import pandas as pd
from fastapi import APIRouter, Query
from sqlalchemy import text

from stakesense.db import engine
from stakesense.scoring.backtest import simulate_strategies


router = APIRouter(prefix="/api/v1", tags=["backtest"])


@router.get("/backtest")
def backtest(
    epochs: int = Query(90, ge=10, le=200),
) -> dict:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        preds = pd.read_sql(text("SELECT * FROM predictions"), conn)
    if perf.empty or preds.empty:
        return {"yields": [], "incidents": [], "summary": {}}
    last = int(perf["epoch"].max())
    window = list(range(last - epochs + 1, last + 1))
    res = simulate_strategies(perf, preds, epochs=window)

    return {
        "yields": res.yields.to_dict(orient="records"),
        "incidents": res.incidents.to_dict(orient="records"),
        "summary": {
            "yield_mean": res.yields.groupby("strategy")["yield"].mean().to_dict(),
            "incidents_mean": res.incidents.groupby("strategy")["incidents"].mean().to_dict(),
        },
    }
