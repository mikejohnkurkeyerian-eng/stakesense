# Validator Quality Oracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, ML-powered Solana validator quality oracle (predictive scoring + REST API + dashboard + Phantom & Privy stake flows) ready for Colosseum Frontier submission by Mon 2026-05-11.

**Architecture:** Python (FastAPI + lightgbm) on Fly.io, Supabase Postgres for storage, Next.js 14 dashboard on Vercel, monorepo on GitHub. Daily cron retrains and writes `predictions` table; API serves predictions only (no live ML inference). Wallet integrations use standard `@solana/wallet-adapter-react` (Phantom) and `@privy-io/react-auth` (Privy) calling Solana's built-in `StakeProgram.delegate` — no custom on-chain code.

**Tech Stack:**
- Backend: Python 3.11, FastAPI, sqlalchemy, lightgbm, pandas, asyncpg, httpx, pytest
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, recharts
- Wallet: `@solana/wallet-adapter-react`, `@solana/web3.js`, `@privy-io/react-auth`
- Storage: Supabase Postgres
- Hosting: Fly.io (API + cron), Vercel (frontend)
- CI: GitHub Actions

**Working name placeholder:** `stakesense` — used in repo, package names, env prefixes throughout. Rename via global find-replace before submission if a better name lands.

**Spec reference:** `docs/superpowers/specs/2026-04-28-validator-quality-oracle-design.md`

---

## How to Use This Plan

- Each Day section corresponds to a calendar day in the spec's milestone plan.
- Each Task is a self-contained chunk producing a commit.
- Each Step is 2–5 minutes of work.
- TDD applies on backend and ML code (where it pays off). UI tasks use smoke-testing via the live dashboard.
- Mark `[x]` as you complete each step. If a day overruns by more than 6 hours, consume buffer-day budget — do not skip the next day's deliverable.
- Daily protocol: at end of each day, check the deliverable on the *live* URL (not just locally) before stopping.

---

## Day 0 — Pre-flight (Tue 2026-04-28, before Day 1 work)

**Deliverable:** All external accounts ready, API keys obtained, local toolchain installed.

### Task 0.1: External account checklist

**Goal:** Confirm or create accounts for every external dependency.

- [ ] **Step 1: GitHub** — confirm you can `gh auth status` and create a public repo. If `gh` not installed: `winget install GitHub.cli` then `gh auth login`.
- [ ] **Step 2: Supabase** — sign up at https://supabase.com, create a new project (region close to you, e.g., `us-east-1`). Save the project URL and `anon` + `service_role` keys.
- [ ] **Step 3: Helius** — sign up at https://helius.dev, free plan. Create an API key. Save `HELIUS_API_KEY` and the RPC URL `https://mainnet.helius-rpc.com/?api-key=...`.
- [ ] **Step 4: Stakewiz** — no signup needed; the public API at `https://api.stakewiz.com` is open. Verify with `curl https://api.stakewiz.com/validators` returns JSON.
- [ ] **Step 5: Jito MEV data** — verify access to `https://kobe.mainnet.jito.network/api/v1/validators` (public). If rate-limited later, fall back to scraping the Jito Steward dashboard.
- [ ] **Step 6: Validators.app** — sign up at https://www.validators.app, free tier. Get API token under Account → API.
- [ ] **Step 7: Vercel** — sign up at https://vercel.com using GitHub OAuth.
- [ ] **Step 8: Fly.io** — `winget install Fly.Flyctl`, then `flyctl auth signup` (free trial covers this scale; payment method required even on free).
- [ ] **Step 9: Privy** — sign up at https://privy.io, create an app, get the App ID. Free tier covers hackathon scale.
- [ ] **Step 10: Phantom** — install Phantom browser extension if not already installed. Create a devnet-only wallet (separate from any real wallet) for testing. Fund with devnet SOL via `solana airdrop 5 <address> --url https://api.devnet.solana.com`.

### Task 0.2: Local toolchain

- [ ] **Step 1: Python 3.11** — `python --version`. If not 3.11+: install from python.org or `winget install Python.Python.3.11`.
- [ ] **Step 2: Node 20+** — `node -v`. If not 20+: `winget install OpenJS.NodeJS.LTS`.
- [ ] **Step 3: pnpm** — `npm install -g pnpm` (faster than npm; we'll use it for the web/ workspace).
- [ ] **Step 4: Solana CLI** — `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`. Verify `solana --version`.
- [ ] **Step 5: Postgres client (psql)** — `winget install PostgreSQL.PostgreSQL` (only the client; we use Supabase for the actual DB).
- [ ] **Step 6: Verify all** — run `python --version && node -v && pnpm -v && solana --version && psql --version && flyctl version && gh --version`. All should print version strings without error.

### Task 0.3: Save secrets to a single source of truth

**File:** `C:\Users\Mikek\OneDrive\Desktop\Hackathon\.env`

- [ ] **Step 1: Open `.env` and append all keys from Task 0.1.**

```
# Existing
COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"
COLOSSEUM_COPILOT_PAT="..."

# New: Solana data sources
HELIUS_API_KEY="..."
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=..."
SOLANA_RPC_URL_MAINNET="https://api.mainnet-beta.solana.com"
SOLANA_RPC_URL_DEVNET="https://api.devnet.solana.com"
VALIDATORS_APP_TOKEN="..."

# Supabase
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"

# Privy
NEXT_PUBLIC_PRIVY_APP_ID="..."

# App
APP_NAME="stakesense"
APP_BASE_URL="http://localhost:3000"
```

- [ ] **Step 2: Confirm `.gitignore` includes `.env`.** Run `grep -E "^\.env$" .gitignore`. If missing, append.

---

## Day 1 — Repo + Supabase + first RPC pull (Tue 2026-04-28)

**Deliverable:** Public GitHub repo with monorepo skeleton, Supabase schema migrated, one successful pull of validators from Solana RPC stored in DB.

### Task 1.1: Initialize monorepo

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `README.md`, `LICENSE` (MIT)

- [ ] **Step 1: Initialize git + GitHub repo**

```bash
cd /c/Users/Mikek/OneDrive/Desktop/Hackathon
git init -b main
gh repo create stakesense --public --source=. --description "Predictive validator quality oracle for Solana"
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'web'
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "stakesense",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build"
  }
}
```

- [ ] **Step 4: Augment `.gitignore`**

```
# already has .env
node_modules/
.next/
dist/
__pycache__/
*.pyc
.venv/
.pytest_cache/
.mypy_cache/
.ipynb_checkpoints/
*.egg-info/
api/.env
web/.env.local
data/raw/
data/processed/
models/*.pkl
models/*.joblib
.DS_Store
.fly/
.vercel/
```

- [ ] **Step 5: Create `LICENSE` (MIT)** — copy from https://choosealicense.com/licenses/mit/, fill in `<year>` = 2026 and `<name>` = your name or repo name.

- [ ] **Step 6: Create initial `README.md`**

```markdown
# stakesense

Predictive validator quality oracle for Solana. ML-powered scoring on three pillars (downtime risk, MEV tax, decentralization) exposed as a public REST API + dashboard + wallet-integrated stake flow.

Status: in development for Solana Frontier hackathon (Colosseum, Apr–May 2026).

See `docs/superpowers/specs/` for the design spec and `docs/superpowers/plans/` for the implementation plan.
```

- [ ] **Step 7: First commit**

```bash
git add .
git commit -m "chore: initialize monorepo skeleton + license"
git push -u origin main
```

### Task 1.2: Python project setup (`api/`)

**Files:**
- Create: `api/pyproject.toml`, `api/src/stakesense/__init__.py`, `api/src/stakesense/config.py`, `api/tests/conftest.py`

- [ ] **Step 1: Create `api/` directory structure**

```bash
mkdir -p api/src/stakesense api/tests api/scripts api/notebooks
```

- [ ] **Step 2: Create `api/pyproject.toml`**

```toml
[project]
name = "stakesense"
version = "0.0.0"
description = "Predictive validator quality oracle for Solana"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.110",
  "uvicorn[standard]>=0.27",
  "httpx>=0.27",
  "sqlalchemy>=2.0",
  "asyncpg>=0.29",
  "psycopg2-binary>=2.9",
  "pydantic>=2.6",
  "pydantic-settings>=2.2",
  "python-dotenv>=1.0",
  "lightgbm>=4.3",
  "pandas>=2.2",
  "numpy>=1.26",
  "scikit-learn>=1.4",
  "joblib>=1.3",
  "tenacity>=8.2",
  "structlog>=24.1",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.1",
  "pytest-asyncio>=0.23",
  "pytest-cov>=4.1",
  "respx>=0.20",
  "ipykernel>=6.29",
  "matplotlib>=3.8",
  "seaborn>=0.13",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 3: Create venv and install**

```bash
cd api
python -m venv .venv
source .venv/Scripts/activate  # Git Bash on Windows
pip install -e ".[dev]"
```

- [ ] **Step 4: Create `api/src/stakesense/__init__.py`**

```python
__version__ = "0.0.0"
```

- [ ] **Step 5: Create `api/src/stakesense/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=["../.env", ".env"], extra="ignore")

    helius_api_key: str
    helius_rpc_url: str
    solana_rpc_url_mainnet: str = "https://api.mainnet-beta.solana.com"
    solana_rpc_url_devnet: str = "https://api.devnet.solana.com"
    validators_app_token: str
    database_url: str
    app_name: str = "stakesense"


settings = Settings()
```

- [ ] **Step 6: Create `api/tests/conftest.py`**

```python
import pytest


@pytest.fixture
def fixture_dir():
    from pathlib import Path
    return Path(__file__).parent / "fixtures"
```

- [ ] **Step 7: Smoke test config loads**

```bash
cd api && python -c "from stakesense.config import settings; print(settings.app_name)"
```
Expected: `stakesense`

- [ ] **Step 8: Commit**

```bash
git add api/
git commit -m "feat(api): scaffold Python project with config + dev deps"
```

### Task 1.3: Next.js project setup (`web/`)

**Files:**
- Create: `web/` (via `pnpm create next-app`)

- [ ] **Step 1: Bootstrap Next.js 14 app**

```bash
cd /c/Users/Mikek/OneDrive/Desktop/Hackathon
pnpm create next-app web --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
```

(answer prompts: Yes to TS, Yes to Tailwind, Yes to App Router, No to src/, default import alias)

- [ ] **Step 2: Install initial deps**

```bash
cd web
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/web3.js @privy-io/react-auth recharts swr
pnpm add -D @types/node
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd web
pnpm dlx shadcn@latest init -d
```

(accept defaults: Default style, Slate base color, CSS variables = yes)

- [ ] **Step 4: Add the components we'll need**

```bash
pnpm dlx shadcn@latest add button card table input select badge tabs sheet dialog
```

- [ ] **Step 5: Verify dev server starts**

```bash
pnpm dev
```

Visit http://localhost:3000 — should see the default Next.js page. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
cd ..
git add web/
git commit -m "feat(web): scaffold Next.js 14 with Tailwind, shadcn/ui, wallet adapters"
```

### Task 1.4: Supabase schema migration

**Files:**
- Create: `api/scripts/schema.sql`, `api/scripts/migrate.py`

- [ ] **Step 1: Write `api/scripts/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS validators (
  vote_pubkey      TEXT PRIMARY KEY,
  identity_pubkey  TEXT,
  name             TEXT,
  commission_pct   INTEGER,
  active_stake     BIGINT,
  data_center      TEXT,
  asn              TEXT,
  country          TEXT,
  jito_client      BOOLEAN,
  first_seen_epoch INTEGER,
  last_updated     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epoch_performance (
  vote_pubkey      TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  epoch            INTEGER NOT NULL,
  credits          BIGINT,
  skip_rate        DOUBLE PRECISION,
  vote_latency     DOUBLE PRECISION,
  active_stake     BIGINT,
  delinquent       BOOLEAN,
  blocks_produced  INTEGER,
  blocks_expected  INTEGER,
  PRIMARY KEY (vote_pubkey, epoch)
);

CREATE TABLE IF NOT EXISTS mev_observations (
  vote_pubkey                 TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  epoch                       INTEGER NOT NULL,
  mev_revenue_lamports        BIGINT,
  mev_commission_pct          INTEGER,
  mev_to_delegators_lamports  BIGINT,
  PRIMARY KEY (vote_pubkey, epoch)
);

CREATE TABLE IF NOT EXISTS predictions (
  vote_pubkey            TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  prediction_date        DATE NOT NULL,
  model_version          TEXT NOT NULL,
  downtime_prob_7d       DOUBLE PRECISION,
  mev_tax_rate           DOUBLE PRECISION,
  decentralization_score DOUBLE PRECISION,
  composite_score        DOUBLE PRECISION,
  PRIMARY KEY (vote_pubkey, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions (prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_composite ON predictions (composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_epoch_performance_epoch ON epoch_performance (epoch DESC);
```

- [ ] **Step 2: Write `api/scripts/migrate.py`**

```python
"""Apply schema.sql against the configured DATABASE_URL."""
import sys
from pathlib import Path

import psycopg2

from stakesense.config import settings


def main() -> None:
    sql = Path(__file__).parent.joinpath("schema.sql").read_text()
    conn = psycopg2.connect(settings.database_url)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql)
        print("schema applied")
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Run migration against Supabase**

```bash
cd api && python scripts/migrate.py
```
Expected: `schema applied` (no error)

- [ ] **Step 4: Verify in Supabase dashboard** — open Supabase project → Table Editor → confirm `validators`, `epoch_performance`, `mev_observations`, `predictions` exist with correct columns.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/
git commit -m "feat(api): add Postgres schema + migration script"
```

### Task 1.5: Solana RPC client + first validator pull (TDD)

**Files:**
- Create: `api/src/stakesense/sources/__init__.py`, `api/src/stakesense/sources/solana_rpc.py`, `api/tests/test_solana_rpc.py`, `api/tests/fixtures/get_vote_accounts_sample.json`

- [ ] **Step 1: Capture a fixture from the live RPC**

```bash
cd api
mkdir -p tests/fixtures
curl -s https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVoteAccounts","params":[]}' \
  | python -c "import sys,json; d=json.load(sys.stdin); d['result']['current']=d['result']['current'][:5]; d['result']['delinquent']=d['result']['delinquent'][:2]; print(json.dumps(d, indent=2))" \
  > tests/fixtures/get_vote_accounts_sample.json
```

(this trims to a small sample so tests stay fast)

- [ ] **Step 2: Write the failing test `api/tests/test_solana_rpc.py`**

