from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=["../.env", ".env"], extra="ignore")

    helius_api_key: str = ""
    helius_rpc_url: str = ""
    solana_rpc_url_mainnet: str = "https://api.mainnet-beta.solana.com"
    solana_rpc_url_devnet: str = "https://api.devnet.solana.com"
    validators_app_token: str = ""
    database_url: str = ""
    app_name: str = "stakesense"


settings = Settings()
