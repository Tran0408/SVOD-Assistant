"""Flask entry point."""
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from api.query import bp as query_bp


def create_app() -> Flask:
    app = Flask(__name__)
    origins_env = os.getenv("CORS_ORIGINS", "*")
    origins = [o.strip() for o in origins_env.split(",") if o.strip()] if origins_env != "*" else "*"
    CORS(app, resources={r"/api/*": {"origins": origins}})
    app.register_blueprint(query_bp, url_prefix="/api")
    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