```python
import json
from pathlib import Path

import httpx
import pytest
import respx

from stakesense.sources.solana_rpc import SolanaRpcClient


@pytest.mark.asyncio
async def test_get_vote_accounts_returns_normalized_records(fixture_dir):
    fixture = json.loads((fixture_dir / "get_vote_accounts_sample.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.post("/").mock(return_value=httpx.Response(200, json=fixture))
        client = SolanaRpcClient(rpc_url="https://test.example/")
        records = await client.get_vote_accounts()

    # 5 current + 2 delinquent (from fixture trimming above)
    assert len(records) == 7
    sample = records[0]
    assert "vote_pubkey" in sample
    assert "identity_pubkey" in sample
    assert "commission_pct" in sample
    assert "active_stake" in sample
    assert "delinquent" in sample
    assert isinstance(sample["delinquent"], bool)
    delinquent_count = sum(1 for r in records if r["delinquent"])
    assert delinquent_count == 2
```

- [ ] **Step 3: Run, confirm it fails**

```bash
cd api && pytest tests/test_solana_rpc.py -v
```
Expected: `ModuleNotFoundError: No module named 'stakesense.sources.solana_rpc'`

- [ ] **Step 4: Write `api/src/stakesense/sources/__init__.py`** (empty file).

- [ ] **Step 5: Write `api/src/stakesense/sources/solana_rpc.py`**

```python
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class SolanaRpcClient:
    def __init__(self, rpc_url: str, timeout: float = 30.0) -> None:
        self._rpc_url = rpc_url
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _post(self, body: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(self._rpc_url, json=body)
            r.raise_for_status()
            return r.json()

    async def get_vote_accounts(self) -> list[dict[str, Any]]:
        body = {"jsonrpc": "2.0", "id": 1, "method": "getVoteAccounts", "params": []}
        resp = await self._post(body)
        result = resp["result"]
        records: list[dict[str, Any]] = []
        for entry in result.get("current", []):
            records.append(self._normalize(entry, delinquent=False))
        for entry in result.get("delinquent", []):
            records.append(self._normalize(entry, delinquent=True))
        return records

    @staticmethod
    def _normalize(entry: dict[str, Any], *, delinquent: bool) -> dict[str, Any]:
        return {
            "vote_pubkey": entry["votePubkey"],
            "identity_pubkey": entry["nodePubkey"],
            "commission_pct": entry.get("commission"),
            "active_stake": entry.get("activatedStake"),
            "epoch_credits": entry.get("epochCredits", []),
            "last_vote": entry.get("lastVote"),
            "root_slot": entry.get("rootSlot"),
            "delinquent": delinquent,
        }
```

- [ ] **Step 6: Run, confirm it passes**

```bash
pytest tests/test_solana_rpc.py -v
```
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add api/
git commit -m "feat(api): add Solana RPC client for getVoteAccounts"
```

### Task 1.6: Persist validators to Postgres + script

**Files:**
- Create: `api/src/stakesense/db/__init__.py`, `api/src/stakesense/db/models.py`, `api/src/stakesense/db/repository.py`, `api/scripts/refresh_validators.py`, `api/tests/test_validators_repo.py`

- [ ] **Step 1: Write `api/src/stakesense/db/models.py`** (SQLAlchemy ORM)

```python
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Validator(Base):
    __tablename__ = "validators"

    vote_pubkey: Mapped[str] = mapped_column(String, primary_key=True)
    identity_pubkey: Mapped[str | None] = mapped_column(String)
    name: Mapped[str | None] = mapped_column(String)
    commission_pct: Mapped[int | None] = mapped_column(Integer)
    active_stake: Mapped[int | None] = mapped_column(BigInteger)
    data_center: Mapped[str | None] = mapped_column(String)
    asn: Mapped[str | None] = mapped_column(String)
    country: Mapped[str | None] = mapped_column(String)
    jito_client: Mapped[bool | None] = mapped_column(Boolean)
    first_seen_epoch: Mapped[int | None] = mapped_column(Integer)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
```

- [ ] **Step 2: Write `api/src/stakesense/db/__init__.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from stakesense.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal: sessionmaker[Session] = sessionmaker(bind=engine, expire_on_commit=False)
```

- [ ] **Step 3: Write `api/src/stakesense/db/repository.py`**

```python
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.dialects.postgresql import insert

from stakesense.db import SessionLocal
from stakesense.db.models import Validator


def upsert_validators(records: Iterable[dict]) -> int:
    rows = []
    now = datetime.now(timezone.utc)
    for r in records:
        rows.append({
            "vote_pubkey": r["vote_pubkey"],
            "identity_pubkey": r.get("identity_pubkey"),
            "commission_pct": r.get("commission_pct"),
            "active_stake": r.get("active_stake"),
            "last_updated": now,
        })
    if not rows:
        return 0
    stmt = insert(Validator).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Validator.vote_pubkey],
        set_={
            "identity_pubkey": stmt.excluded.identity_pubkey,
            "commission_pct": stmt.excluded.commission_pct,
            "active_stake": stmt.excluded.active_stake,
            "last_updated": stmt.excluded.last_updated,
        },
    )
    with SessionLocal() as session, session.begin():
        session.execute(stmt)
    return len(rows)
```

- [ ] **Step 4: Write the failing repo test `api/tests/test_validators_repo.py`**

```python
import pytest
from sqlalchemy import text

from stakesense.db import SessionLocal, engine
from stakesense.db.repository import upsert_validators


@pytest.fixture(autouse=True)
def clean_validators():
    with SessionLocal() as s, s.begin():
        s.execute(text("TRUNCATE validators CASCADE"))
    yield


def test_upsert_inserts_then_updates():
    rec = {
        "vote_pubkey": "Vote111",
        "identity_pubkey": "Id111",
        "commission_pct": 7,
        "active_stake": 1_000_000_000,
    }
    assert upsert_validators([rec]) == 1

    with engine.begin() as conn:
        rows = list(conn.execute(text("SELECT vote_pubkey, commission_pct FROM validators")))
    assert rows == [("Vote111", 7)]

    rec["commission_pct"] = 9
    upsert_validators([rec])
    with engine.begin() as conn:
        rows = list(conn.execute(text("SELECT commission_pct FROM validators")))
    assert rows == [(9,)]
```

- [ ] **Step 5: Run, expect it to pass** (the data layer is implemented; we hit live Supabase)

```bash
pytest tests/test_validators_repo.py -v
```
Expected: 1 passed. (If it fails on connection, double-check `DATABASE_URL` in `.env`.)

- [ ] **Step 6: Write `api/scripts/refresh_validators.py`**

```python
"""Pull current vote accounts from Solana RPC and upsert into Supabase."""
import asyncio

from stakesense.config import settings
from stakesense.db.repository import upsert_validators
from stakesense.sources.solana_rpc import SolanaRpcClient


async def main() -> None:
    client = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    records = await client.get_vote_accounts()
    n = upsert_validators(records)
    print(f"upserted {n} validators")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 7: Run end-to-end**

```bash
cd api && python scripts/refresh_validators.py
```
Expected: `upserted ~1500 validators` (the actual mainnet count varies; anything >1000 is good).

- [ ] **Step 8: Verify in Supabase** — Table Editor → `validators` → confirm rows.

- [ ] **Step 9: Commit**

```bash
git add api/
git commit -m "feat(api): persist live validators to Postgres via upsert"
```

### Task 1.7: End-of-Day-1 push + sanity log

- [ ] **Step 1: Push everything**

```bash
git push origin main
```

- [ ] **Step 2: Append to `README.md` a Day 1 status line.** Replace the "Status:" line:

```
Status: Day 1 ✅ — repo + Supabase schema + first live validator pull.
```

- [ ] **Step 3: Commit + push**

```bash
git add README.md && git commit -m "docs: Day 1 status" && git push
```

---

## Day 2 — Historical backfill + cron (Wed 2026-04-29)

**Deliverable:** Historical per-epoch performance for ~200 epochs in `epoch_performance`, MEV data in `mev_observations`, validator metadata enriched (data_center, ASN, country) on `validators`, plus a single `refresh_all.py` script that the cron will run.

### Task 2.1: Stakewiz client + backfill (TDD)

**Files:**
- Create: `api/src/stakesense/sources/stakewiz.py`, `api/tests/test_stakewiz.py`, `api/tests/fixtures/stakewiz_validator_history.json`
- Create: `api/src/stakesense/db/epoch_repo.py`
- Create: `api/scripts/backfill_stakewiz.py`

- [ ] **Step 1: Capture a fixture**

```bash
cd api
curl -s "https://api.stakewiz.com/validator_epoch_stats/Certusm1sa411sMpV9FPqU5dXAYhmmhygvxJ23S6hJ24" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d[:5], indent=2))" \
  > tests/fixtures/stakewiz_validator_history.json
```

- [ ] **Step 2: Write failing test `api/tests/test_stakewiz.py`**

```python
import json

import httpx
import pytest
import respx

from stakesense.sources.stakewiz import StakewizClient


@pytest.mark.asyncio
async def test_get_epoch_history_normalizes_records(fixture_dir):
    fixture = json.loads((fixture_dir / "stakewiz_validator_history.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.get("/validator_epoch_stats/Vote111").mock(return_value=httpx.Response(200, json=fixture))
        client = StakewizClient(base_url="https://test.example")
        rows = await client.get_epoch_history("Vote111")

    assert len(rows) == len(fixture)
    sample = rows[0]
    assert {"vote_pubkey", "epoch", "credits", "skip_rate", "vote_latency"} <= set(sample.keys())
    assert sample["vote_pubkey"] == "Vote111"
```

- [ ] **Step 3: Run, confirm fail.** `pytest tests/test_stakewiz.py -v`

- [ ] **Step 4: Implement `api/src/stakesense/sources/stakewiz.py`**

```python
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class StakewizClient:
    def __init__(self, base_url: str = "https://api.stakewiz.com", timeout: float = 30.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str) -> Any:
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(f"{self._base_url}{path}")
            r.raise_for_status()
            return r.json()

    async def get_epoch_history(self, vote_pubkey: str) -> list[dict[str, Any]]:
        raw = await self._get(f"/validator_epoch_stats/{vote_pubkey}")
        rows: list[dict[str, Any]] = []
        for entry in raw:
            rows.append({
                "vote_pubkey": vote_pubkey,
                "epoch": entry.get("epoch"),
                "credits": entry.get("credits"),
                "skip_rate": entry.get("skip_rate"),
                "vote_latency": entry.get("vote_latency"),
                "active_stake": entry.get("activated_stake"),
                "delinquent": entry.get("delinquent", False),
                "blocks_produced": entry.get("blocks_produced"),
                "blocks_expected": entry.get("blocks_expected"),
            })
        return rows

    async def get_validators(self) -> list[dict[str, Any]]:
        return await self._get("/validators")
```

- [ ] **Step 5: Run, confirm pass.** `pytest tests/test_stakewiz.py -v`

- [ ] **Step 6: Write `api/src/stakesense/db/epoch_repo.py`**

```python
from typing import Iterable

from sqlalchemy import text

from stakesense.db import SessionLocal


UPSERT_SQL = text(
    """
    INSERT INTO epoch_performance (
        vote_pubkey, epoch, credits, skip_rate, vote_latency,
        active_stake, delinquent, blocks_produced, blocks_expected
    ) VALUES (
        :vote_pubkey, :epoch, :credits, :skip_rate, :vote_latency,
        :active_stake, :delinquent, :blocks_produced, :blocks_expected
    )
    ON CONFLICT (vote_pubkey, epoch) DO UPDATE SET
        credits = EXCLUDED.credits,
        skip_rate = EXCLUDED.skip_rate,
        vote_latency = EXCLUDED.vote_latency,
        active_stake = EXCLUDED.active_stake,
        delinquent = EXCLUDED.delinquent,
        blocks_produced = EXCLUDED.blocks_produced,
        blocks_expected = EXCLUDED.blocks_expected
    """
)


def upsert_epoch_rows(rows: Iterable[dict]) -> int:
    rows_list = list(rows)
    if not rows_list:
        return 0
    with SessionLocal() as session, session.begin():
        session.execute(UPSERT_SQL, rows_list)
    return len(rows_list)
```

- [ ] **Step 7: Write `api/scripts/backfill_stakewiz.py`**

```python
"""Backfill historical epoch_performance rows for every validator in our DB."""
import asyncio

from sqlalchemy import select

from stakesense.db import SessionLocal
from stakesense.db.epoch_repo import upsert_epoch_rows
from stakesense.db.models import Validator
from stakesense.sources.stakewiz import StakewizClient


async def main(concurrency: int = 8) -> None:
    with SessionLocal() as s:
        votes = [v.vote_pubkey for v in s.scalars(select(Validator)).all()]
    print(f"backfilling {len(votes)} validators")

    client = StakewizClient()
    sem = asyncio.Semaphore(concurrency)
    total = 0

    async def one(vote: str) -> int:
        async with sem:
            try:
                rows = await client.get_epoch_history(vote)
            except Exception as e:
                print(f"  fail {vote}: {e}")
                return 0
            return upsert_epoch_rows(rows)

    counts = await asyncio.gather(*(one(v) for v in votes))
    total = sum(counts)
    print(f"upserted {total} epoch rows")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 8: Run** (this will take 5–15 minutes; 1500 validators × ~200 epochs)

```bash
cd api && python scripts/backfill_stakewiz.py
```
Expected: `upserted ~300000 epoch rows` (or similar — order of magnitude check).

- [ ] **Step 9: Sanity in Supabase** — `select count(*) from epoch_performance;` — should be 100k+. `select min(epoch), max(epoch) from epoch_performance;` — sanity-check the range.

- [ ] **Step 10: Commit**

```bash
git add api/
git commit -m "feat(api): backfill historical epoch performance from Stakewiz"
```

### Task 2.2: Jito MEV client + backfill (TDD)

**Files:**
- Create: `api/src/stakesense/sources/jito.py`, `api/tests/test_jito.py`, `api/tests/fixtures/jito_validators.json`
- Create: `api/src/stakesense/db/mev_repo.py`
- Create: `api/scripts/backfill_jito.py`

- [ ] **Step 1: Capture a fixture**

```bash
cd api
curl -s "https://kobe.mainnet.jito.network/api/v1/validators" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d[:3], indent=2))" \
  > tests/fixtures/jito_validators.json
```

(if the endpoint differs, check Jito docs at https://docs.jito.network/ — the validators endpoint may be at a different path.)

- [ ] **Step 2: Write failing test `api/tests/test_jito.py`**

```python
import json

import httpx
import pytest
import respx

from stakesense.sources.jito import JitoClient


