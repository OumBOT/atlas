"""Configuration applicative (racine de composition).

Les valeurs proviennent des variables d'environnement, avec ``apps/api/.env``
en développement. Aucun secret n'a de valeur par défaut en dur.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Réglages d'exécution de l'API ATLAS."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="ATLAS_", extra="ignore")

    # Environnement
    env: str = "dev"
    debug: bool = True

    # Services
    database_url: str = "postgresql+asyncpg://atlas:atlas@localhost:5432/atlas"
    redis_url: str = "redis://localhost:6379/0"

    # Frontend autorisé (CORS)
    cors_origins: list[str] = ["http://localhost:5173"]

    # Moteur de langage (ADR-002) : Ollama en local par défaut,
    # n'importe quelle API compatible OpenAI par simple configuration.
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "qwen2.5:7b-instruct"
    llm_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    """Retourne les réglages (mis en cache pour tout le process)."""
    return Settings()
