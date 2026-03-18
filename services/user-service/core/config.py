# services/user-service/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "user-service"
    database_url: str
    redis_url: str = "redis://redis:6379"
    kafka_bootstrap_servers: str = "kafka:9092"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    jwt_expire_minutes_user: int = 60
    jwt_expire_minutes_admin: int = 30
    admin_email: str
    admin_password: str
    admin_username: str = "admin"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
