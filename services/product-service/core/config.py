# services/product-service/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "product-service"
    database_url: str
    redis_url: str = "redis://redis:6379"
    kafka_bootstrap_servers: str = "kafka:9092"
    user_service_url: str
    inventory_service_url: str = "http://inventory-service:8000"
    internal_api_secret: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
