from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "", "case_sensitive": False}

    # Database
    database_url: str = "postgresql+asyncpg://medialedger:devpassword@localhost:5432/medialedger"

    # Security
    secret_key: str = "dev_secret_key_change_in_production"

    # App
    app_name: str = "MediaLedger"
    debug: bool = False
    log_level: str = "info"

    # Paths
    config_dir: str = "/config"
    geoip_db_path: str = "/config/data/GeoLite2-City.mmdb"

    # Stripe (optional)
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""


settings = Settings()
