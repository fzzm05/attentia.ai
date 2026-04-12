from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_sock import Sock

from attentia_ai.helpers.config import load_settings
from attentia_ai.realtime_engine import BrowserRealtimeEngine
from attentia_ai.session import StudySessionManager


def create_app() -> Flask:
    settings = load_settings()
    app = Flask(__name__)
    sock = Sock(app)
    
    # --- Application Blueprint & Global State ---
    # The session manager is initialized at start-up to ensure 
    # singleton-like orchestration across REST and WebSocket threads.
    manager = StudySessionManager(settings)
    realtime_engine = BrowserRealtimeEngine(settings)

    @app.get("/")
    def index():
        """Serves the primary operator dashboard."""
        return send_file(Path(settings.frontend_path))

    @app.get("/api/status")
    def status():
        """Returns the current operational status of the session."""
        return jsonify(manager.status())

    @app.get("/api/preflight")
    def preflight():
        """
        Diagnostic endpoint to verify hardware and policy readiness.
        Provides visibility into camera/mic availability and model loading status.
        """
        return jsonify(manager.preflight())

    @app.post("/api/session/start")
    def start_session():
        """
        Triggers the session lifecycle. 
        Synchronously calibrates hardware and spawns the background orchestration thread.
        """
        return jsonify(manager.start())

    @app.post("/api/session/stop")
    def stop_session():
        """Terminates the session and releases hardware locks."""
        return jsonify(manager.stop())

    @app.post("/api/session/profile")
    def update_profile():
        """Updates the user's learning profile and difficulty parameters."""
        body = request.get_json(silent=True) or {}
        difficulty = body.get("difficulty")
        gain_capability = body.get("gain_capability")
        return jsonify(manager.update_profile(difficulty, gain_capability))

    @sock.route("/ws/sessions/<session_id>")
    def session_stream(ws, session_id: str):
        """
        Low-latency WebSocket endpoint for streaming session state.
        Provides a consistent stream of sensor data and AI interventions.
        """
        realtime_engine.handle_socket(ws, session_id)

    return app


def main() -> None:
    settings = load_settings()
    app = create_app()
    app.run(host=settings.host, port=settings.port, debug=False)


if __name__ == "__main__":
    main()
