import sqlite3
import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def signup_user(data):
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password TEXT)")
        try:
            cursor.execute("INSERT INTO users VALUES (?, ?)", (data["email"], hash_password(data["password"])))
            conn.commit()
            return {"message": "Signup successful", "status": "success"}
        except sqlite3.IntegrityError:
            return {"message": "User already exists", "status": "error"}
    except Exception as e:
        return {"message": str(e), "status": "error"}
    finally:
        conn.close()

def login_user(data):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password TEXT)") # Ensure table exists
    cursor.execute("SELECT * FROM users WHERE email=? AND password=?", 
                   (data["email"], hash_password(data["password"])))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {"message": "Login successful", "status": "success"}
    return {"message": "Invalid credentials", "status": "error"}
