"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  BrowserSensorPacket,
  PythonSessionEvent,
} from "@/lib/realtime/types";
import type { StudySessionData } from "@/lib/supabase/types";

type StudySessionScreenProps = {
  data: StudySessionData;
  wsUrl?: string;
};

type PermissionState = "unknown" | "granted" | "denied";

export function StudySessionScreen({ data, wsUrl }: StudySessionScreenProps) {
  const [cameraPermission, setCameraPermission] = useState<PermissionState>("unknown");
  const [microphonePermission, setMicrophonePermission] =
    useState<PermissionState>("unknown");
  const [engineStatus, setEngineStatus] = useState<string>(
    String(data.session.runtime_metadata.frontend_phase ?? "awaiting_permissions"),
  );
  const [events, setEvents] = useState<PythonSessionEvent[]>([]);
  const [socketReady, setSocketReady] = useState(false);
  const [transportError, setTransportError] = useState("");
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [stopping, setStopping] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sequenceRef = useRef(0);
  const hasSentCalibrationStartRef = useRef(false);
  const stoppingRef = useRef(false);
  const intentionalCloseRef = useRef(false);

  async function requestPermissions() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      mediaStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setCameraPermission("granted");
      setMicrophonePermission("granted");
      setEngineStatus("awaiting_calibration");
      setCalibrationProgress(0);
    } catch {
      setCameraPermission("denied");
      setMicrophonePermission("denied");
      setTransportError("The browser could not access the camera and microphone.");
    }
  }

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(`${wsUrl.replace(/\/$/, "")}/sessions/${data.session.id}`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setSocketReady(true);
      setTransportError("");
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as PythonSessionEvent;
        setEvents((current) => [payload, ...current].slice(0, 8));

        if (payload.type === "session_status") {
          setEngineStatus(payload.status);
          if (payload.status === "stopped") {
            setStopping(false);
            stoppingRef.current = false;
            intentionalCloseRef.current = true;
            void fetch(`/api/sessions/${data.session.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "stopped",
              }),
            });
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
            audioContextRef.current?.close().catch(() => undefined);
            audioContextRef.current = null;
            analyserRef.current = null;
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            socket.close();
          }
        }

        if (
          payload.type === "calibration_result" &&
          payload.success &&
          stoppingRef.current === false
        ) {
          setEngineStatus("running");
          setCalibrationProgress(100);
          void fetch(`/api/sessions/${data.session.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "running",
              baselineCalibrated: true,
              baselinePayload: payload.baselinePayload,
            }),
          });
        }

        if (payload.type === "calibration_progress") {
          setCalibrationProgress(payload.progress);
        }
      } catch {
        // Ignore malformed events until the realtime engine contract is fully wired.
      }
    });
    socket.addEventListener("error", () => {
      if (intentionalCloseRef.current || stoppingRef.current) {
        return;
      }
      setTransportError("The realtime engine websocket connection failed.");
    });
    socket.addEventListener("close", () => {
      setSocketReady(false);
      if (intentionalCloseRef.current || stoppingRef.current) {
        return;
      }
      setTransportError("The realtime engine websocket connection closed unexpectedly.");
    });

    return () => {
      intentionalCloseRef.current = true;
      socket.close();
      socketRef.current = null;
    };
  }, [data.session.id, wsUrl]);

  useEffect(() => {
    if (!socketReady || cameraPermission !== "granted" || microphonePermission !== "granted") {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    if (!hasSentCalibrationStartRef.current) {
      socket.send(
        JSON.stringify({
          type: "begin_calibration",
          sessionId: data.session.id,
          childId: data.child.id,
          difficulty:
            data.session.runtime_metadata.requested_difficulty ?? data.child.baseline_difficulty,
          gainCapability:
            data.session.runtime_metadata.requested_gain_capability ??
            data.child.baseline_gain_capability,
        }),
      );
      hasSentCalibrationStartRef.current = true;
    }

    const intervalId = window.setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN || stopping || engineStatus === "stopped") {
        return;
      }

      const analyser = analyserRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const audioFeatures = analyser ? collectAudioFeatures(analyser) : {};
      const videoFrame =
        video && canvas
          ? {
              frameBase64: captureVideoFrame(video, canvas),
              width: video.videoWidth || undefined,
              height: video.videoHeight || undefined,
            }
          : null;

      const packet: BrowserSensorPacket = {
        type: "sensor_packet",
        sessionId: data.session.id,
        recordedAt: new Date().toISOString(),
        sequence: sequenceRef.current++,
        audio: {
          features: audioFeatures,
        },
        video: videoFrame?.frameBase64
          ? {
              mimeType: "image/jpeg",
              frameBase64: videoFrame.frameBase64,
              width: videoFrame.width,
              height: videoFrame.height,
            }
          : undefined,
      };

      socket.send(JSON.stringify(packet));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    socketReady,
    cameraPermission,
    microphonePermission,
    data.session.id,
    data.child.id,
    data.session.runtime_metadata.requested_difficulty,
    data.session.runtime_metadata.requested_gain_capability,
    data.child.baseline_difficulty,
    data.child.baseline_gain_capability,
    stopping,
    engineStatus,
  ]);

  useEffect(() => {
    const videoNode = videoRef.current;
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      analyserRef.current = null;
      if (videoNode) {
        videoNode.srcObject = null;
      }
    };
  }, []);

  const liveAction = useMemo(() => {
    const interventionEvent = events.find((event) => event.type === "intervention");
    return interventionEvent?.type === "intervention" ? interventionEvent.action : null;
  }, [events]);

  async function stopSession() {
    if (stopping || engineStatus === "stopped") {
      return;
    }

    setStopping(true);
    stoppingRef.current = true;
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "stop_session",
          sessionId: data.session.id,
          reason: "Study session stopped from the browser client.",
        }),
      );
      return;
    }

    intentionalCloseRef.current = true;
    await fetch(`/api/sessions/${data.session.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      status: "stopped",
      summaryAction: liveAction ?? null,
      }),
    });
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setEngineStatus("stopped");
    setStopping(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#ecfdf5_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.22em] text-teal-700">Study session</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                {data.child.preferred_name || data.child.full_name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Session {data.session.id.slice(0, 8)}. The browser captures camera and
                microphone data, then a Python realtime engine performs calibration and
                live intervention decisions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Status" value={engineStatus} />
              <Metric label="Difficulty" value={String(data.session.runtime_metadata.requested_difficulty ?? data.child.baseline_difficulty)} />
              <Metric label="Gain capability" value={String(data.session.runtime_metadata.requested_gain_capability ?? data.child.baseline_gain_capability)} />
            </div>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-6">
            <Panel
              description="This is the preflight and calibration guide for the child session."
              title="Calibration"
            >
              <div className="space-y-4 text-sm leading-6 text-slate-700">
                <StatusRow label="Camera permission" value={cameraPermission} />
                <StatusRow label="Microphone permission" value={microphonePermission} />
                <StatusRow
                  label="Realtime engine"
                  value={wsUrl ? (socketReady ? "connected" : "connecting") : "not configured"}
                />
                <StatusRow
                  label="Calibration progress"
                  value={`${calibrationProgress}%`}
                />
                <button
                  className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                  onClick={() => {
                    void requestPermissions();
                  }}
                  disabled={cameraPermission === "granted" && microphonePermission === "granted"}
                  type="button"
                >
                  {cameraPermission === "granted" && microphonePermission === "granted"
                    ? "Mic and camera ready"
                    : "Allow mic and camera"}
                </button>
                <button
                  className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
                  onClick={() => {
                    void stopSession();
                  }}
                  disabled={stopping || engineStatus === "stopped"}
                  type="button"
                >
                  {stopping ? "Stopping..." : "Stop session"}
                </button>
                {transportError ? (
                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {transportError}
                  </p>
                ) : null}
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  After permissions are granted, this screen begins sending real browser
                  sensor packets to the Python websocket engine. The first backend phase
                  is baseline calibration.
                </p>
              </div>
            </Panel>

            <Panel
              description="Latest guidance selected by the adaptive engine."
              title="Intervention"
            >
              <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-teal-800">
                  Current recommendation
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  {liveAction ?? data.session.summary_action ?? "Waiting for live session data"}
                </p>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel
              description="This is the child-facing lesson area that will eventually host real study content."
              title="Study canvas"
            >
              <div className="flex min-h-[22rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white">
                <div className="max-w-lg text-center">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Activity zone
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    Guided study experience goes here
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    This route now performs real browser sensor capture and streams
                    audio features plus video frames to the Python backend. The next
                    iteration will combine that live adaptive loop with lesson content.
                  </p>
                </div>
              </div>
              <video
                ref={videoRef}
                autoPlay
                className="mt-4 hidden"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
            </Panel>

            <Panel
              description="Recent realtime events from the Python engine websocket."
              title="Live engine events"
            >
              {events.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No websocket events yet. Configure `NEXT_PUBLIC_SESSION_ENGINE_WS_URL`
                  when the Python realtime engine is ready.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event, index) => (
                    <pre
                      key={`${event.type}-${index}`}
                      className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"
                    >
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function captureVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (!video.videoWidth || !video.videoHeight) {
    return undefined;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
}

function collectAudioFeatures(analyser: AnalyserNode) {
  const timeDomain = new Float32Array(analyser.fftSize);
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getFloatTimeDomainData(timeDomain);
  analyser.getByteFrequencyData(frequencyData);

  let sumSquares = 0;
  for (const sample of timeDomain) {
    sumSquares += sample * sample;
  }
  const avgRms = Math.sqrt(sumSquares / timeDomain.length);

  let weighted = 0;
  let total = 0;
  for (let index = 0; index < frequencyData.length; index += 1) {
    weighted += frequencyData[index] * index;
    total += frequencyData[index];
  }
  const spectralCentroid = total > 0 ? weighted / total : 0;

  let noiseLevelHint = 0;
  if (avgRms >= 0.02) {
    noiseLevelHint += 1;
  }
  if (avgRms >= 0.05) {
    noiseLevelHint += 1;
  }
  if (avgRms >= 0.1) {
    noiseLevelHint += 1;
  }

  return {
    avgRms: Number(avgRms.toFixed(4)),
    rmsVariance: 0,
    spectralCentroid: Number(spectralCentroid.toFixed(2)),
    noiseLevelHint,
  };
}

function Panel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-slate-700">{label}</span>
      <span className="font-medium capitalize text-slate-900">{value}</span>
    </div>
  );
}
