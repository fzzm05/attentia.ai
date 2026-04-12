export type BrowserSensorPacket = {
  type: "sensor_packet";
  sessionId: string;
  recordedAt: string;
  sequence: number;
  audio?: {
    mimeType?: string;
    sampleRate?: number;
    channelCount?: number;
    chunkBase64?: string;
    features?: {
      avgRms?: number;
      rmsVariance?: number;
      spectralCentroid?: number;
      noiseLevelHint?: number;
    };
  };
  video?: {
    mimeType?: string;
    frameBase64?: string;
    width?: number;
    height?: number;
    landmarks?: unknown;
  };
};

export type BrowserSessionControl =
  | {
      type: "begin_calibration";
      sessionId: string;
      childId: string;
      difficulty: number;
      gainCapability: number;
    }
  | {
      type: "stop_session";
      sessionId: string;
      reason?: string;
    };

export type PythonSessionEvent =
  | {
      type: "session_status";
      sessionId: string;
      status:
        | "awaiting_permissions"
        | "awaiting_calibration"
        | "calibrating"
        | "running"
        | "paused"
        | "stopped"
        | "failed";
      message?: string;
    }
  | {
      type: "calibration_progress";
      sessionId: string;
      recordedAt: string;
      progress: number;
      message?: string;
    }
  | {
      type: "calibration_result";
      sessionId: string;
      success: boolean;
      baselinePayload?: Record<string, unknown>;
      message?: string;
    }
  | {
      type: "state_update";
      sessionId: string;
      recordedAt: string;
      emotion: string;
      distraction: number;
      noiseLevel: number;
      currentDifficulty: number;
      gainCapability: number;
      faceDetected?: boolean;
      action?: string;
    }
  | {
      type: "intervention";
      sessionId: string;
      recordedAt: string;
      action: string;
      decisionSource: string;
      qValues?: number[];
      message?: string;
    }
  | {
      type: "warning";
      sessionId: string;
      recordedAt: string;
      code: string;
      message: string;
    };
