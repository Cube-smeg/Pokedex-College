import os

import mysql.connector
from flask import Flask, redirect, render_template, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
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
            'SELECT password_hash FROM users WHERE username = %s', (username,)
        )
        user = cursor.fetchone()
    finally:
        cursor.close()
        db.close()

    if user and check_password_hash(user[0], password):
        return redirect('/index')

    return 'Invalid username or password', 401