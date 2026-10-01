from app import app


def test_root_redirects_to_login():
    client = app.test_client()
    response = client.get('/', follow_redirects=False)
    assert response.status_code == 302
    assert response.headers['Location'] == '/login'


def test_index_renders_template():
    client = app.test_client()
    response = client.get('/index')
    assert response.status_code == 200
    assert b'Pokemon name' in response.data


def test_login_page_renders_form():
    client = app.test_client()
    response = client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data
    assert b'/login' in response.data
