from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    q_table_path: Path
    face_model_path: Path
    frontend_path: Path
    audio_sample_rate: int = 44100
    audio_block_size: int = 1024
    audio_window_seconds: int = 8
    camera_interval_seconds: int = 5
    default_difficulty: int = 2
    default_gain_capability: int = 2
    host: str = "127.0.0.1"
    port: int = 8000


def load_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[3]
    return Settings(
        project_root=project_root,
        q_table_path=project_root / "model" / "Qtablemain.npy",
        face_model_path=project_root / "scripts" / "face_landmarker.task",
        frontend_path=project_root / "frontend" / "index.html",
    )
