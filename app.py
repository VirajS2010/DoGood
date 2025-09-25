from flask import Flask
from routes import main_routes

app = Flask(__name__)
app.secret_key = "super_secret_key"
app.register_blueprint(main_routes)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port='4080')
