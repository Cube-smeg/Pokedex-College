import os

import mysql.connector
# Import Flask's session object when implementing the session steps noted below.

from flask import Flask, redirect, render_template, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash
import json

app = Flask(__name__)

# Flask's session is signed using SECRET_KEY. For a real deployment, load a long,
# private key from an environment variable rather than keeping a literal in source.
app.config["SECRET_KEY"] = "SuperSuperDuperSecret"
# These cookie settings apply to the login session cookie; Secure requires HTTPS.
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = True



DB_PORT = int(os.getenv('DB_PORT', '3306'))


def ensure_default_user():
    try:
        db = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=DB_PORT,
            user=os.getenv('DB_USER', 'username'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'loginDB'),
        )
    except mysql.connector.Error:
        return False

    cursor = db.cursor()
    try:
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL
            )
            '''
        )
        cursor.execute(
            'SELECT 1 FROM users WHERE username = %s',
            ('admin',),
        )
        if cursor.fetchone() is None:
            cursor.execute(
                'INSERT INTO users (username, password_hash) VALUES (%s, %s)',
                ('admin', generate_password_hash('password')),
            )
        db.commit()
    finally:
        cursor.close()
        db.close()

    return True


ensure_default_user()


@app.route('/')
def home():
    return redirect('/signup')


@app.route('/images/<path:filename>')
def images(filename):
    return send_from_directory('images', filename)


@app.route('/signup', methods=['GET', 'POST'])
def signup():

    if request.method == 'GET':
        return render_template('signup.html')

    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')

    if not username or not password:
        return 'Username and password are required', 400

    try:
        db = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=DB_PORT,
            user=os.getenv('DB_USER', 'username'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'loginDB'),
        )
    except mysql.connector.Error:
        return 'Database connection failed', 503

    cursor = db.cursor()
    try:
        cursor.execute(
            'SELECT 1 FROM users WHERE username = %s',
            (username,),
        )
        if cursor.fetchone() is not None:
            return 'Username already exists', 400

        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (%s, %s)',
            (username, generate_password_hash(password)),
        )
        db.commit()
    finally:
        cursor.close()
        db.close()

    return redirect('/login')


@app.route('/index')
def index():
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')

    if not username or not password:
        return 'Username and password are required', 400

    try:
        db = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=DB_PORT,
            user=os.getenv('DB_USER', 'username'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'loginDB'),
        )
    except mysql.connector.Error:
        return 'Database connection failed', 503

    cursor = db.cursor()
    try:
        # To put the authenticated account in the session, fetch its database ID
        # along with the password hash (for example, SELECT id, password_hash).
        # Keep the row indexes below aligned with the columns selected here.
        cursor.execute(
            'SELECT id, password_hash FROM users WHERE username = %s', (username,)
        )
        user = cursor.fetchone()
    finally:
        cursor.close()
        db.close()

    # After changing the SELECT to return id first and password_hash second, change
    # this hash check to use user[1]. Only after verification succeeds, clear any
    # old session values and store the database ID, e.g. session['user_id'] = user[0].
    # Never store the submitted password or use a client-provided ID. Then redirect.
    if user and check_password_hash(user[1], password):
        # Clear any old session values and store the database ID
        session.clear()
        session['user_id'] = user[0]

        return redirect('/index')

    
    return 'Invalid username or password', 401

# Add a logout route near the login route: clear the session and redirect to the
# login page so this account is no longer treated as signed in.


@app.route('/logout')
def logout():
    # Clear the session to log out the user
    session.clear()
    return redirect('/login')

@app.route('/teambuilder')
def teambuilder():
    return render_template('teambuilder.html')



@app.route('/save_team', methods=['POST'])
def save_team():
    # Before saving, require session['user_id']; return an unauthorized response
    # when it is absent. Use that session value as saved_teams.user_id, never an ID
    # supplied in the request JSON. Apply the same check to the future load endpoint.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {'message': 'Invalid request: expected a JSON object'}, 400

    if 'pokemon' not in data:
        return {'message': 'Invalid request: missing "pokemon" property'}, 400

    pokemon = data['pokemon']
    if not isinstance(pokemon, list):
        return {'message': 'Invalid team: "pokemon" must be a list'}, 400

    if len(pokemon) != 6:
        return {'message': 'Invalid team size: must have exactly 6 Pokemon'}, 400

    # Check types before trimming/normalizing, then compare normalized names so
    # differently-cased or whitespace-padded duplicates are rejected too.
    if any(not isinstance(name, str) for name in pokemon):
        return {'message': 'Invalid team: Pokemon names must be strings'}, 400

    pokemon = [name.strip().lower() for name in pokemon]
    if any(not name for name in pokemon):
        return {'message': 'Invalid team: Pokemon names cannot be empty'}, 400

    if len(pokemon) != len(set(pokemon)):
        return {'message': 'Invalid team: duplicate Pokemon names are not allowed'}, 400

    team_data = {'pokemon': pokemon}

    userID = session.get('user_id')

    if not userID:
        return {'message': 'Unauthorized: user not logged in'}, 401
    

    try:
            db = mysql.connector.connect(
                host=os.getenv('DB_HOST', '127.0.0.1'),
                port=DB_PORT,
                user=os.getenv('DB_USER', 'username'),
                password=os.getenv('DB_PASSWORD', 'password'),
                database=os.getenv('DB_NAME', 'loginDB'),
            )
    except mysql.connector.Error:
        return {'message': 'Database connection failed'}, 503

    cursor = None
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT 1 FROM saved_teams WHERE user_id = %s",
            (userID,),
        )

        if cursor.fetchone() is not None:
            cursor.execute(
                "UPDATE saved_teams SET team_data = %s WHERE user_id = %s",
                (json.dumps(team_data), userID),
            )
        else:
            cursor.execute(
                'INSERT INTO saved_teams (user_id, team_data) VALUES (%s, %s)',
                (userID, json.dumps(team_data)),
            )
        db.commit()

    except mysql.connector.Error:
        #reset db incase of error 
        db.rollback()
        return {'message': 'Could not save the team because of a database error'}, 503

    finally:
        if cursor is not None:
            cursor.close()
        db.close()

    return {'message': 'Team saved successfully'}, 200

    # TODO: loading the team back from the database for the current user, if any, and returning it as JSON.
   