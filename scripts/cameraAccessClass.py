import cv2
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class cv2Acess:
    def __init__(self):
        self.model_path = 'face_landmarker.task'
        self.cap = cv2.VideoCapture(0)
        
        # Configure MediaPipe Task settings
        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        self.options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=self.model_path),
            running_mode=VisionRunningMode.VIDEO,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1
        )
        
        self.landmarker = vision.FaceLandmarker.create_from_options(self.options)
        print("AI Engine Initialized and Ready.")

    def getMP_Raw(self):
        ret, frame = self.cap.read()
        if not ret:
            return None

        # process Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        timestamp_ms = int(time.time() * 1000)

        result = self.landmarker.detect_for_video(mp_image, timestamp_ms)

        if result and result.face_landmarks:
            return result
        return None

    def destroy(self):
        if hasattr(self, 'landmarker'):
            self.landmarker.close() 
        self.cap.release()
        cv2.destroyAllWindows()
        print("Hardware and AI Engine released.")