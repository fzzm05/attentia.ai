import numpy as np
import json
import time

class BaselineState:
    _instance = None

    def __new__(cls, result=None):
        if cls._instance is None:
            if result is None:
                raise ValueError("Calibration result required to initialize Singleton.")
            cls._instance = super(BaselineState, cls).__new__(cls)
            cls._instance._initialize(result)
        return cls._instance

    def _initialize(self, result):
        # Store 52 raw blendshapes: {name: score}
        self.emotions = {b.category_name: b.score for b in result.face_blendshapes[0]}
        
        # Store 3D angles
        matrix = result.facial_transformation_matrixes[0]
        self.angles = self._extract_euler(matrix)
        self.created_at = time.time()
        print(f"Singleton Baseline created: {time.ctime(self.created_at)}")

    def _extract_euler(self, matrix):
        # Yaw (Left/Right) and Pitch (Up/Down)
        yaw = np.arctan2(matrix[0][2], matrix[2][2])
        pitch = np.arctan2(-matrix[1][2], np.sqrt(matrix[0][2]**2 + matrix[2][2]**2))
        return np.array([pitch, yaw])

    @classmethod
    def reset(cls):
        cls._instance = None

    def calculate_relative_deltas(self,current_result):
        """
        Modular Blackbox: Compares current MediaPipe result to the Baseline Singleton.
        Returns: Detailed JSON with individual keys for all 52 emotions and 2 angles.
        """
        if not current_result or not current_result.face_landmarks:
            return json.dumps({"error": "No face detected"})

        
        curr_ems = {b.category_name: b.score for b in current_result.face_blendshapes[0]}
        percentDelta_emotions = {}
        
        for name, base_val in self.emotions.items():
            curr_val = curr_ems.get(name, 0.0)
            # Avoid division by zero
            denom = base_val if base_val > 0.01 else 0.01
            pct_change = ((curr_val - base_val) / denom) * 100 #Individual Emotion Percentage Changes 
            
            # Create a unique key for every emotion point
            percentDelta_emotions[f"{name}_pct_change"] = round(pct_change, 2)

        # Individual Angle Changes (Degrees)
        curr_matrix = current_result.facial_transformation_matrixes[0]
        curr_angles = self._extract_euler(curr_matrix)
        angle_diff = np.degrees(curr_angles - self.angles)

        # Comprehensive JSON Construction 
        report = {
            "metadata": {
                "timestamp_unix": time.time()
            },
            "movement_deltas": {
                "pitch_deg_change": round(angle_diff[0], 2),
                "yaw_deg_change": round(angle_diff[1], 2)
            },
            "emotion_deltas": percentDelta_emotions
        }
        
        return report