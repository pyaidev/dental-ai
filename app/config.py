from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/plaque.db"
    yandex_gpt_api_key: str = ""
    yandex_gpt_folder_id: str = ""
    upload_dir: str = "./uploads"
    results_dir: str = "./results"
    secret_key: str = "change-me-in-production"

    # HSV ranges for plaque detection (blue-purple-pink stain)
    # Calibrated from client photos with dental plaque indicator
    plaque_h_min: int = 110
    plaque_h_max: int = 175
    plaque_s_min: int = 40
    plaque_s_max: int = 255
    plaque_v_min: int = 50
    plaque_v_max: int = 255

    # HSV ranges for clean enamel (yellowish-white)
    enamel_h_min: int = 10
    enamel_h_max: int = 35
    enamel_s_min: int = 0
    enamel_s_max: int = 100
    enamel_v_min: int = 100
    enamel_v_max: int = 255

    image_max_width: int = 800

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Ensure directories exist
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path(settings.results_dir).mkdir(parents=True, exist_ok=True)
Path("data").mkdir(parents=True, exist_ok=True)
