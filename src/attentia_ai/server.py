from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, request, send_file

from attentia_ai.helpers.config import load_settings
from attentia_ai.session import StudySessionManager


def create_app() -> Flask:
    settings = load_settings()
    app = Flask(__name__)
    manager = StudySessionManager(settings)

    @app.get("/")
    def index():
        return send_file(Path(settings.frontend_path))

    @app.get("/api/status")
    def status():
        return jsonify(manager.status())

    @app.get("/api/preflight")
    def preflight():
        return jsonify(manager.preflight())

    @app.post("/api/session/start")
    def start_session():
        return jsonify(manager.start())

    @app.post("/api/session/stop")
    def stop_session():
        return jsonify(manager.stop())

    @app.post("/api/session/profile")
    def update_profile():
        body = request.get_json(silent=True) or {}
        difficulty = body.get("difficulty")
        gain_capability = body.get("gain_capability")
        return jsonify(manager.update_profile(difficulty, gain_capability))

    return app


def main() -> None:
    settings = load_settings()
    app = create_app()
    app.run(host=settings.host, port=settings.port, debug=False)


if __name__ == "__main__":
    main()