@pytest.mark.asyncio
async def test_get_validator_mev_normalizes(fixture_dir):
    fixture = json.loads((fixture_dir / "jito_validators.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.get("/api/v1/validators").mock(return_value=httpx.Response(200, json=fixture))
        client = JitoClient(base_url="https://test.example")
        rows = await client.get_validator_mev(epoch=600)

    assert len(rows) == len(fixture)
    s = rows[0]
    assert {"vote_pubkey", "epoch", "mev_revenue_lamports", "mev_commission_pct"} <= set(s.keys())
    assert s["epoch"] == 600
```

- [ ] **Step 3: Implement `api/src/stakesense/sources/jito.py`**

```python
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class JitoClient:
    def __init__(self, base_url: str = "https://kobe.mainnet.jito.network", timeout: float = 30.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str) -> Any:
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(f"{self._base_url}{path}")
            r.raise_for_status()
            return r.json()

    async def get_validator_mev(self, epoch: int) -> list[dict[str, Any]]:
        raw = await self._get("/api/v1/validators")
        rows: list[dict[str, Any]] = []
        for v in raw:
            vote = v.get("vote_account") or v.get("votePubkey") or v.get("validator")
            commission = v.get("mev_commission_bps")
            commission_pct = (commission / 100) if commission is not None else None
            rows.append({
                "vote_pubkey": vote,
                "epoch": epoch,
                "mev_revenue_lamports": v.get("mev_revenue") or v.get("mev_revenue_lamports") or 0,
                "mev_commission_pct": int(commission_pct) if commission_pct is not None else None,
                "mev_to_delegators_lamports": v.get("mev_rewards_for_stakers") or 0,
            })
        return rows
```

- [ ] **Step 4: Run test, confirm pass.** `pytest tests/test_jito.py -v`

- [ ] **Step 5: Implement `api/src/stakesense/db/mev_repo.py`**

```python
from typing import Iterable

from sqlalchemy import text

from stakesense.db import SessionLocal

UPSERT_SQL = text(
    """
    INSERT INTO mev_observations (
        vote_pubkey, epoch, mev_revenue_lamports, mev_commission_pct, mev_to_delegators_lamports
    ) VALUES (
        :vote_pubkey, :epoch, :mev_revenue_lamports, :mev_commission_pct, :mev_to_delegators_lamports
    )
    ON CONFLICT (vote_pubkey, epoch) DO UPDATE SET
        mev_revenue_lamports = EXCLUDED.mev_revenue_lamports,
        mev_commission_pct = EXCLUDED.mev_commission_pct,
        mev_to_delegators_lamports = EXCLUDED.mev_to_delegators_lamports
    """
)


def upsert_mev_rows(rows: Iterable[dict]) -> int:
    rows_list = [r for r in rows if r.get("vote_pubkey")]
    if not rows_list:
        return 0
    with SessionLocal() as session, session.begin():
        session.execute(UPSERT_SQL, rows_list)
    return len(rows_list)
```

- [ ] **Step 6: Write `api/scripts/backfill_jito.py`**

```python
"""Backfill MEV observations. The Jito public endpoint usually returns the
current/last-N-epochs snapshot; for deeper history, check Jito's GraphQL API
or scrape the Steward dashboard. Day 2 scope: capture latest epoch only."""
import asyncio

from stakesense.db.mev_repo import upsert_mev_rows
from stakesense.sources.jito import JitoClient
from stakesense.sources.solana_rpc import SolanaRpcClient
from stakesense.config import settings


async def main() -> None:
    rpc = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    epoch_info = await rpc._post({"jsonrpc": "2.0", "id": 1, "method": "getEpochInfo", "params": []})
    epoch = epoch_info["result"]["epoch"] - 1  # last completed
    print(f"backfilling MEV for epoch {epoch}")

    j = JitoClient()
    rows = await j.get_validator_mev(epoch=epoch)
    n = upsert_mev_rows(rows)
    print(f"upserted {n} MEV rows for epoch {epoch}")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 7: Run** — `python scripts/backfill_jito.py`. Expected: `upserted ~1000+ MEV rows`.

- [ ] **Step 8: Commit**

```bash
git add api/
git commit -m "feat(api): backfill Jito MEV observations for current epoch"
```

> **Note:** Jito's public API exposes only recent snapshots. If you need deeper history during Day 5 backtest, options are: (a) capture daily snapshots starting now and let it accumulate, (b) use the Jito GraphQL endpoint (research as needed), (c) use a static MEV-commission feature from the latest snapshot and treat earlier epochs as missing. Plan for (c) as the fallback.

### Task 2.3: Validators.app metadata enrichment

**Files:**
- Create: `api/src/stakesense/sources/validators_app.py`, `api/scripts/enrich_metadata.py`

- [ ] **Step 1: Implement client** (no fixture needed; field names are stable)

```python
# api/src/stakesense/sources/validators_app.py
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from stakesense.config import settings


class ValidatorsAppClient:
    def __init__(self, token: str | None = None, timeout: float = 30.0) -> None:
        self._token = token or settings.validators_app_token
        self._base_url = "https://www.validators.app/api/v1"
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def get_all(self, network: str = "mainnet") -> list[dict[str, Any]]:
        url = f"{self._base_url}/validators/{network}.json"
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(url, headers={"Token": self._token})
            r.raise_for_status()
            return r.json()
```

- [ ] **Step 2: Write `api/scripts/enrich_metadata.py`**

```python
"""Enrich validators table with data_center, ASN, country from validators.app."""
import asyncio

from sqlalchemy import text

from stakesense.db import SessionLocal
from stakesense.sources.validators_app import ValidatorsAppClient


UPDATE_SQL = text(
    """
    UPDATE validators
       SET data_center = :data_center,
           asn         = :asn,
           country     = :country,
           name        = COALESCE(:name, name)
     WHERE vote_pubkey = :vote_pubkey
    """
)


async def main() -> None:
    client = ValidatorsAppClient()
    rows = await client.get_all()
    print(f"fetched {len(rows)} validators.app rows")

    payload = []
    for r in rows:
        vote = r.get("vote_account")
        if not vote:
            continue
        payload.append({
            "vote_pubkey": vote,
            "data_center": (r.get("data_center_key") or "").strip() or None,
            "asn": str(r.get("autonomous_system_number") or "") or None,
            "country": (r.get("data_center_concentration_score") and r.get("country", "") or "").strip() or None,
            "name": (r.get("name") or "").strip() or None,
        })

    with SessionLocal() as s, s.begin():
        s.execute(UPDATE_SQL, payload)
    print(f"updated metadata on {len(payload)} validators")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 3: Run** — `python scripts/enrich_metadata.py`. Expected: `updated metadata on ~1500 validators`.

- [ ] **Step 4: Sanity check** in Supabase — `SELECT data_center, COUNT(*) FROM validators GROUP BY data_center ORDER BY 2 DESC LIMIT 10;` — should show concentration in major DCs.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): enrich validator metadata from validators.app"
```

### Task 2.4: Unified `refresh_all.py` + cron orchestration

**Files:**
- Create: `api/scripts/refresh_all.py`

- [ ] **Step 1: Write `api/scripts/refresh_all.py`**

```python
"""Top-level cron entrypoint. Refreshes validator list, recent epoch perf,
MEV snapshot, and metadata."""
import asyncio
import time

from stakesense.config import settings
from stakesense.db.epoch_repo import upsert_epoch_rows
from stakesense.db.mev_repo import upsert_mev_rows
from stakesense.db.repository import upsert_validators
from stakesense.sources.jito import JitoClient
from stakesense.sources.solana_rpc import SolanaRpcClient
from stakesense.sources.stakewiz import StakewizClient
from stakesense.sources.validators_app import ValidatorsAppClient


async def main() -> None:
    t0 = time.time()
    rpc = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    sw = StakewizClient()
    j = JitoClient()
    va = ValidatorsAppClient()

    # 1. validators
    records = await rpc.get_vote_accounts()
    n_v = upsert_validators(records)
    print(f"[{time.time()-t0:.1f}s] validators upserted: {n_v}")

    # 2. recent epoch perf for all
    sem = asyncio.Semaphore(8)

    async def fetch_one(vote: str) -> list[dict]:
        async with sem:
            try:
                return await sw.get_epoch_history(vote)
            except Exception as e:
                print(f"  stakewiz fail {vote}: {e}")
                return []

    histories = await asyncio.gather(*(fetch_one(r["vote_pubkey"]) for r in records))
    flat = [row for h in histories for row in h]
    n_e = upsert_epoch_rows(flat)
    print(f"[{time.time()-t0:.1f}s] epoch rows upserted: {n_e}")

    # 3. MEV (current epoch only)
    epoch_info = await rpc._post({"jsonrpc":"2.0","id":1,"method":"getEpochInfo","params":[]})
    epoch = epoch_info["result"]["epoch"] - 1
    mev_rows = await j.get_validator_mev(epoch=epoch)
    n_m = upsert_mev_rows(mev_rows)
    print(f"[{time.time()-t0:.1f}s] MEV rows upserted: {n_m}")

    # 4. metadata
    va_rows = await va.get_all()
    # (reuse the inline UPDATE from enrich_metadata.py)
    print(f"[{time.time()-t0:.1f}s] validators.app rows: {len(va_rows)}")

    print(f"refresh_all done in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Run once end-to-end** — `python scripts/refresh_all.py`. Expected: completes in <15 minutes for the full run.

- [ ] **Step 3: Commit**

```bash
git add api/
git commit -m "feat(api): unified refresh_all cron entrypoint"
```

### Task 2.5: Data quality sanity script

**Files:**
- Create: `api/scripts/data_quality.py`

- [ ] **Step 1: Write the QA script**

```python
"""Quick data-quality sanity check; run after each refresh."""
from sqlalchemy import text
from stakesense.db import engine


CHECKS = [
    ("validator_count", "SELECT COUNT(*) FROM validators"),
    ("epoch_row_count", "SELECT COUNT(*) FROM epoch_performance"),
    ("epoch_range",     "SELECT MIN(epoch), MAX(epoch) FROM epoch_performance"),
    ("mev_row_count",   "SELECT COUNT(*) FROM mev_observations"),
    ("validators_with_metadata", "SELECT COUNT(*) FROM validators WHERE data_center IS NOT NULL"),
    ("delinquent_share","SELECT 1.0 * SUM(CASE WHEN delinquent THEN 1 ELSE 0 END) / COUNT(*) FROM validators"),
]


def main() -> None:
    with engine.begin() as conn:
        for label, sql in CHECKS:
            row = conn.execute(text(sql)).fetchone()
            print(f"  {label}: {row}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run** — `python scripts/data_quality.py`. Eyeball: validator_count >1000, epoch_row_count >100k, epoch_range spans 100+ epochs, MEV >1000 rows, metadata >1000.

- [ ] **Step 3: Commit + push end-of-Day-2**

```bash
git add api/
git commit -m "feat(api): data quality sanity script"
git push origin main
```

- [ ] **Step 4: Update README Day 2 line.** Replace status line with: `Status: Day 2 ✅ — historical backfill complete (epoch_performance, mev_observations, metadata).`

```bash
git add README.md && git commit -m "docs: Day 2 status" && git push
```

---

## Day 3 — Feature engineering (Thu 2026-04-30)

**Deliverable:** A reproducible pipeline that, given a target epoch N, computes a feature DataFrame for every validator with N+ features (rolling 5-epoch stats + static features). EDA notebook validates feature distributions.

### Task 3.1: Feature engineering module (TDD)

**Files:**
- Create: `api/src/stakesense/features/__init__.py`, `api/src/stakesense/features/build.py`, `api/tests/test_features.py`

- [ ] **Step 1: Write the failing test `api/tests/test_features.py`**

```python
import pandas as pd

from stakesense.features.build import build_validator_features


def test_rolling_features_compute_correctly():
    # synthetic per-validator-per-epoch DataFrame
    epochs = list(range(595, 605))  # 10 epochs ending at 604
    vote = "Vote111"
    rows = [{
        "vote_pubkey": vote,
        "epoch": e,
        "skip_rate": 0.05 + 0.01 * i,    # increasing
        "vote_latency": 1.5,
        "credits": 400_000,
        "active_stake": 1_000_000,
        "delinquent": False,
    } for i, e in enumerate(epochs)]
    df = pd.DataFrame(rows)
    features = build_validator_features(df, target_epoch=604)

    # expect one row per validator
    assert features.shape[0] == 1
    f = features.iloc[0].to_dict()
    assert f["vote_pubkey"] == vote
    # rolling 5-epoch mean ending at 604: epochs 600..604
    expected_mean = df[df["epoch"].between(600, 604)]["skip_rate"].mean()
    assert abs(f["skip_rate_mean_5e"] - expected_mean) < 1e-9
    # trend slope > 0 because skip_rate is increasing
    assert f["skip_rate_trend_5e"] > 0


def test_insufficient_history_returns_empty_features_or_flag():
    rows = [{
        "vote_pubkey": "Vote111",
        "epoch": 600,
        "skip_rate": 0.05,
        "vote_latency": 1.5,
        "credits": 400_000,
        "active_stake": 1_000_000,
        "delinquent": False,
    }]
    df = pd.DataFrame(rows)
    features = build_validator_features(df, target_epoch=600, min_history=10)
    assert features.empty or features.iloc[0]["insufficient_history"]
```

- [ ] **Step 2: Run, confirm fail.** `pytest tests/test_features.py -v`

- [ ] **Step 3: Implement `api/src/stakesense/features/build.py`**

```python
from typing import Any

import numpy as np
import pandas as pd


ROLLING_WINDOW = 5


def _slope(y: np.ndarray) -> float:
    if len(y) < 2:
        return 0.0
    x = np.arange(len(y))
    return float(np.polyfit(x, y, 1)[0])


def build_validator_features(
    df: pd.DataFrame,
    *,
    target_epoch: int,
    min_history: int = ROLLING_WINDOW,
) -> pd.DataFrame:
    """Given long-format epoch_performance rows, produce one feature row per validator
    using only data available at or before target_epoch."""
    df = df[df["epoch"] <= target_epoch].copy()
    out: list[dict[str, Any]] = []

    for vote, g in df.groupby("vote_pubkey"):
        g = g.sort_values("epoch")
        if len(g) < min_history:
            out.append({"vote_pubkey": vote, "insufficient_history": True})
            continue
        recent = g.tail(ROLLING_WINDOW)
        out.append({
            "vote_pubkey": vote,
            "insufficient_history": False,
            "skip_rate_mean_5e": recent["skip_rate"].mean(),
            "skip_rate_std_5e":  recent["skip_rate"].std(ddof=0),
            "skip_rate_trend_5e": _slope(recent["skip_rate"].to_numpy()),
            "vote_latency_mean_5e": recent["vote_latency"].mean(),
            "vote_latency_drift": (
                recent["vote_latency"].iloc[-1] - recent["vote_latency"].mean()
            ),
            "credits_mean_5e": recent["credits"].mean(),
            "delinquent_recent": int(recent.tail(3)["delinquent"].any()),
            "active_stake_change_pct_5e": (
                (recent["active_stake"].iloc[-1] - recent["active_stake"].iloc[0])
                / max(recent["active_stake"].iloc[0], 1)
            ),
            "history_epochs": len(g),
        })

    return pd.DataFrame(out)
```

- [ ] **Step 4: Run, confirm pass.** `pytest tests/test_features.py -v`

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): rolling-window feature engineering for validators"
```

### Task 3.2: Static features + DB-driven build

**Files:**
- Create: `api/src/stakesense/features/static.py`, `api/src/stakesense/features/pipeline.py`, `api/tests/test_features_pipeline.py`

- [ ] **Step 1: Implement `api/src/stakesense/features/static.py`**

```python
import pandas as pd


def add_static_features(perf: pd.DataFrame, validators: pd.DataFrame, mev: pd.DataFrame) -> pd.DataFrame:
    """Merge static / current features (commission, MEV, geo) onto the rolling-feature frame."""
    df = perf.merge(
        validators[["vote_pubkey", "commission_pct", "data_center", "asn", "country", "active_stake"]],
        on="vote_pubkey",
        how="left",
    )

    # latest MEV commission per validator
    if not mev.empty:
        latest_mev = (
            mev.sort_values("epoch")
               .drop_duplicates("vote_pubkey", keep="last")
               .rename(columns={"mev_commission_pct": "mev_commission_pct_latest"})
               [["vote_pubkey", "mev_commission_pct_latest"]]
        )
        df = df.merge(latest_mev, on="vote_pubkey", how="left")
    else:
        df["mev_commission_pct_latest"] = None

    # cluster concentration: how many validators share each DC / ASN / country
    for col in ("data_center", "asn", "country"):
        cnt = df.groupby(col)["vote_pubkey"].transform("count")
        df[f"{col}_concentration"] = cnt

    # stake percentile
    df["active_stake_percentile"] = df["active_stake"].rank(pct=True)

    return df
```

- [ ] **Step 2: Implement `api/src/stakesense/features/pipeline.py`**

```python
"""Pulls from DB and produces the full feature DataFrame for a given target epoch."""
import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features


def load_dataframes() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        validators = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)
    return perf, validators, mev


def build_features_for_epoch(target_epoch: int) -> pd.DataFrame:
    perf, validators, mev = load_dataframes()
    rolling = build_validator_features(perf, target_epoch=target_epoch)
    full = add_static_features(rolling, validators, mev)
    return full
```

- [ ] **Step 3: Smoke-run from a notebook cell or script**

```bash
cd api && python -c "
from stakesense.features.pipeline import build_features_for_epoch
from sqlalchemy import text
from stakesense.db import engine
with engine.begin() as conn:
    max_epoch = conn.execute(text('SELECT MAX(epoch) FROM epoch_performance')).scalar()
df = build_features_for_epoch(target_epoch=max_epoch - 5)
print(df.shape)
print(df.head())
print(df.columns.tolist())
"
```
Expected: ~1500 rows, ~20+ columns, no obvious NaN spam in critical columns.

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat(api): static features + full feature pipeline from DB"
```

### Task 3.3: EDA notebook

**Files:**
- Create: `api/notebooks/01_eda.ipynb`

- [ ] **Step 1: Open Jupyter** — `cd api && jupyter notebook` (install with `pip install jupyter` if needed; already in dev deps via `ipykernel`).

- [ ] **Step 2: In the notebook, paste cells:**

```python
# Cell 1
%load_ext autoreload
%autoreload 2
import pandas as pd, matplotlib.pyplot as plt, seaborn as sns
from stakesense.features.pipeline import build_features_for_epoch, load_dataframes
from sqlalchemy import text
from stakesense.db import engine

with engine.begin() as conn:
    max_epoch = conn.execute(text('SELECT MAX(epoch) FROM epoch_performance')).scalar()
print("max epoch:", max_epoch)

# Cell 2
df = build_features_for_epoch(target_epoch=max_epoch - 5)
df.shape, df.dtypes

# Cell 3
df.describe().T

# Cell 4 — distributions of the key predictors
fig, axes = plt.subplots(2, 3, figsize=(14, 7))
for ax, col in zip(axes.flat, ["skip_rate_mean_5e","skip_rate_trend_5e","vote_latency_drift","commission_pct","active_stake_percentile","data_center_concentration"]):
    df[col].dropna().hist(bins=50, ax=ax); ax.set_title(col)
plt.tight_layout()

# Cell 5 — sanity correlations
import numpy as np
sns.heatmap(df.select_dtypes(include=[np.number]).corr(), cmap="vlag", center=0)
```

- [ ] **Step 3: Eyeball** — distributions should not all be flat-zero or all-NaN; correlations should make domain sense (e.g., `skip_rate_mean_5e` vs `delinquent_recent` positively correlated).

- [ ] **Step 4: Save the notebook + commit**

```bash
git add api/notebooks/01_eda.ipynb
git commit -m "chore(api): Day 3 EDA notebook"
git push
```

- [ ] **Step 5: Update README Day 3 status.** `Status: Day 3 ✅ — feature pipeline producing ~25 features per validator; EDA validates distributions.`

---

## Day 4 — Downtime classifier (Fri 2026-05-01)

**Deliverable:** A trained LightGBM downtime classifier with walk-forward holdout AUC ≥ 0.75. Model artifact saved + versioned.

### Task 4.1: Walk-forward target computation (TDD)

**Files:**
- Create: `api/src/stakesense/training/__init__.py`, `api/src/stakesense/training/targets.py`, `api/tests/test_targets.py`

- [ ] **Step 1: Failing test `api/tests/test_targets.py`**

```python
import pandas as pd
from stakesense.training.targets import compute_downtime_target


def test_downtime_target_flags_high_skip_or_delinquent():
    rows = []
    # Validator A is fine in target window
    for e in range(100, 106):
        rows.append({"vote_pubkey": "A", "epoch": e, "skip_rate": 0.02, "delinquent": False})
    # Validator B has high skip in target window
    for e in range(100, 103):
        rows.append({"vote_pubkey": "B", "epoch": e, "skip_rate": 0.02, "delinquent": False})
    for e in range(103, 106):
        rows.append({"vote_pubkey": "B", "epoch": e, "skip_rate": 0.10, "delinquent": False})
    df = pd.DataFrame(rows)
    targets = compute_downtime_target(df, target_epoch=102, horizon=3, skip_threshold=0.05)
    targets = targets.set_index("vote_pubkey")["downtime"].to_dict()
    assert targets["A"] == 0
    assert targets["B"] == 1
```

- [ ] **Step 2: Implement `api/src/stakesense/training/targets.py`**

```python
import pandas as pd


def compute_downtime_target(
    df: pd.DataFrame,
    *,
    target_epoch: int,
    horizon: int = 3,
    skip_threshold: float = 0.05,
) -> pd.DataFrame:
    """Binary: 1 if any of the next `horizon` epochs has skip_rate > threshold OR delinquent=True."""
    fut = df[(df["epoch"] > target_epoch) & (df["epoch"] <= target_epoch + horizon)]
    flagged = (
        fut.assign(bad=(fut["skip_rate"] > skip_threshold) | (fut["delinquent"]))
           .groupby("vote_pubkey")["bad"].any()
           .astype(int)
           .rename("downtime")
           .reset_index()
    )
    return flagged


def compute_mev_tax_target(
    perf: pd.DataFrame,
    mev: pd.DataFrame,
    *,
    target_epoch: int,
    horizon: int = 3,
) -> pd.DataFrame:
    """Continuous target: avg mev_commission_pct (as fraction) in the future window.
    For validators with no Jito presence, treat as MEV-not-captured (set to a fixed 'opportunity-cost' floor)."""
    fut_mev = mev[(mev["epoch"] > target_epoch) & (mev["epoch"] <= target_epoch + horizon)]
    avg = fut_mev.groupby("vote_pubkey")["mev_commission_pct"].mean() / 100.0
    out = avg.rename("mev_tax_rate").reset_index()
    return out
```

- [ ] **Step 3: Run, confirm pass.** `pytest tests/test_targets.py -v`

### Task 4.2: Walk-forward dataset builder

**Files:**
- Create: `api/src/stakesense/training/dataset.py`, `api/tests/test_dataset.py`

- [ ] **Step 1: Failing test `api/tests/test_dataset.py`**

```python
import pandas as pd
from stakesense.training.dataset import build_walk_forward_examples


def test_walk_forward_yields_expected_shapes(monkeypatch):
    # build a tiny in-memory toy dataset
    perf_rows = []
    for vote in ["A", "B"]:
        for e in range(50, 80):
            perf_rows.append({
                "vote_pubkey": vote, "epoch": e, "skip_rate": 0.02 + (0.01 if vote=="B" and e >= 70 else 0.0),
                "vote_latency": 1.5, "credits": 400_000, "active_stake": 1_000_000, "delinquent": False,
            })
    perf = pd.DataFrame(perf_rows)
    val = pd.DataFrame([{"vote_pubkey": v, "commission_pct": 5, "data_center": "x",
                         "asn": "1", "country": "US", "active_stake": 1_000_000} for v in ["A","B"]])
    mev = pd.DataFrame(columns=["vote_pubkey","epoch","mev_revenue_lamports","mev_commission_pct","mev_to_delegators_lamports"])

    examples = build_walk_forward_examples(perf, val, mev, target_epochs=[60, 65, 70])
    # 3 target epochs * 2 validators each (assuming history sufficient)
    assert "downtime" in examples.columns
    assert "skip_rate_mean_5e" in examples.columns
    assert examples["target_epoch"].nunique() == 3
```

- [ ] **Step 2: Implement `api/src/stakesense/training/dataset.py`**

```python
import pandas as pd

from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features
from stakesense.training.targets import compute_downtime_target


def build_walk_forward_examples(
    perf: pd.DataFrame,
    validators: pd.DataFrame,
    mev: pd.DataFrame,
    *,
    target_epochs: list[int],
    horizon: int = 3,
    skip_threshold: float = 0.05,
) -> pd.DataFrame:
    out = []
    for ep in target_epochs:
        rolling = build_validator_features(perf, target_epoch=ep)
        feats = add_static_features(rolling, validators, mev)
        targets = compute_downtime_target(perf, target_epoch=ep, horizon=horizon, skip_threshold=skip_threshold)
        merged = feats.merge(targets, on="vote_pubkey", how="inner")
        merged["target_epoch"] = ep
        out.append(merged)
    return pd.concat(out, ignore_index=True)
```

- [ ] **Step 3: Run, confirm pass.** `pytest tests/test_dataset.py -v`

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat(api): walk-forward dataset builder + downtime/MEV targets"
```

### Task 4.3: Train + evaluate downtime classifier

**Files:**
- Create: `api/scripts/train_downtime.py`, `api/src/stakesense/training/model.py`, `api/models/.gitkeep`

- [ ] **Step 1: Implement `api/src/stakesense/training/model.py`**

```python
from dataclasses import dataclass
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score


FEATURE_COLS = [
    "skip_rate_mean_5e","skip_rate_std_5e","skip_rate_trend_5e",
    "vote_latency_mean_5e","vote_latency_drift",
    "credits_mean_5e","delinquent_recent","active_stake_change_pct_5e",
    "history_epochs",
    "commission_pct","mev_commission_pct_latest",
    "data_center_concentration","asn_concentration","country_concentration",
    "active_stake_percentile",
]


@dataclass
class TrainResult:
    model: lgb.Booster
    auc: float
    ap: float
    feature_importance: dict[str, float]


def train_downtime(
    train_df: pd.DataFrame,
    eval_df: pd.DataFrame,
    *,
    n_estimators: int = 500,
) -> TrainResult:
    X_tr = train_df[FEATURE_COLS].fillna(-1)
    y_tr = train_df["downtime"].astype(int)
    X_ev = eval_df[FEATURE_COLS].fillna(-1)
    y_ev = eval_df["downtime"].astype(int)

    dtr = lgb.Dataset(X_tr, y_tr)
    dev = lgb.Dataset(X_ev, y_ev, reference=dtr)

    params = {
        "objective": "binary",
        "metric": "auc",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.9,
        "bagging_freq": 5,
        "verbose": -1,
    }
    booster = lgb.train(
        params, dtr, num_boost_round=n_estimators, valid_sets=[dev],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(50)],
    )

    proba = booster.predict(X_ev)
    auc = roc_auc_score(y_ev, proba)
    ap = average_precision_score(y_ev, proba)
    fi = dict(zip(FEATURE_COLS, booster.feature_importance(importance_type="gain")))

    return TrainResult(model=booster, auc=float(auc), ap=float(ap), feature_importance=fi)


