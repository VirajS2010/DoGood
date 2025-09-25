from flask import Blueprint, render_template, request, redirect, url_for, session
from models import init_db, generate_invite_code, hash_password, check_password
from werkzeug.utils import secure_filename
import os, datetime, random, string, uuid

main_routes = Blueprint('main', __name__)
mongo = None

UPLOAD_FOLDER = 'static/images'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@main_routes.record
def init(state):
    global mongo
    app = state.app
    mongo = init_db(app)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def current_user():
    if "user_id" in session:
        return mongo.db.users.find_one({"user_id": session["user_id"]})
    return None

def random_id(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def unique_name(original_filename: str) -> str:
    safe = secure_filename(original_filename or "")
    _, ext = os.path.splitext(safe)
    ext = ext.lower()
    return f"{uuid.uuid4().hex}{ext}"


@main_routes.route("/")
def index():
    return render_template("index.html")


@main_routes.route("/join_community", methods=["POST"])
def join_community():
    code = request.form["code"]
    community = mongo.db.communities.find_one({"invite_code": code})
    if not community:
        return "Invalid code!"
    return redirect(url_for("main.register", community_code=code))


@main_routes.route("/register/<community_code>", methods=["GET", "POST"])
def register(community_code):

    community = mongo.db.communities.find_one({"invite_code": community_code})
    if not community:
        return render_template("invite_invalid.html"), 404

    if request.method == "GET":

        return render_template("register.html", community=community)


    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")


    file = request.files.get("profile_pic")
    if not name or not email or not password or not file or file.filename == "":
        return render_template(
            "register.html",
            community=community,
            error="Please fill all fields and upload a profile photo."
        )


    os.makedirs(UPLOAD_FOLDER, exist_ok=True)


    fname = unique_name(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, fname))
    profile_url = f"/static/images/{fname}"


    existing = mongo.db.users.find_one({"email": email})
    if existing:
        return render_template(
            "register.html",
            community=community,
            error="This email is already registered. Please log in instead."
        )


    user_id = random_id()
    mongo.db.users.insert_one({
        "user_id": user_id,
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "profile_pic": profile_url,
        "community": community["community_id"],
        "points": 0
    })


    mongo.db.communities.update_one(
        {"community_id": community["community_id"]},
        {"$inc": {"total_users": 1}}
    )


    session["user_id"] = user_id
    return redirect(url_for("main.feed"))



@main_routes.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        user = mongo.db.users.find_one({"email": email})
        if user and check_password(user["password_hash"], password):
            session["user_id"] = user["user_id"]
            return redirect(url_for("main.feed"))
    return render_template("login.html")


@main_routes.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("main.index"))


@main_routes.route("/create_community", methods=["GET","POST"])
def create_community():
    if request.method == "POST":
        name = request.form["community_name"].strip()
        if not name:
            return render_template("create_community.html", error="Please enter a community name.")


        code = generate_invite_code()
        while mongo.db.communities.find_one({"invite_code": code}):
            code = generate_invite_code()

        community_id = random_id()
        mongo.db.communities.insert_one({
            "community_id": community_id,
            "name": name,
            "invite_code": code,
            "total_users": 0
        })

        invite_link = url_for("main.register", community_code=code, _external=True)


        return render_template(
            "community_created.html",
            invite_link=invite_link,
            code=code,
            name=name
        )


    return render_template("create_community.html")



@main_routes.route("/feed")
def feed():
    user = current_user()
    if not user:
        return redirect(url_for("main.login"))


    cursor = mongo.db.deeds.find(
        {"community_id": user["community"], "status": "Active"}
    ).sort("timestamp", -1)

    deeds = []
    for d in cursor:
        author = mongo.db.users.find_one({"user_id": d.get("user_id")}) or {}
        deeds.append({
            "deed_id": d.get("deed_id"),
            "user_id": d.get("user_id"),
            "photo_url": d.get("photo_url"),
            "description": d.get("description", ""),
            "dislikes": d.get("dislikes", 0),
            "timestamp_fmt": d.get("timestamp").strftime("%b %d, %Y • %I:%M %p") if d.get("timestamp") else "",
            "author_name": author.get("name", "Unknown"),
            "author_pic": author.get("profile_pic", "/static/images/default.png"),
        })

    return render_template("feed.html", deeds=deeds, user=user)




@main_routes.route("/create_post", methods=["GET","POST"])
def create_post():
    user = current_user()
    if not user:
        return redirect(url_for("main.login"))
    if request.method == "POST":
        description = request.form["description"]
        photo = request.files["photo"]


        fname = unique_name(photo.filename)
        photo.save(os.path.join(UPLOAD_FOLDER, fname))

        deed_id = random_id()
        mongo.db.deeds.insert_one({
            "deed_id": deed_id,
            "user_id": user["user_id"],
            "community_id": user["community"],
            "description": description,
            "photo_url": f"/static/images/{fname}",
            "points": 50,
            "dislikes": 0,
            "status": "Active",
            "timestamp": datetime.datetime.now()
        })
        mongo.db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": 50}})
        return redirect(url_for("main.feed"))
    return render_template("create_post.html")


@main_routes.route("/dislike/<deed_id>")
def dislike(deed_id):
    user = current_user()
    if not user:
        return redirect(url_for("main.login"))
    deed = mongo.db.deeds.find_one({"deed_id": deed_id})
    community = mongo.db.communities.find_one({"community_id": deed["community_id"]})
    new_dislikes = deed.get("dislikes",0)+1
    mongo.db.deeds.update_one({"deed_id": deed_id}, {"$set":{"dislikes": new_dislikes}})
    if new_dislikes >= 0.15*community["total_users"]:
        mongo.db.deeds.update_one({"deed_id": deed_id}, {"$set":{"status":"Invalid"}})
        mongo.db.users.update_one({"user_id": deed["user_id"]}, {"$inc":{"points": -deed["points"]}})
    return redirect(url_for("main.feed"))


@main_routes.route("/leaderboard")
def leaderboard():
    user = current_user()
    if not user:
        return redirect(url_for("main.login"))
    users = mongo.db.users.find({"community": user["community"]}).sort("points",-1)
    community = mongo.db.communities.find_one({"community_id": user["community"]})
    return render_template("leaderboard.html", users=users, community=community)


