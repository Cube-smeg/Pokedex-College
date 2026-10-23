import os

import mysql.connector

from flask import Flask, redirect, render_template, request, send_from_directory, session, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import json

app = Flask(__name__)

# Configure a private FLASK_SECRET_KEY in deployed environments.
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-only-change-me")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv(
    "SESSION_COOKIE_SECURE", "false"
).lower() in {"1", "true", "yes"}



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
        cursor.execute(
            'SELECT id, password_hash FROM users WHERE username = %s', (username,)
        )
        user = cursor.fetchone()
    finally:
        cursor.close()
        db.close()

    if user and check_password_hash(user[1], password):
        session.clear()
        session['user_id'] = user[0]

        return redirect('/index')

    
    return 'Invalid username or password', 401

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

    user_id = session.get('user_id')

    if not user_id:
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
            (user_id,),
        )

        if cursor.fetchone() is not None:
            cursor.execute(
                "UPDATE saved_teams SET team_data = %s WHERE user_id = %s",
                (json.dumps(team_data), user_id),
            )
        else:
            cursor.execute(
                'INSERT INTO saved_teams (user_id, team_data) VALUES (%s, %s)',
                (user_id, json.dumps(team_data)),
            )
        db.commit()

    except mysql.connector.Error:
        db.rollback()
        return {'message': 'Could not save the team because of a database error'}, 503

    finally:
        if cursor is not None:
            cursor.close()
        db.close()

    return {'message': 'Team saved successfully'}, 200

@app.route("/add_loss", methods=["POST"])
def add_loss():
    payload = request.get_json(silent=True)
    pokemon_name = payload.get("pokemon_name") if isinstance(payload, dict) else None
    if not isinstance(pokemon_name, str) or not pokemon_name.strip():
        return {"message": "Pokemon name is required"}, 400
    pokemon_name = pokemon_name.strip().lower()
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
            """
            INSERT INTO pokemon (pokemon_name, pokemon_wins, pokemon_losses)
            VALUES (%s, 0, 1)
            ON DUPLICATE KEY UPDATE pokemon_losses = pokemon_losses + 1
            """,
            (pokemon_name,),
        )
        db.commit()

    except mysql.connector.Error:
        db.rollback()
        app.logger.exception("Could not update Pokemon losses for %s", pokemon_name)
        return {'message': 'Could not update pokemon losses because of a database error'}, 503

    finally:
        if cursor is not None:
            cursor.close()
        db.close()

    return {'message': 'pokemon losses updated successfully'}, 200

@app.route("/add_win", methods=["POST"])
def add_win():
    payload = request.get_json(silent=True)
    pokemon_name = payload.get("pokemon_name") if isinstance(payload, dict) else None
    if not isinstance(pokemon_name, str) or not pokemon_name.strip():
        return {"message": "Pokemon name is required"}, 400
    pokemon_name = pokemon_name.strip().lower()
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
            """
            INSERT INTO pokemon (pokemon_name, pokemon_wins, pokemon_losses)
            VALUES (%s, 1, 0)
            ON DUPLICATE KEY UPDATE pokemon_wins = pokemon_wins + 1
            """,
            (pokemon_name,),
        )
        db.commit()

    except mysql.connector.Error:
        db.rollback()
        app.logger.exception("Could not update Pokemon wins for %s", pokemon_name)
        return {'message': 'Could not update pokemon wins because of a database error'}, 503

    finally:
        if cursor is not None:
            cursor.close()
        db.close()

    return {'message': 'pokemon wins updated successfully'}, 200


@app.route("/get_winsandlosses", methods=["GET"])
def get_winsandlosses():
    pokemon_name = request.args.get("pokemon_name", "").strip().lower()
    if not pokemon_name:
        return {"message": "Pokemon name is required"}, 400

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
            "SELECT pokemon_wins, pokemon_losses FROM pokemon WHERE pokemon_name = %s",
            (pokemon_name,),
        )
        row = cursor.fetchone()
        wins, losses = row if row is not None else (0, 0)
        return jsonify(wins=wins, losses=losses)
    except mysql.connector.Error:
        app.logger.exception("Could not load wins/losses for pokemon: %s", pokemon_name)
        return {'message': 'Could not load the wins/losses because of a database error'}, 503
    finally:
        if cursor is not None:
            cursor.close()
        db.close()

@app.route('/load_team', methods=['GET'])
def load_team():
    user_id = session.get('user_id')
    if not user_id:
        return {"message": "User not logged in."}, 401

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
            "SELECT team_data FROM saved_teams WHERE user_id = %s",
            (user_id,),
        )
        row = cursor.fetchone()

        if row is None:
            return {"message": "Team does not exist"}, 404

        team_data = row[0]
        if isinstance(team_data, str):
            team_data = json.loads(team_data)
        if not isinstance(team_data, dict) or not isinstance(
            team_data.get("pokemon"), list
        ):
            app.logger.error("Saved team has an invalid format for user %s", user_id)
            return {"message": "Saved team data is invalid"}, 500

        return team_data, 200
    except mysql.connector.Error:
        app.logger.exception("Could not load saved team for user %s", user_id)
        return {'message': 'Could not load the team because of a database error'}, 503
    except (TypeError, ValueError):
        app.logger.exception("Saved team JSON is invalid for user %s", user_id)
        return {'message': 'Saved team data is invalid'}, 500
    finally:
        if cursor is not None:
            cursor.close()
        db.close()