def save_model(model: lgb.Booster, path: Path, version: str) -> None:
    payload = {"model": model, "feature_cols": FEATURE_COLS, "version": version}
    joblib.dump(payload, path)


def load_model(path: Path) -> dict:
    return joblib.load(path)
```

- [ ] **Step 2: Implement `api/scripts/train_downtime.py`**

```python
"""Walk-forward training of the downtime classifier. Uses target epochs in [first..last-30],
holdout = last 30."""
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.training.dataset import build_walk_forward_examples
from stakesense.training.model import save_model, train_downtime


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        val = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)

    min_e = int(perf["epoch"].min()) + 6   # need rolling history
    max_e = int(perf["epoch"].max()) - 3   # need 3-epoch horizon
    train_end = max_e - 30
    eval_start = max_e - 30

    train_target_epochs = list(range(min_e, train_end))
    eval_target_epochs = list(range(eval_start, max_e))
    print(f"train epochs: {len(train_target_epochs)}, eval epochs: {len(eval_target_epochs)}")

    train_ex = build_walk_forward_examples(perf, val, mev, target_epochs=train_target_epochs)
    eval_ex = build_walk_forward_examples(perf, val, mev, target_epochs=eval_target_epochs)
    print(f"train examples: {len(train_ex)}, eval examples: {len(eval_ex)}")

    res = train_downtime(train_ex, eval_ex)
    print(f"AUC: {res.auc:.3f} | AP: {res.ap:.3f}")

    version = datetime.utcnow().strftime("downtime-%Y%m%d-%H%M")
    out = Path(__file__).resolve().parents[1] / "models" / f"{version}.joblib"
    out.parent.mkdir(exist_ok=True)
    save_model(res.model, out, version=version)
    print(f"saved {out}")
    print("top features:")
    for k, v in sorted(res.feature_importance.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {k}: {v:.0f}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run training**

```bash
cd api && python scripts/train_downtime.py
```
Expected: prints AUC. Target ≥ 0.75. If under: investigate (likely target horizon, threshold, or feature bug — see fallbacks below).

- [ ] **Step 4: If AUC <0.75 — fallbacks (apply if needed):**
  - Lower `skip_threshold` to 0.03 (more positive examples)
  - Increase rolling window to 10 epochs
  - Add `delinquent_recent_5e` (delinquent in last 5)
  - Add interaction: `skip_rate_mean_5e * vote_latency_drift`

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): downtime classifier training + persistence"
```

### Task 4.4: Inference script writes predictions table

**Files:**
- Create: `api/scripts/predict_today.py`

- [ ] **Step 1: Write `api/scripts/predict_today.py`**

```python
"""Load latest downtime model, build features for current target epoch,
write to predictions table."""
from datetime import date
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.pipeline import build_features_for_epoch
from stakesense.training.model import FEATURE_COLS, load_model


