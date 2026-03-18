# services/payment-event-service/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "payment-event-service"
    database_url: str
    redis_url: str = "redis://redis:6379"
    kafka_bootstrap_servers: str = "kafka:9092"
    kafka_topic_payment_created: str = "payment-created"
    kafka_group_id: str = "payment-event-service"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
