import flask


def test_default_autoescape_recognizes_mixed_case_extensions():
    app = flask.Flask(__name__)
    assert app.select_jinja_autoescape("invoice.HTML") is True
    assert app.select_jinja_autoescape("diagram.SvG") is True
    assert app.select_jinja_autoescape("notes.txt") is False
    assert app.select_jinja_autoescape(None) is True
