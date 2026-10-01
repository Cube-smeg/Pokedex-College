import mysql.connector
from flask import Flask, redirect, request, render_template
from werkzeug.security import check_password_hash

app = Flask(__name__)


@app.route('/index')
def index():
    return 'Hello, World!'

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template("login.html")

    db = mysql.connector.connect(
        host="127.0.0.1",
        user="username",
        password="password",
        database="loginDB",
    )
    cursor = db.cursor()
    cursor.execute(
        "SELECT password_hash FROM users WHERE username = %s",
        (request.form["username"],),
    )
    user = cursor.fetchone()
    cursor.close()
    db.close()

    if user and check_password_hash(user[0], request.form["password"]):
        return redirect('/index')
    return "Invalid username or password", 401