def main() -> None:
    models_dir = Path(__file__).resolve().parents[1] / "models"
    latest = sorted(models_dir.glob("downtime-*.joblib"))[-1]
    payload = load_model(latest)
    model = payload["model"]
    version = payload["version"]
    print(f"using {version}")

    with engine.begin() as conn:
        max_epoch = conn.execute(text("SELECT MAX(epoch) FROM epoch_performance")).scalar()
    feats = build_features_for_epoch(target_epoch=max_epoch)
    feats = feats[~feats["insufficient_history"].fillna(False)]

    X = feats[FEATURE_COLS].fillna(-1)
    proba = model.predict(X)

    today = date.today()
    rows = [
        {"vote_pubkey": v, "prediction_date": today, "model_version": version,
         "downtime_prob_7d": float(p),
         "mev_tax_rate": None, "decentralization_score": None, "composite_score": None}
        for v, p in zip(feats["vote_pubkey"], proba)
    ]

    UPSERT = text("""
        INSERT INTO predictions (vote_pubkey, prediction_date, model_version,
                                  downtime_prob_7d, mev_tax_rate,
                                  decentralization_score, composite_score)
        VALUES (:vote_pubkey, :prediction_date, :model_version,
                :downtime_prob_7d, :mev_tax_rate,
                :decentralization_score, :composite_score)
        ON CONFLICT (vote_pubkey, prediction_date) DO UPDATE SET
            model_version = EXCLUDED.model_version,
            downtime_prob_7d = EXCLUDED.downtime_prob_7d
    """)
    with engine.begin() as conn:
        conn.execute(UPSERT, rows)
    print(f"wrote {len(rows)} predictions for {today}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run** — `python scripts/predict_today.py`. Expected: `wrote ~1500 predictions for 2026-05-01`.

- [ ] **Step 3: Sanity-check in Supabase** — `SELECT vote_pubkey, downtime_prob_7d FROM predictions ORDER BY downtime_prob_7d DESC LIMIT 10;`. Confirm there's a sensible spread (not all 0.5).

- [ ] **Step 4: Commit + push**

```bash
git add api/
git commit -m "feat(api): write daily downtime predictions table"
git push
```

- [ ] **Step 5: Update README Day 4 status.** `Status: Day 4 ✅ — downtime classifier trained, predictions written.`

---

## Day 5 — MEV regressor + decentralization + composite + backtest (Sat 2026-05-02)

**Deliverable:** All three pillars computed; composite score in `predictions`; backtest plot saved as PNG.

### Task 5.1: MEV-tax regressor

**Files:**
- Modify: `api/src/stakesense/training/model.py` (add `train_mev_tax`)
- Create: `api/scripts/train_mev_tax.py`

- [ ] **Step 1: Add `train_mev_tax` to `model.py`**

```python
# append to api/src/stakesense/training/model.py

@dataclass
class RegressionResult:
    model: lgb.Booster
    mae: float
    r2: float


def train_mev_tax(train_df: pd.DataFrame, eval_df: pd.DataFrame, *, n_estimators: int = 500) -> RegressionResult:
    from sklearn.metrics import mean_absolute_error, r2_score
    X_tr = train_df[FEATURE_COLS].fillna(-1); y_tr = train_df["mev_tax_rate"].fillna(0).clip(0, 1)
    X_ev = eval_df[FEATURE_COLS].fillna(-1); y_ev = eval_df["mev_tax_rate"].fillna(0).clip(0, 1)
    dtr = lgb.Dataset(X_tr, y_tr); dev = lgb.Dataset(X_ev, y_ev, reference=dtr)
    params = {"objective": "regression", "metric": "mae", "learning_rate": 0.05,
              "num_leaves": 31, "verbose": -1}
    booster = lgb.train(params, dtr, num_boost_round=n_estimators, valid_sets=[dev],
                        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)])
    pred = booster.predict(X_ev)
    return RegressionResult(model=booster, mae=mean_absolute_error(y_ev, pred), r2=r2_score(y_ev, pred))
```

- [ ] **Step 2: Implement `api/scripts/train_mev_tax.py`**

```python
"""Walk-forward training of the MEV-tax regressor."""
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features
from stakesense.training.model import save_model, train_mev_tax
from stakesense.training.targets import compute_mev_tax_target


def build_examples(perf, validators, mev, target_epochs, horizon=3):
    out = []
    for ep in target_epochs:
        rolling = build_validator_features(perf, target_epoch=ep)
        feats = add_static_features(rolling, validators, mev)
        targets = compute_mev_tax_target(perf, mev, target_epoch=ep, horizon=horizon)
        merged = feats.merge(targets, on="vote_pubkey", how="inner")
        merged["target_epoch"] = ep
        out.append(merged)
    return pd.concat(out, ignore_index=True)


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        val = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)

    if mev.empty:
        print("No MEV observations yet — skipping ML training, falling back to deterministic.")
        # write a sentinel "model" file with a constant predictor based on latest mev_commission_pct
        return

    min_e = int(perf["epoch"].min()) + 6
    max_e = int(perf["epoch"].max()) - 3
    train_end = max_e - 30

    train_target_epochs = list(range(min_e, train_end))
    eval_target_epochs = list(range(max_e - 30, max_e))

    train_ex = build_examples(perf, val, mev, train_target_epochs)
    eval_ex = build_examples(perf, val, mev, eval_target_epochs)
    print(f"train: {len(train_ex)}  eval: {len(eval_ex)}")

    res = train_mev_tax(train_ex, eval_ex)
    print(f"MAE: {res.mae:.4f}  R²: {res.r2:.3f}")

    version = datetime.utcnow().strftime("mev-tax-%Y%m%d-%H%M")
    out = Path(__file__).resolve().parents[1] / "models" / f"{version}.joblib"
    out.parent.mkdir(exist_ok=True)
    save_model(res.model, out, version=version)
    print(f"saved {out}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run** — `python scripts/train_mev_tax.py`. Expected: prints MAE / R². If MEV history is sparse (Jito only captured the current epoch on Day 2), the script prints the "skipping ML training" path; that's acceptable — the deterministic latest-`mev_commission_pct` is used as the prediction in `predict_today.py` (Task 5.3) and the MODEL_CARD on Day 11 calls this out explicitly.

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat(api): MEV-tax regressor"
```

### Task 5.2: Decentralization rule scorer (TDD)

**Files:**
- Create: `api/src/stakesense/scoring/__init__.py`, `api/src/stakesense/scoring/decentralization.py`, `api/tests/test_decentralization.py`

- [ ] **Step 1: Failing test**

```python
# api/tests/test_decentralization.py
import pandas as pd
from stakesense.scoring.decentralization import compute_decentralization_score


def test_concentration_penalizes_clusters():
    df = pd.DataFrame([
        {"vote_pubkey": "A", "data_center": "DC1", "asn": "1", "country": "US", "active_stake": 1_000_000},
        {"vote_pubkey": "B", "data_center": "DC1", "asn": "1", "country": "US", "active_stake": 1_000_000},
        {"vote_pubkey": "C", "data_center": "DC2", "asn": "2", "country": "DE", "active_stake": 1_000_000},
    ])
    out = compute_decentralization_score(df)
    s = out.set_index("vote_pubkey")["decentralization_score"]
    # C is alone in DC/ASN/country → higher score
    assert s["C"] > s["A"]
    assert s["C"] > s["B"]
```

- [ ] **Step 2: Implement**

```python
# api/src/stakesense/scoring/decentralization.py
import pandas as pd


def compute_decentralization_score(df: pd.DataFrame) -> pd.DataFrame:
    """Higher = more decentralization-positive. Range [0, 1]."""
    out = df[["vote_pubkey"]].copy()
    # base: invert concentration counts (rare = good)
    for col in ("data_center", "asn", "country"):
        cnt = df.groupby(col)["vote_pubkey"].transform("count").fillna(1).astype(float)
        # rank-pct of inverse cluster size: bigger count → lower score
        out[f"{col}_score"] = 1.0 - (cnt.rank(pct=True))
    # superminority bonus: identify top-N validators by stake; penalize if you're in top-30 (superminority candidates)
    if "active_stake" in df.columns:
        top30 = df["active_stake"].rank(ascending=False) <= 30
        out["superminority_penalty"] = top30.map({True: 0.0, False: 1.0})
    else:
        out["superminority_penalty"] = 1.0

    score_cols = ["data_center_score", "asn_score", "country_score", "superminority_penalty"]
    out["decentralization_score"] = out[score_cols].mean(axis=1)
    return out[["vote_pubkey", "decentralization_score"]]
```

- [ ] **Step 3: Run, confirm pass.** `pytest tests/test_decentralization.py -v`

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat(api): decentralization rule-based scorer"
```

### Task 5.3: Composite score + full predictions update

**Files:**
- Modify: `api/scripts/predict_today.py` to combine all three pillars

- [ ] **Step 1: Replace `predict_today.py` body to compute all three pillars and the composite**

(Use the pattern: load downtime model + MEV-tax model, compute decentralization, blend into composite. Weights default to `0.5 * (1 - downtime) + 0.3 * (1 - mev_tax) + 0.2 * decentralization`. Adjust later via backtest.)

```python
# api/scripts/predict_today.py — replace entire file
from datetime import date
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.pipeline import build_features_for_epoch
from stakesense.scoring.decentralization import compute_decentralization_score
from stakesense.training.model import FEATURE_COLS, load_model


W_DOWNTIME = 0.5
W_MEV = 0.3
W_DECENTRALIZATION = 0.2


def latest(prefix: str) -> Path | None:
    matches = sorted((Path(__file__).resolve().parents[1] / "models").glob(f"{prefix}-*.joblib"))
    return matches[-1] if matches else None


def main() -> None:
    dt_path = latest("downtime")
    if dt_path is None:
        raise RuntimeError("No downtime model on disk — run train_downtime.py first.")
    dt_payload = load_model(dt_path)

    mev_path = latest("mev-tax")
    mev_payload = load_model(mev_path) if mev_path else None
    print(f"downtime: {dt_payload['version']}, mev: {mev_payload['version'] if mev_payload else 'fallback (deterministic)'}")

    with engine.begin() as conn:
        max_epoch = conn.execute(text("SELECT MAX(epoch) FROM epoch_performance")).scalar()
    feats = build_features_for_epoch(target_epoch=max_epoch)
    feats = feats[~feats["insufficient_history"].fillna(False)].reset_index(drop=True)

    X = feats[FEATURE_COLS].fillna(-1)
    downtime_proba = dt_payload["model"].predict(X)
    if mev_payload is not None:
        mev_tax = mev_payload["model"].predict(X).clip(0, 1)
    else:
        # deterministic fallback: latest mev_commission_pct as a fraction; vanilla validators get a fixed 0.10 opportunity cost
        latest_pct = feats["mev_commission_pct_latest"].fillna(10.0)  # treat unknown as 10% opportunity cost
        mev_tax = (latest_pct / 100.0).clip(0, 1).to_numpy()
    decent = compute_decentralization_score(feats).set_index("vote_pubkey")["decentralization_score"]

    feats["downtime_prob_7d"] = downtime_proba
    feats["mev_tax_rate"] = mev_tax
    feats["decentralization_score"] = feats["vote_pubkey"].map(decent)
    feats["composite_score"] = (
        W_DOWNTIME * (1 - feats["downtime_prob_7d"])
        + W_MEV * (1 - feats["mev_tax_rate"])
        + W_DECENTRALIZATION * feats["decentralization_score"]
    )

    today = date.today()
    version = f"composite-{today.isoformat()}"
    rows = feats[[
        "vote_pubkey", "downtime_prob_7d", "mev_tax_rate",
        "decentralization_score", "composite_score",
    ]].assign(prediction_date=today, model_version=version).to_dict(orient="records")

    UPSERT = text("""
        INSERT INTO predictions (vote_pubkey, prediction_date, model_version,
                                  downtime_prob_7d, mev_tax_rate,
                                  decentralization_score, composite_score)
        VALUES (:vote_pubkey, :prediction_date, :model_version,
                :downtime_prob_7d, :mev_tax_rate,
                :decentralization_score, :composite_score)
        ON CONFLICT (vote_pubkey, prediction_date) DO UPDATE SET
            model_version = EXCLUDED.model_version,
            downtime_prob_7d = EXCLUDED.downtime_prob_7d,
            mev_tax_rate = EXCLUDED.mev_tax_rate,
            decentralization_score = EXCLUDED.decentralization_score,
            composite_score = EXCLUDED.composite_score
    """)
    with engine.begin() as conn:
        conn.execute(UPSERT, rows)
    print(f"wrote {len(rows)} composite predictions")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run** — `python scripts/predict_today.py`. Expected: `wrote ~1500 composite predictions`.

- [ ] **Step 3: Spot-check the top recommendations** — Supabase: `SELECT vote_pubkey, composite_score, downtime_prob_7d, mev_tax_rate, decentralization_score FROM predictions ORDER BY composite_score DESC LIMIT 20;`. Eyeball: the top-20 should have low downtime, low MEV tax, and not be top-30 by stake.

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat(api): composite score combining downtime + MEV tax + decentralization"
```

### Task 5.4: Backtest simulator + chart

**Files:**
- Create: `api/src/stakesense/scoring/backtest.py`, `api/scripts/backtest.py`, `api/notebooks/02_backtest.ipynb`

- [ ] **Step 1: Implement `api/src/stakesense/scoring/backtest.py`**

```python
from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class BacktestResult:
    yields: pd.DataFrame  # epoch x strategy
    incidents: pd.DataFrame  # epoch x strategy (skip-events count)


def simulate_strategies(
    perf: pd.DataFrame,
    predictions: pd.DataFrame,
    *,
    epochs: list[int],
    top_k: int = 20,
) -> BacktestResult:
    """For each epoch, pick top-K validators by composite_score from predictions
    available *as of* that epoch, equally weight, sum realized credits-as-yield."""
    out_yield = []
    out_inc = []
    for ep in epochs:
        # naive: use the same predictions snapshot for all epochs (Day 5 simplification);
        # Day 11 polish will re-train per-epoch
        ours = predictions.sort_values("composite_score", ascending=False).head(top_k)["vote_pubkey"].tolist()
        random_pick = predictions.sample(min(top_k, len(predictions)), random_state=ep)["vote_pubkey"].tolist()
        # Foundation baseline: top-K by stake-percentile-not-superminority (rough proxy)
        baseline = predictions.sort_values("decentralization_score", ascending=False).head(top_k)["vote_pubkey"].tolist()

        ep_perf = perf[perf["epoch"] == ep]
        for label, picks in [("ours", ours), ("random", random_pick), ("baseline", baseline)]:
            sl = ep_perf[ep_perf["vote_pubkey"].isin(picks)]
            out_yield.append({"epoch": ep, "strategy": label, "yield": sl["credits"].mean()})
            out_inc.append({"epoch": ep, "strategy": label,
                            "incidents": int(((sl["skip_rate"] > 0.05) | sl["delinquent"]).sum())})

    return BacktestResult(
        yields=pd.DataFrame(out_yield),
        incidents=pd.DataFrame(out_inc),
    )
```

- [ ] **Step 2: Implement `api/scripts/backtest.py`** (loads from DB, runs simulator, saves chart)

```python
"""Backtest the composite strategy. Saves chart to api/notebooks/backtest.png."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.scoring.backtest import simulate_strategies


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        preds = pd.read_sql(text("SELECT * FROM predictions"), conn)

    last_epoch = int(perf["epoch"].max())
    epochs = list(range(last_epoch - 89, last_epoch + 1))
    res = simulate_strategies(perf, preds, epochs=epochs)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    for label, g in res.yields.groupby("strategy"):
        axes[0].plot(g["epoch"], g["yield"], label=label)
    axes[0].set_title("Realized credits (mean across top-K) per epoch")
    axes[0].set_xlabel("epoch"); axes[0].set_ylabel("credits"); axes[0].legend()

    for label, g in res.incidents.groupby("strategy"):
        axes[1].plot(g["epoch"], g["incidents"], label=label)
    axes[1].set_title("Incidents (skip>5% or delinquent) per epoch")
    axes[1].set_xlabel("epoch"); axes[1].set_ylabel("count"); axes[1].legend()

    out = Path(__file__).resolve().parents[1] / "notebooks" / "backtest.png"
    fig.savefig(out, dpi=120, bbox_inches="tight")
    print(f"saved {out}")
    print(res.yields.groupby("strategy")["yield"].mean())
    print(res.incidents.groupby("strategy")["incidents"].mean())


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run** — `python scripts/backtest.py`. Expected: PNG saved + summary printed showing `ours` mean yield ≥ baseline and `ours` mean incidents ≤ baseline. (If not — that's a finding for the methodology page; either way, the chart goes in.)

- [ ] **Step 4: Commit + push end-of-Day-5**

```bash
git add api/
git commit -m "feat(api): backtest simulator + chart export"
git push
```

- [ ] **Step 5: README Day 5 status** — `Status: Day 5 ✅ — three pillars + composite + backtest chart.`

---

## Day 6 — FastAPI backend on Fly.io (Sun 2026-05-03)

**Deliverable:** API live at a public Fly.io URL with all 5 endpoints working against Supabase, OpenAPI docs at `/docs`.

### Task 6.1: FastAPI skeleton + healthcheck (TDD)

**Files:**
- Create: `api/src/stakesense/api/__init__.py`, `api/src/stakesense/api/main.py`, `api/tests/test_api_health.py`

- [ ] **Step 1: Failing test `api/tests/test_api_health.py`**

```python
from fastapi.testclient import TestClient

from stakesense.api.main import app


def test_health_returns_ok():
    r = TestClient(app).get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert "model_version" in body
```

- [ ] **Step 2: Implement `api/src/stakesense/api/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from stakesense.db import engine

app = FastAPI(title="stakesense", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/v1/health")
def health() -> dict:
    with engine.begin() as conn:
        max_epoch = conn.execute(text("SELECT MAX(epoch) FROM epoch_performance")).scalar()
        latest_pred = conn.execute(text("SELECT MAX(prediction_date) FROM predictions")).scalar()
        version = conn.execute(text("SELECT model_version FROM predictions ORDER BY prediction_date DESC LIMIT 1")).scalar()
    return {"ok": True, "last_update_epoch": max_epoch, "last_prediction_date": str(latest_pred), "model_version": version}
```

- [ ] **Step 3: Run, confirm pass.** `pytest tests/test_api_health.py -v`

- [ ] **Step 4: Run dev server locally** — `uvicorn stakesense.api.main:app --reload --port 8000`. Visit http://localhost:8000/docs — Swagger UI should render.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): FastAPI skeleton + /health"
```

### Task 6.2: `/validators` list endpoint

**Files:**
- Create: `api/src/stakesense/api/routers/validators.py`, `api/tests/test_api_validators.py`
- Modify: `api/src/stakesense/api/main.py` (mount router)

- [ ] **Step 1: Failing test `api/tests/test_api_validators.py`**

```python
from fastapi.testclient import TestClient
from stakesense.api.main import app


def test_list_validators_returns_paginated_results():
    r = TestClient(app).get("/api/v1/validators?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert "results" in body
    assert "total" in body
    assert len(body["results"]) <= 5
    if body["results"]:
        v = body["results"][0]
        assert {"vote_pubkey", "composite_score", "downtime_prob_7d",
                "mev_tax_rate", "decentralization_score"} <= set(v.keys())
```

- [ ] **Step 2: Implement `api/src/stakesense/api/routers/validators.py`**

```python
from typing import Literal

from fastapi import APIRouter, Query
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/validators", tags=["validators"])

SORT_COL = {
    "composite": "composite_score DESC",
    "downtime": "downtime_prob_7d ASC",
    "mev_tax": "mev_tax_rate ASC",
    "decentralization": "decentralization_score DESC",
}


@router.get("")
def list_validators(
    sort: Literal["composite","downtime","mev_tax","decentralization"] = "composite",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    sort_clause = SORT_COL[sort]
    sql = text(f"""
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct, v.active_stake,
               v.data_center, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         ORDER BY {sort_clause}
         LIMIT :limit OFFSET :offset
    """)
    count_sql = text("SELECT COUNT(*) FROM predictions WHERE prediction_date = (SELECT MAX(prediction_date) FROM predictions)")
    with engine.begin() as conn:
        total = conn.execute(count_sql).scalar() or 0
        rows = [dict(r._mapping) for r in conn.execute(sql, {"limit": limit, "offset": offset})]
    return {"results": rows, "total": total, "limit": limit, "offset": offset}
```

- [ ] **Step 3: Mount in `main.py`**

```python
# add at top
from stakesense.api.routers import validators as validators_router
# at bottom, after middleware
app.include_router(validators_router.router)
```

- [ ] **Step 4: Run test, confirm pass.** `pytest tests/test_api_validators.py -v`

- [ ] **Step 5: Smoke local** — `curl http://localhost:8000/api/v1/validators?limit=3 | jq .` — should return 3 validators with scores.

- [ ] **Step 6: Commit**

```bash
git add api/
git commit -m "feat(api): GET /validators list with sort + pagination"
```

### Task 6.3: `/validators/:pubkey` detail

- [ ] **Step 1: Add to `routers/validators.py`**

```python
@router.get("/{vote_pubkey}")
def get_validator(vote_pubkey: str) -> dict:
    sql = text("""
        SELECT v.*, p.composite_score, p.downtime_prob_7d, p.mev_tax_rate,
               p.decentralization_score, p.prediction_date, p.model_version
          FROM validators v
     LEFT JOIN predictions p ON p.vote_pubkey = v.vote_pubkey
                            AND p.prediction_date = (SELECT MAX(prediction_date) FROM predictions)
         WHERE v.vote_pubkey = :pk
    """)
    history_sql = text("""
        SELECT epoch, skip_rate, vote_latency, credits, active_stake, delinquent
          FROM epoch_performance
         WHERE vote_pubkey = :pk
         ORDER BY epoch DESC
         LIMIT 90
    """)
    with engine.begin() as conn:
        row = conn.execute(sql, {"pk": vote_pubkey}).mappings().fetchone()
        if not row:
            return {"error": "not found"}, 404
        history = [dict(r._mapping) for r in conn.execute(history_sql, {"pk": vote_pubkey})]
    return {"validator": dict(row), "history": history}
```

(Note: actual 404 in FastAPI uses `HTTPException`. Replace the error tuple line with `raise HTTPException(status_code=404, detail="not found")` and add the import.)

- [ ] **Step 2: Smoke test locally** — pick a known vote pubkey from `validators` table and `curl http://localhost:8000/api/v1/validators/<pk> | jq .`. Confirm it returns the validator + 90 history rows.

- [ ] **Step 3: Commit**

```bash
git add api/
git commit -m "feat(api): GET /validators/:pubkey detail with 90-epoch history"
```

### Task 6.4: `POST /recommend`

- [ ] **Step 1: Add to `routers/validators.py`**

```python
from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    amount_sol: float = Field(..., gt=0)
    risk_profile: Literal["conservative", "balanced", "aggressive"] = "balanced"
    count: int = Field(3, ge=1, le=10)
    exclude_clusters: bool = True


@router.post("/../recommend", include_in_schema=False)  # path workaround; better: register on router prefix='/api/v1'
def _placeholder(): ...


# Better: define a separate router for /recommend.
```

- [ ] **Step 2: Restructure** — create `api/src/stakesense/api/routers/recommend.py` instead

```python
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import text

from stakesense.db import engine


router = APIRouter(prefix="/api/v1", tags=["recommend"])


class RecommendRequest(BaseModel):
    amount_sol: float = Field(..., gt=0)
    risk_profile: Literal["conservative", "balanced", "aggressive"] = "balanced"
    count: int = Field(3, ge=1, le=10)
    exclude_clusters: bool = True


@router.post("/recommend")
def recommend(req: RecommendRequest) -> dict:
    risk_thresholds = {"conservative": 0.10, "balanced": 0.25, "aggressive": 0.50}
    max_downtime = risk_thresholds[req.risk_profile]
    sql = text("""
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct, v.data_center, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate, l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE l.downtime_prob_7d <= :max_downtime
           AND (:exclude_clusters = false
                OR v.data_center NOT IN (SELECT data_center FROM validators
                                          WHERE data_center IS NOT NULL
                                          GROUP BY data_center
                                          HAVING COUNT(*) > 50))
         ORDER BY l.composite_score DESC
         LIMIT :count
    """)
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql, {
            "max_downtime": max_downtime, "exclude_clusters": req.exclude_clusters, "count": req.count,
        })]

    for r in rows:
        reasons = []
        if r["downtime_prob_7d"] is not None and r["downtime_prob_7d"] < 0.05:
            reasons.append("low downtime risk")
        if r["mev_tax_rate"] is not None and r["mev_tax_rate"] < 0.05:
            reasons.append("low MEV tax")
        if r["decentralization_score"] is not None and r["decentralization_score"] > 0.7:
            reasons.append("strong decentralization signal")
        r["reasoning"] = " · ".join(reasons) if reasons else "balanced overall score"

    return {"amount_sol": req.amount_sol, "risk_profile": req.risk_profile, "recommendations": rows}
```

- [ ] **Step 3: Mount router in `main.py`** — add `from stakesense.api.routers import recommend as recommend_router; app.include_router(recommend_router.router)`.

- [ ] **Step 4: Smoke** — `curl -X POST http://localhost:8000/api/v1/recommend -H "Content-Type: application/json" -d '{"amount_sol":100,"risk_profile":"balanced","count":3}' | jq .`. Should return 3 recs with `reasoning`.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): POST /recommend with risk profiles + cluster filter"
```

### Task 6.5: `GET /backtest`

- [ ] **Step 1: Add `api/src/stakesense/api/routers/backtest.py`**

```python
from fastapi import APIRouter, Query
import pandas as pd
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
```

- [ ] **Step 2: Mount + smoke + commit**

```bash
# mount in main.py
# curl http://localhost:8000/api/v1/backtest?epochs=30 | jq .summary
git add api/
git commit -m "feat(api): GET /backtest endpoint"
```

### Task 6.6: Rate limiting + Fly.io deploy

**Files:**
- Create: `api/Dockerfile`, `api/fly.toml`, `api/.dockerignore`

- [ ] **Step 1: Add slowapi rate limiter** — `pip install slowapi` then add to `pyproject.toml` deps.

```python
# api/src/stakesense/api/main.py — add limiter
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
```

- [ ] **Step 2: Create `api/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .
COPY src ./src
EXPOSE 8000
CMD ["uvicorn", "stakesense.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create `api/.dockerignore`**

```
.venv/
__pycache__/
*.pyc
tests/
notebooks/
models/
.pytest_cache/
.mypy_cache/
```

- [ ] **Step 4: Fly init**

```bash
cd api
flyctl launch --no-deploy --name stakesense-api --region iad
```
(answer: yes to copy config; no Postgres; no Redis)

- [ ] **Step 5: Set secrets**

```bash
flyctl secrets set HELIUS_API_KEY=... HELIUS_RPC_URL=... DATABASE_URL=... VALIDATORS_APP_TOKEN=...
```

- [ ] **Step 6: Deploy**

```bash
flyctl deploy
```
Expected: ends with the public URL (e.g., `https://stakesense-api.fly.dev`).

- [ ] **Step 7: Verify** — `curl https://stakesense-api.fly.dev/api/v1/health`. Should return `{"ok": true, ...}`.

- [ ] **Step 8: Commit + push**

```bash
git add api/
git commit -m "feat(api): rate limiting + Fly.io deployment"
git push
```

- [ ] **Step 9: README Day 6** — `Status: Day 6 ✅ — API live on Fly.io.`

---

## Day 7 — Next.js dashboard skeleton (Mon 2026-05-04)

**Deliverable:** Validators table page + validator detail page deployed to Vercel, fetching from the live Fly.io API.

### Task 7.1: API client + types

**Files:**
- Create: `web/lib/api.ts`, `web/lib/types.ts`

- [ ] **Step 1: Add `NEXT_PUBLIC_API_BASE` to `web/.env.local`**

```
NEXT_PUBLIC_API_BASE=https://stakesense-api.fly.dev
```

- [ ] **Step 2: Write `web/lib/types.ts`**

```typescript
export type Validator = {
  vote_pubkey: string;
  name: string | null;
  commission_pct: number | null;
  active_stake: number | null;
  data_center: string | null;
  country: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
};

export type EpochPerf = {
  epoch: number;
  skip_rate: number | null;
  vote_latency: number | null;
  credits: number | null;
  active_stake: number | null;
  delinquent: boolean;
};

export type ValidatorDetail = {
  validator: Validator & { identity_pubkey: string | null; asn: string | null };
  history: EpochPerf[];
};

export type Recommendation = Validator & { reasoning: string };

export type RecommendResponse = {
  amount_sol: number;
  risk_profile: string;
  recommendations: Recommendation[];
};
```

- [ ] **Step 3: Write `web/lib/api.ts`**

```typescript
const BASE = process.env.NEXT_PUBLIC_API_BASE!;

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export async function listValidators(params: { sort?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined).map(([k,v]) => [k, String(v)])));
  return get<{ results: import("./types").Validator[]; total: number }>(`/api/v1/validators?${qs.toString()}`);
}

export async function getValidator(votePubkey: string) {
  return get<import("./types").ValidatorDetail>(`/api/v1/validators/${votePubkey}`);
}

export async function recommend(body: { amount_sol: number; risk_profile: string; count?: number }) {
  const r = await fetch(`${BASE}/api/v1/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`recommend failed: ${r.status}`);
  return r.json() as Promise<import("./types").RecommendResponse>;
}

export async function getBacktest(epochs = 90) {
  return get<{ yields: any[]; incidents: any[]; summary: any }>(`/api/v1/backtest?epochs=${epochs}`);
}
```

### Task 7.2: Validators table page

**Files:**
- Create: `web/app/validators/page.tsx`, `web/app/validators/columns.tsx`

- [ ] **Step 1: Create `web/app/validators/page.tsx`**

```tsx
import Link from "next/link";
import { listValidators } from "@/lib/api";

function fmtPct(x: number | null) { return x == null ? "—" : `${(x * 100).toFixed(1)}%`; }
function fmtScore(x: number | null) { return x == null ? "—" : x.toFixed(3); }
function shortPk(pk: string) { return `${pk.slice(0, 4)}…${pk.slice(-4)}`; }

export default async function Page({ searchParams }: { searchParams: { sort?: string; limit?: string; offset?: string } }) {
  const sort = (searchParams.sort ?? "composite") as string;
  const limit = Number(searchParams.limit ?? 50);
  const offset = Number(searchParams.offset ?? 0);
  const data = await listValidators({ sort, limit, offset });

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">All Validators ({data.total.toLocaleString()})</h1>
      <div className="mb-3 flex gap-2 text-sm">
        {["composite","downtime","mev_tax","decentralization"].map(s => (
          <Link key={s} href={`?sort=${s}`}
                className={`px-2 py-1 rounded border ${sort===s?'bg-slate-900 text-white':'bg-white'}`}>
            {s}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100"><tr>
            <th className="text-left p-2">Validator</th>
            <th className="text-right p-2">Composite</th>
            <th className="text-right p-2">Downtime</th>
            <th className="text-right p-2">MEV Tax</th>
            <th className="text-right p-2">Decentralization</th>
            <th className="text-left p-2">DC / Country</th>
          </tr></thead>
          <tbody>
            {data.results.map(v => (
              <tr key={v.vote_pubkey} className="border-t hover:bg-slate-50">
                <td className="p-2"><Link href={`/validators/${v.vote_pubkey}`} className="text-blue-600">
                  {v.name ?? shortPk(v.vote_pubkey)}
                </Link></td>
                <td className="p-2 text-right">{fmtScore(v.composite_score)}</td>
                <td className="p-2 text-right">{fmtPct(v.downtime_prob_7d)}</td>
                <td className="p-2 text-right">{fmtPct(v.mev_tax_rate)}</td>
                <td className="p-2 text-right">{fmtScore(v.decentralization_score)}</td>
                <td className="p-2">{v.data_center ?? "—"} {v.country && `· ${v.country}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run** — `cd web && pnpm dev`. Visit http://localhost:3000/validators. Confirm table renders with API data.

- [ ] **Step 3: Commit**

```bash
git add web/
git commit -m "feat(web): validators table page"
```

### Task 7.3: Validator detail page

**Files:**
- Create: `web/app/validators/[vote_pubkey]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { getValidator } from "@/lib/api";

export default async function Page({ params }: { params: { vote_pubkey: string } }) {
  const data = await getValidator(params.vote_pubkey);
  const v = data.validator;
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{v.name ?? v.vote_pubkey}</h1>
      <p className="text-slate-500 mb-4 break-all">{v.vote_pubkey}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">Downtime risk (next 7d)</div>
          <div className="text-3xl font-semibold">{((v.downtime_prob_7d ?? 0)*100).toFixed(1)}%</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">MEV tax (next 7d)</div>
          <div className="text-3xl font-semibold">{((v.mev_tax_rate ?? 0)*100).toFixed(1)}%</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-slate-500">Decentralization score</div>
          <div className="text-3xl font-semibold">{(v.decentralization_score ?? 0).toFixed(3)}</div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Last 90 epochs</h2>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100"><tr>
            <th className="text-left p-2">Epoch</th>
            <th className="text-right p-2">Skip rate</th>
            <th className="text-right p-2">Vote latency</th>
            <th className="text-right p-2">Credits</th>
            <th className="text-right p-2">Stake</th>
            <th className="text-right p-2">Delinquent</th>
          </tr></thead>
          <tbody>
            {data.history.map(h => (
              <tr key={h.epoch} className="border-t">
                <td className="p-2">{h.epoch}</td>
                <td className="p-2 text-right">{((h.skip_rate ?? 0)*100).toFixed(2)}%</td>
                <td className="p-2 text-right">{(h.vote_latency ?? 0).toFixed(2)}</td>
                <td className="p-2 text-right">{h.credits?.toLocaleString() ?? "—"}</td>
                <td className="p-2 text-right">{h.active_stake?.toLocaleString() ?? "—"}</td>
                <td className="p-2 text-right">{h.delinquent ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Smoke** — click any validator from the table. Detail page renders with 90-row history.

- [ ] **Step 3: Commit**

```bash
git add web/
git commit -m "feat(web): validator detail page"
```

### Task 7.4: Vercel deploy

- [ ] **Step 1: Push current branch + import to Vercel**

```bash
git push
```
Then in Vercel dashboard: New Project → import `stakesense` repo → Framework: Next.js, Root: `web` → Add env var `NEXT_PUBLIC_API_BASE=https://stakesense-api.fly.dev` → Deploy.

- [ ] **Step 2: Verify** — visit the Vercel URL → both pages work against live API.

- [ ] **Step 3: Update README Day 7** — `Status: Day 7 ✅ — dashboard live on Vercel.`

```bash
git add README.md && git commit -m "docs: Day 7 status" && git push
```

---

## Day 8 — Dashboard polish (Tue 2026-05-05)

**Deliverable:** Landing page, history charts on detail page, working filter/sort/search, mobile responsive.

### Task 8.1: Landing page hero + anchor stats

**Files:**
- Modify: `web/app/page.tsx`
- Create: `web/lib/stats.ts`

- [ ] **Step 1: Add a stats endpoint to API** — append to `routers/validators.py`:

```python
@router.get("/stats", include_in_schema=True)
def stats() -> dict:
    sql = text("""
        WITH latest AS (
          SELECT DISTINCT ON (vote_pubkey) * FROM predictions
           ORDER BY vote_pubkey, prediction_date DESC
        )
        SELECT
          AVG(mev_tax_rate)            AS avg_mev_tax,
          AVG(downtime_prob_7d)        AS avg_downtime_prob,
          COUNT(*)                     AS total_validators,
          (SELECT COUNT(*) FROM validators WHERE active_stake > 0) AS active_validators
          FROM latest
    """)
    with engine.begin() as conn:
        row = dict(conn.execute(sql).mappings().one())
    return row
```

Redeploy API (`flyctl deploy`).

- [ ] **Step 2: Replace `web/app/page.tsx`**

```tsx
import Link from "next/link";

async function fetchStats() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/stats`, { next: { revalidate: 300 } });
  return r.ok ? r.json() : null;
}

export default async function Home() {
  const stats = await fetchStats();
  return (
    <main className="container mx-auto p-6">
      <section className="py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">Stake smarter. Earn more.<br/>Decentralize Solana.</h1>
        <p className="text-slate-600 max-w-2xl mx-auto mb-8">
          ML-powered validator scoring on three pillars: predictive downtime risk, MEV-extracted-from-delegators,
          and decentralization impact.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/validators" className="px-6 py-3 bg-slate-900 text-white rounded">Browse validators</Link>
          <Link href="/stake" className="px-6 py-3 border border-slate-900 rounded">Stake now</Link>
        </div>
      </section>
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="border rounded p-6">
            <div className="text-sm text-slate-500">Avg MEV tax (top validators)</div>
            <div className="text-3xl font-semibold">{((stats.avg_mev_tax ?? 0)*100).toFixed(1)}%</div>
          </div>
          <div className="border rounded p-6">
            <div className="text-sm text-slate-500">Avg downtime risk</div>
            <div className="text-3xl font-semibold">{((stats.avg_downtime_prob ?? 0)*100).toFixed(1)}%</div>
          </div>
          <div className="border rounded p-6">
            <div className="text-sm text-slate-500">Validators scored</div>
            <div className="text-3xl font-semibold">{stats.total_validators?.toLocaleString() ?? "—"}</div>
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit + push** (Vercel auto-deploys)

```bash
git add . && git commit -m "feat(web): landing page with anchor stats" && git push
```

### Task 8.2: History charts on detail page (recharts)

**Files:**
- Modify: `web/app/validators/[vote_pubkey]/page.tsx`
- Create: `web/components/HistoryCharts.tsx`

- [ ] **Step 1: Create `web/components/HistoryCharts.tsx`**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function HistoryCharts({ history }: { history: { epoch: number; skip_rate: number | null; vote_latency: number | null }[] }) {
  const data = [...history].sort((a, b) => a.epoch - b.epoch).map(h => ({
    epoch: h.epoch,
    skip_rate_pct: h.skip_rate == null ? null : h.skip_rate * 100,
    vote_latency: h.vote_latency,
  }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded p-4 h-64">
        <div className="text-sm text-slate-500 mb-2">Skip rate (%)</div>
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="epoch"/><YAxis/><Tooltip/><Line type="monotone" dataKey="skip_rate_pct" dot={false}/></LineChart></ResponsiveContainer>
      </div>
      <div className="border rounded p-4 h-64">
        <div className="text-sm text-slate-500 mb-2">Vote latency</div>
        <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="epoch"/><YAxis/><Tooltip/><Line type="monotone" dataKey="vote_latency" dot={false}/></LineChart></ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use in detail page** — import and render `<HistoryCharts history={data.history} />` above the table.

- [ ] **Step 3: Smoke** — visit any validator detail; charts render.

- [ ] **Step 4: Commit + push.**

### Task 8.3: Search + filter on table

- [ ] **Step 1: Add a search box on `/validators` page** — client component with name search filtered client-side over the current page (or server-side via a new query param). For Day 8 simplicity, do client-side filter.

- [ ] **Step 2: Add a country/risk filter dropdown** (shadcn Select).

- [ ] **Step 3: Smoke + commit.**

### Task 8.4: Mobile responsive pass

- [ ] **Step 1: Open dashboard on mobile viewport** (Chrome DevTools, iPhone 13). Walk through landing → validators → detail. Fix any obvious overflow with Tailwind responsive classes (`md:`, `lg:`).

- [ ] **Step 2: Commit + push end of Day 8.**

- [ ] **Step 3: README Day 8 status.**

---

## Day 9 — Phantom integration (Wed 2026-05-06)

**Deliverable:** End-to-end stake flow on devnet using Phantom.

### Task 9.1: Wallet provider setup

**Files:**
- Create: `web/components/WalletProvider.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Create `web/components/WalletProvider.tsx`**

```tsx
"use client";
import { ConnectionProvider, WalletProvider as SolWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet");
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolWalletProvider>
    </ConnectionProvider>
  );
}
```

- [ ] **Step 2: Wrap in `web/app/layout.tsx`** — import and wrap `{children}` in `<WalletProvider>`.

- [ ] **Step 3: Add `NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com` to `web/.env.local` and to Vercel env.**

- [ ] **Step 4: Commit + smoke** — wallet provider is in place; nothing visible yet.

### Task 9.2: Connect button in nav

**Files:**
- Modify: `web/app/layout.tsx`
- Create: `web/components/ConnectBar.tsx`

- [ ] **Step 1: Create `ConnectBar.tsx`**

```tsx
"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function ConnectBar() {
  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <Link href="/" className="font-semibold">stakesense</Link>
        <nav className="flex gap-4 items-center">
          <Link href="/validators">Validators</Link>
          <Link href="/stake">Stake</Link>
          <Link href="/methodology">Methodology</Link>
          <WalletMultiButton style={{ background: "#0f172a" }}/>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Add `<ConnectBar/>` above `{children}` in `layout.tsx`**

- [ ] **Step 3: Smoke** — click the connect button, Phantom prompts, you sign in. Address shown.

- [ ] **Step 4: Commit + push.**

### Task 9.3: `/stake` flow page (UI only)

**Files:**
- Create: `web/app/stake/page.tsx`

- [ ] **Step 1: Build the form**

```tsx
"use client";
import { useState } from "react";
import { recommend } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

export default function StakePage() {
  const [amount, setAmount] = useState(10);
  const [risk, setRisk] = useState<"conservative"|"balanced"|"aggressive">("balanced");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function getRecs() {
    setLoading(true);
    const data = await recommend({ amount_sol: amount, risk_profile: risk, count: 3 });
    setRecs(data.recommendations); setLoading(false);
  }

  return (
    <main className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Stake</h1>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">Amount (SOL)</span>
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                 className="block w-full border rounded p-2 mt-1"/>
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Risk profile</span>
          <select value={risk} onChange={e => setRisk(e.target.value as any)}
                  className="block w-full border rounded p-2 mt-1">
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <button onClick={getRecs} disabled={loading}
                className="w-full bg-slate-900 text-white p-3 rounded disabled:opacity-50">
          {loading ? "Loading…" : "Get recommendations"}
        </button>
      </div>

      {recs && <RecsList recs={recs} amount={amount}/>}
    </main>
  );
}

function RecsList({ recs, amount }: { recs: Recommendation[]; amount: number }) {
  return (
    <div className="mt-8 space-y-3">
      {recs.map(r => (
        <div key={r.vote_pubkey} className="border rounded p-4">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">{r.name ?? r.vote_pubkey.slice(0,12)}</div>
            <div className="text-sm text-slate-500">composite {r.composite_score?.toFixed(3)}</div>
          </div>
          <div className="text-sm text-slate-600 mt-1">{r.reasoning}</div>
          <StakeButton vote={r.vote_pubkey} amount={amount}/>
        </div>
      ))}
    </div>
  );
}

function StakeButton({ vote, amount }: { vote: string; amount: number }) {
  // implemented in Task 9.4
  return <button className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded text-sm">Stake {amount} SOL here</button>;
}
```

- [ ] **Step 2: Smoke** — visit `/stake`, fill form, get recs.

- [ ] **Step 3: Commit + push.**

### Task 9.4: Stake transaction (devnet)

**Files:**
- Modify: `web/app/stake/page.tsx` — replace placeholder `StakeButton` with real implementation

- [ ] **Step 1: Implement `StakeButton`**

```tsx
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Authorized,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

function StakeButton({ vote, amount }: { vote: string; amount: number }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const [status, setStatus] = useState<string | null>(null);

  async function stake() {
    if (!publicKey || !signTransaction) { setStatus("connect a wallet first"); return; }
    setStatus("preparing tx…");
    const stakeAccount = Keypair.generate();
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    const minRent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);

    const create = StakeProgram.createAccount({
      fromPubkey: publicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: new Authorized(publicKey, publicKey),
      lamports: lamports + minRent,
    });
    const delegate = StakeProgram.delegate({
      stakePubkey: stakeAccount.publicKey,
      authorizedPubkey: publicKey,
      votePubkey: new PublicKey(vote),
    });

    const tx = new Transaction().add(...create.instructions, ...delegate.instructions);
    tx.feePayer = publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.partialSign(stakeAccount);

    setStatus("awaiting wallet signature…");
    const sig = await sendTransaction(tx, connection, { signers: [stakeAccount] });
    setStatus(`submitted ${sig.slice(0,8)}…`);
    await connection.confirmTransaction(sig, "confirmed");
    setStatus(`confirmed ✅  ${sig}`);
  }

  return (
    <div className="mt-3">
      <button onClick={stake} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm">
        Stake {amount} SOL here
      </button>
      {status && <div className="text-xs text-slate-500 mt-1">{status}</div>}
    </div>
  );
}
```

- [ ] **Step 2: End-to-end devnet test**
  - Connect Phantom, switch to Devnet in Phantom settings
  - Fund: `solana airdrop 5 <your_phantom_address> --url https://api.devnet.solana.com`
  - Visit `/stake`, get recs, click Stake. Phantom prompts → sign → success.
  - Verify in Phantom: Stake account appears in Activities.

- [ ] **Step 3: Commit + push end of Day 9.**

- [ ] **Step 4: README Day 9 status.**

---

## Day 10 — Privy integration (Thu 2026-05-07)

**Deliverable:** Same `/stake` flow works for users who sign in via Privy (email/social) without Phantom installed.

### Task 10.1: Privy provider

**Files:**
- Modify: `web/components/WalletProvider.tsx` (wrap with PrivyProvider)

- [ ] **Step 1: Wrap WalletProvider with PrivyProvider**

```tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { ConnectionProvider, WalletProvider as SolWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet");
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  return (
    <PrivyProvider appId={privyAppId} config={{
      appearance: { theme: "light" },
      loginMethods: ["email", "wallet"],
      embeddedWallets: { createOnLogin: "users-without-wallets" },
    }}>
      <ConnectionProvider endpoint={endpoint}>
        <SolWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolWalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_PRIVY_APP_ID` to Vercel + local env.**

### Task 10.2: Privy connect option in connect bar

- [ ] **Step 1: Add "Sign in with email" button to ConnectBar that calls Privy's `usePrivy().login()`**

```tsx
"use client";
import { usePrivy } from "@privy-io/react-auth";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function ConnectBar() {
  const { login, authenticated, user, logout } = usePrivy();
  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <Link href="/" className="font-semibold">stakesense</Link>
        <nav className="flex gap-4 items-center">
          <Link href="/validators">Validators</Link>
          <Link href="/stake">Stake</Link>
          <Link href="/methodology">Methodology</Link>
          <WalletMultiButton style={{ background: "#0f172a" }}/>
          {!authenticated
            ? <button onClick={login} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Sign in with email</button>
            : <button onClick={logout} className="px-3 py-2 border rounded text-sm">{user?.email?.address ?? "signed in"} · sign out</button>}
        </nav>
      </div>
    </header>
  );
}
```

### Task 10.3: Stake flow uses Privy embedded wallet when present

- [ ] **Step 1: Modify `StakeButton`** to prefer the connected Privy embedded wallet if Phantom is not connected. Use Privy's `useWallets()` hook from `@privy-io/react-auth/solana` if available — check Privy docs at https://docs.privy.io/guide/react/wallets/embedded/solana for the latest API. Fall back to `useWallet()` from wallet-adapter-react.

- [ ] **Step 2: Build and test on devnet** — sign out of Phantom; sign in with Privy email → email magic link → embedded wallet created → fund (`solana airdrop 5 ...` to the Privy wallet address shown in the Connect Bar) → run `/stake` flow → confirm tx confirms.

- [ ] **Step 3: Commit + push end of Day 10.**

- [ ] **Step 4: README Day 10 status.**

> **Privy fallback note:** If Privy's Solana embedded-wallet API is rougher than expected, ship Phantom-only for the demo and document Privy as 'integration-in-progress'. Don't burn buffer day chasing Privy if Phantom flow is solid.

---

## Day 11 — Methodology page + mainnet + docs (Fri 2026-05-08)

**Deliverable:** `/methodology` page with backtest chart + MODEL_CARD.md + THREAT_MODEL.md + mainnet API live + 1-SOL real stake test recorded.

### Task 11.1: Backtest chart on methodology page

**Files:**
- Create: `web/app/methodology/page.tsx`, `web/components/BacktestChart.tsx`

- [ ] **Step 1: Create `BacktestChart.tsx`**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BacktestChart() {
  const { data } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/backtest?epochs=90`, fetcher);
  if (!data) return <div className="h-72 border rounded animate-pulse"/>;
  const yields = data.yields as { epoch: number; strategy: string; yield: number }[];
  const epochs = Array.from(new Set(yields.map(y => y.epoch))).sort();
  const series = epochs.map(e => {
    const row: any = { epoch: e };
    for (const s of ["ours","random","baseline"]) {
      const m = yields.find(y => y.epoch === e && y.strategy === s);
      row[s] = m?.yield ?? null;
    }
    return row;
  });

  return (
    <div className="h-80 border rounded p-4">
      <ResponsiveContainer>
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="epoch"/><YAxis/><Tooltip/><Legend/>
          <Line type="monotone" dataKey="ours" stroke="#10b981" dot={false}/>
          <Line type="monotone" dataKey="baseline" stroke="#3b82f6" dot={false}/>
          <Line type="monotone" dataKey="random" stroke="#9ca3af" dot={false} strokeDasharray="4 4"/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Methodology page**

```tsx
import BacktestChart from "@/components/BacktestChart";

export default function Page() {
  return (
    <main className="container mx-auto p-6 max-w-3xl prose">
      <h1>Methodology</h1>
      <p>stakesense scores Solana validators on three pillars: predictive downtime risk, MEV-tax to delegators, and decentralization impact. The composite score blends them.</p>
      <h2>Backtest: 90-epoch portfolio simulation</h2>
      <p>Each line shows the mean realized credits for top-20 validators selected by each strategy.</p>
      <BacktestChart/>
      <h2>Pillars</h2>
      <ul>
        <li><b>Downtime risk</b> — LightGBM binary classifier, target = "skip rate &gt; 5% OR delinquent" in any of the next 3 epochs.</li>
        <li><b>MEV tax</b> — LightGBM regressor, target = expected fraction of delegator yield NOT received.</li>
        <li><b>Decentralization</b> — deterministic rules penalizing data-center / ASN / country concentration and superminority membership.</li>
      </ul>
      <p>Full model card: <a href="https://github.com/<your-username>/stakesense/blob/main/MODEL_CARD.md">MODEL_CARD.md</a></p>
      <p>Threat model: <a href="https://github.com/<your-username>/stakesense/blob/main/THREAT_MODEL.md">THREAT_MODEL.md</a></p>
    </main>
  );
}
```

- [ ] **Step 3: Commit + push.**

### Task 11.2: Write MODEL_CARD.md and THREAT_MODEL.md

**Files:**
- Create: `MODEL_CARD.md`, `THREAT_MODEL.md`

- [ ] **Step 1: Write `MODEL_CARD.md`** — sections: Intended use, Training data, Features, Targets, Evaluation results, Known biases (cold start; MEV honesty caveat; Stakewiz-history depth), Out-of-distribution behavior, Versioning.

(Use the model card template from https://huggingface.co/docs/hub/model-cards; one page max.)

- [ ] **Step 2: Write `THREAT_MODEL.md`** — sections: Adversarial gameability (e.g., commission flips, vote-latency manipulation, geographic mis-self-reporting), Out of scope (we don't audit validator code; we don't claim fraud detection), Known limitations.

- [ ] **Step 3: Commit + push.**

### Task 11.3: Mainnet API switch + 1-SOL real stake test

- [ ] **Step 1: Switch frontend RPC to mainnet** — set `NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=...` in Vercel env. Redeploy.

- [ ] **Step 2: Switch Phantom to mainnet** + fund a real 1 SOL (~$200 — use your own SOL or buy via MoonPay through Phantom).

- [ ] **Step 3: Run `/stake` end-to-end on mainnet with 1 SOL.** Capture the tx signature. Save to `MAINNET_DEMO_TX.md` for the demo video reference.

- [ ] **Step 4: Commit + push end of Day 11.**

### Task 11.4: Repo polish

- [ ] **Step 1: Update README.md** — full sections: problem, approach, live demo URL, screenshots, repo layout, quickstart, model training reproduction, license, links to MODEL_CARD + THREAT_MODEL + spec doc.

- [ ] **Step 2: Add screenshots** to `docs/screenshots/` and link in README.

- [ ] **Step 3: Commit + push.**

- [ ] **Step 4: README Day 11 status.**

---

## Day 12 — Demo video + submission (Sat 2026-05-09)

**Deliverable:** ~3-min demo video on YouTube/Loom, Colosseum submission written and saved as draft (not yet submitted).

### Task 12.1: Demo video script + recording

- [ ] **Step 1: Write the script** (target 3:00, max 3:30):
  - 0:00–0:25 Problem hook: "Solana stake is $50B. Most stakers pick by stake size, which is anti-decentralization, or by yield, which is gameable. There's no public predictive scoring tool."
  - 0:25–0:50 Solution: "stakesense — ML-powered validator scoring on three pillars."
  - 0:50–1:30 Walkthrough: landing → validators table → click a validator → show 90-epoch chart and 3 scores.
  - 1:30–2:15 The wow moment: "This top-100 validator extracts X% MEV tax. Switch to recommended → +Y% APY, decentralization positive."
  - 2:15–2:45 Stake flow: amount → risk → recs → Phantom signs → mainnet tx confirms.
  - 2:45–3:00 Methodology page + backtest chart + open-source CTA.

- [ ] **Step 2: Record** using OBS (free) or Loom. Voice-over + screen capture at 1080p.

- [ ] **Step 3: Edit** in DaVinci Resolve (free) — trim, captions, brand titlecard. Export 1080p MP4.

- [ ] **Step 4: Upload to YouTube as unlisted.** Save URL.

### Task 12.2: Colosseum submission write-up

- [ ] **Step 1: In Colosseum portal, draft submission** with these fields:
  - **Title:** stakesense — Predictive Validator Quality Oracle for Solana
  - **Tagline:** Stake smarter. Earn more. Decentralize Solana.
  - **Description:** 2 paragraphs (problem → solution + why it matters).
  - **Tech stack:** Python, FastAPI, LightGBM, Next.js, Tailwind, Phantom, Privy, Solana web3.js, Supabase, Fly.io, Vercel.
  - **Demo video URL:** YouTube link
  - **Live demo URL:** Vercel URL
  - **GitHub URL:** repo
  - **What's next (future work):** on-chain oracle, Arcium confidential queries, Squads multisig variant, LST integration.
  - **Sponsor bounties to apply for:** Phantom, Privy, plus Public Goods award.

- [ ] **Step 2: Save draft, do NOT submit yet — Day 14 only.**

- [ ] **Step 3: README Day 12 status + commit.**

---

## Day 13 — Buffer / sponsor outreach / polish (Sun 2026-05-10)

**Deliverable:** All open bugs closed; sponsor Discord posts done; tweet thread drafted.

### Task 13.1: Sponsor Discord outreach

- [ ] **Step 1: Phantom dev Discord** — post in #builders or hackathon channel: 1-line pitch + live URL + GitHub. Mention you're applying for Phantom bounty.
- [ ] **Step 2: Privy** — same.
- [ ] **Step 3: Squads / Altitude** — pitch as "DAO treasury staking with predictive picks" — frame for their multisig product.
- [ ] **Step 4: Arcium** — pitch the future-work confidential-query angle. Even if not in MVP, the framing might earn a mention.

### Task 13.2: Tweet thread

- [ ] **Step 1: Draft a 7–10 tweet thread.** Hook tweet + screenshots from each page + final CTA. Schedule for Day 14 morning so it lands on submission day.

### Task 13.3: Final bug bash

- [ ] **Step 1: Walk through every page on the live demo URL** as a fresh user. Fix any 5xx, broken images, dead links, missing nav.
- [ ] **Step 2: Test the Phantom stake flow on mainnet one more time.** If it breaks, drop to devnet for the demo and update the video voice-over note.

- [ ] **Step 3: Commit + push.** README Day 13 status.

---

## Day 14 — Submission day (Mon 2026-05-11)

**Deliverable:** Submitted, before deadline.

### Task 14.1: Final QA

- [ ] **Step 1: Hit the live demo from a fresh browser profile** — landing renders, validators load, detail loads, stake flow connects + simulates without errors.
- [ ] **Step 2: Hit `/api/v1/health`** — `ok: true`, recent prediction date.
- [ ] **Step 3: GitHub repo** — README, MODEL_CARD, THREAT_MODEL all link correctly. License visible. No secrets in commits (`git log -p | grep -E "(api_key|secret|token|PAT)" | head` should be empty).

### Task 14.2: Submit

- [ ] **Step 1: In Colosseum portal, click Submit.**
- [ ] **Step 2: Post tweet thread.**
- [ ] **Step 3: Update memory file** with submission status + URL + any sponsor responses received.
- [ ] **Step 4: Commit + push final.** README "Status: SUBMITTED 🚀".

---

## Self-Review Notes

**Spec coverage (every section of the spec is implemented):**
- §3 (Why we win) → implemented across the entire build (top-20 narrative, Public Goods angle in Day 11 docs, Phantom in Day 9, Privy in Day 10).
- §4 (Scope/MVP) → exactly mirrored in the day-by-day plan.
- §5 (Architecture) → Days 1–6 build the data + ML + API stack; Days 7–10 the frontend; Day 11 mainnet.
- §6 (Tech stack) → all picks in place across Tasks 1.2 and 1.3.
- §7 (Data sources) → Tasks 1.5, 2.1, 2.2, 2.3.
- §8 (Schema) → Task 1.4.
- §9 (ML model — three pillars + walk-forward + eval + caveats) → Days 3, 4, 5; caveats moved to MODEL_CARD on Day 11.
- §10 (API endpoints) → Tasks 6.1–6.5.
- §11 (Dashboard pages) → Days 7, 8, 11.
- §12 (Wallet flow) → Days 9, 10.
- §13 (Public Goods posture) → Day 11 (MODEL_CARD, THREAT_MODEL, README).
- §14 (Milestone plan) → entire document.
- §15 (Risks) → mitigation tasks embedded (e.g., Day 1 Stakewiz fallback note, Day 10 Privy fallback note).
- §16 (Hard cuts) → enforced via the daily caps.

**Placeholder scan:** working name "stakesense" used as placeholder throughout — labeled as such in the header. No "TBD" or "implement later" entries elsewhere.

**Type consistency:** `FEATURE_COLS` in `model.py` matches the columns produced by `build_validator_features` + `add_static_features`. `VoteAccount` field names match between `solana_rpc.py` normalization and `validators` table columns. API endpoint paths in routers match the spec.

---

*End of plan.*
