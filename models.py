from flask_pymongo import PyMongo
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
import random, string
from dotenv import load_dotenv
import os

load_dotenv()
def init_db(app):
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    mongo = PyMongo(app)
    return mongo

def generate_invite_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def hash_password(password):
    return generate_password_hash(password)

def check_password(hash_pass, password):
    return check_password_hash(hash_pass, password)
