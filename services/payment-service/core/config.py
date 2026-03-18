# services/payment-service/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "payment-service"
    database_url: str
    redis_url: str = "redis://redis:6379"
    kafka_bootstrap_servers: str = "kafka:9092"
    kafka_topic_payment_created: str = "payment-created"
    order_service_url: str
    user_service_url: str
    internal_api_secret: str
    payment_success_rate: float = 0.8

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
