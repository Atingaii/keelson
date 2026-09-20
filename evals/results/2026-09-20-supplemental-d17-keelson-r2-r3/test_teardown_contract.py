"""Post-freeze coverage audit for the already-declared D-17 requirements.

Run against every method's saved patch, never expose it to the coding agent.
The original hidden result stays unchanged. Python 3.11+ is the pinned runner.
"""

import flask
import pytest


def error_leaves(error):
    if isinstance(error, BaseExceptionGroup):
        return [leaf for child in error.exceptions for leaf in error_leaves(child)]
    return [error]


def test_all_teardown_errors_survive_and_outer_context_is_restored():
    outer = flask.Flask("outer-context")
    app = flask.Flask("teardown-context")
    calls = []
    popped_context = []

    def failing(label):
        def callback(*args, **kwargs):
            calls.append(label)
            raise ValueError(label)

        return callback

    app.teardown_request(failing("request-first"))
    app.teardown_request(failing("request-second"))
    app.teardown_appcontext(failing("app-first"))
    app.teardown_appcontext(failing("app-second"))
    request_signal = failing("request-signal")
    app_signal = failing("app-signal")

    def popped_signal(sender, **kwargs):
        popped_context.append(flask.current_app._get_current_object())
        calls.append("popped-signal")
        raise ValueError("popped-signal")

    expected = [
        "request-second",
        "request-first",
        "request-signal",
        "app-second",
        "app-first",
        "app-signal",
        "popped-signal",
    ]
    with outer.app_context():
        flask.g.marker = "outer-value"
        with (
            flask.request_tearing_down.connected_to(request_signal, app),
            flask.appcontext_tearing_down.connected_to(app_signal, app),
            flask.appcontext_popped.connected_to(popped_signal, app),
        ):
            with pytest.raises(BaseExceptionGroup) as raised:
                with app.test_request_context("/"):
                    flask.g.marker = "inner-value"

        assert calls == expected
        leaves = error_leaves(raised.value)
        assert all(type(error) is ValueError for error in leaves)
        assert [str(error) for error in leaves] == expected
        assert popped_context == [outer], "restore the outer context before the popped signal"
        assert flask.current_app._get_current_object() is outer
        assert flask.g.marker == "outer-value"
        assert not flask.has_request_context()

    assert not flask.has_app_context()
    assert not flask.has_request_context()
