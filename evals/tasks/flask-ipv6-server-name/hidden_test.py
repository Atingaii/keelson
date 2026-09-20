import flask
import werkzeug.serving


def test_ipv6_server_name_is_parsed_as_host_and_port(monkeypatch):
    app = flask.Flask(__name__)
    app.config["SERVER_NAME"] = "[::1]:8080"
    captured = {}

    def run_simple(host, port, application, **kwargs):
        captured["host"] = host
        captured["port"] = port

    monkeypatch.setattr(werkzeug.serving, "run_simple", run_simple)
    app.run()

    assert captured == {"host": "::1", "port": 8080}
