import flask
import pytest


def test_teardown_attempts_callbacks_and_signals_after_errors():
    app = flask.Flask(__name__)
    calls = []

    @app.teardown_request
    def request_callback(exc):
        calls.append("request-callback")
        raise ValueError("request callback")

    @app.teardown_appcontext
    def app_callback(exc):
        calls.append("app-callback")
        raise ValueError("app callback")

    @app.get("/")
    def index():
        return "ok"

    def request_signal(sender, exc):
        calls.append("request-signal")
        raise ValueError("request signal")

    def app_signal(sender, exc):
        calls.append("app-signal")
        raise ValueError("app signal")

    with (
        flask.request_tearing_down.connected_to(request_signal, app),
        flask.appcontext_tearing_down.connected_to(app_signal, app),
    ):
        with pytest.raises(BaseException):
            app.test_client().get("/")

    assert calls == [
        "request-callback",
        "request-signal",
        "app-callback",
        "app-signal",
    ]
