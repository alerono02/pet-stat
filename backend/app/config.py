from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://pets:pets_secret@db:5432/pets_db"
    web_service_url: str = "http://web-service:8001"
    auto_create_tables: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
