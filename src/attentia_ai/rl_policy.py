from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import numpy as np

from attentia_ai.helpers.config import Settings


ACTION_LABELS = {
    0: "play_music",
    1: "show_animation",
    2: "decrease_difficulty",
    3: "increase_difficulty",
    4: "do_nothing",
}


@dataclass
class PolicyDecision:
    action_index: int
    action_label: str
    q_values: list[float]
    source: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RLPolicy:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.q_table = None
        self._warnings: list[str] = []
        self._load_q_table()

    @property
    def warnings(self) -> list[str]:
        return list(self._warnings)

    def diagnostics(self) -> dict[str, Any]:
        return {
            "loaded": self.q_table is not None,
            "status": "ready" if self.q_table is not None else "missing_or_failed",
            "path": str(self.settings.q_table_path),
            "shape": list(self.q_table.shape) if self.q_table is not None else None,
            "warnings": list(self._warnings),
        }

    def decide(
        self,
        emotion: int,
        distraction: int,
        current_difficulty: int,
        gain_capability: int,
    ) -> PolicyDecision:
        if self.q_table is None:
            return PolicyDecision(
                action_index=4,
                action_label=ACTION_LABELS[4],
                q_values=[0.0] * 5,
                source="fallback",
            )

        q_values = self.q_table[emotion, distraction, current_difficulty, gain_capability]
        action_index = int(np.argmax(q_values))
        return PolicyDecision(
            action_index=action_index,
            action_label=ACTION_LABELS[action_index],
            q_values=[float(value) for value in q_values.tolist()],
            source="q_table",
        )

    def _load_q_table(self) -> None:
        if not self.settings.q_table_path.exists():
            self._warnings.append(f"missing Q-table at {self.settings.q_table_path}")
            return

        try:
            self.q_table = np.load(self.settings.q_table_path)
        except Exception as exc:
            self._warnings.append(f"failed to load Q-table: {exc}")
