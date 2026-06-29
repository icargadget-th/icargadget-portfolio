import sqlite3
import os
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if os.getenv("VERCEL"):
    DATABASE_DIR = Path("/tmp")
else:
    DATABASE_DIR = Path("data")
DATABASE_PATH = DATABASE_DIR / "database.db"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def is_supabase_enabled():
    """Checks if Supabase credentials are configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def get_supabase_headers():
    """Returns headers required for Supabase REST API requests."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def get_db_connection():
    """Returns an active SQLite connection with foreign keys enabled and dict row factory."""
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes the SQLite database schema if it doesn't already exist or logs Supabase connection."""
    if is_supabase_enabled():
        print("[DATABASE] Supabase cloud database mode enabled.")
        try:
            # Ping Supabase to verify connectivity
            headers = get_supabase_headers()
            res = requests.get(f"{SUPABASE_URL}/rest/v1/projects?select=id&limit=1", headers=headers)
            if res.status_code == 200:
                print("[DATABASE] Successfully connected to Supabase database.")
            else:
                print(f"[DATABASE] WARNING: Supabase returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[DATABASE] ERROR: Failed to connect to Supabase: {e}")
        return

    print("[DATABASE] Local offline SQLite mode enabled.")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_make TEXT NOT NULL,
            vehicle_model TEXT NOT NULL,
            vehicle_year INTEGER NOT NULL,
            client_name TEXT NOT NULL,
            client_contact TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'In-Progress',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # Create components table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            notes TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
    """)
    
    # Create media table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            is_thumbnail BOOLEAN DEFAULT 0,
            caption TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
    """)
    
    conn.commit()
    conn.close()

# --- DUAL-MODE CRUD IMPLEMENTATIONS ---

def list_projects(search=None, category=None, status=None):
    """Retrieves all projects filtering by search query, component category, and progress status."""
    if is_supabase_enabled():
        return list_projects_supabase(search, category, status)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT DISTINCT p.* FROM projects p
        LEFT JOIN components c ON p.id = c.project_id
        WHERE 1=1
    """
    params = []
    
    if search:
        query += """ AND (
            p.vehicle_make LIKE ? OR 
            p.vehicle_model LIKE ? OR 
            p.client_name LIKE ? OR 
            p.description LIKE ? OR
            c.brand LIKE ? OR
            c.model LIKE ?
        )"""
        like_search = f"%{search}%"
        params.extend([like_search] * 6)
        
    if category:
        query += " AND c.category = ?"
        params.append(category)
        
    if status:
        query += " AND p.status = ?"
        params.append(status)
        
    query += " ORDER BY p.created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    projects = []
    for r in rows:
        proj = dict(r)
        # Fetch thumbnail for this project
        cursor.execute("SELECT file_path FROM media WHERE project_id = ? AND is_thumbnail = 1 LIMIT 1", (proj["id"],))
        thumb_row = cursor.fetchone()
        
        # If no explicit thumbnail, take the first media file
        if not thumb_row:
            cursor.execute("SELECT file_path FROM media WHERE project_id = ? ORDER BY id ASC LIMIT 1", (proj["id"],))
            thumb_row = cursor.fetchone()
            
        proj["thumbnail"] = thumb_row["file_path"] if thumb_row else None
        
        # Fetch categories for cards
        cursor.execute("SELECT DISTINCT category FROM components WHERE project_id = ?", (proj["id"],))
        cats = [c_row["category"] for c_row in cursor.fetchall()]
        proj["categories"] = cats
        
        projects.append(proj)
        
    conn.close()
    return projects


def list_projects_supabase(search=None, category=None, status=None):
    """Retrieves all projects from Supabase with nested components and media, filtering in memory."""
    headers = get_supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/projects?select=*,components(*),media(*)&order=created_at.desc"
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        raise Exception(f"Supabase list error: {res.text}")
    
    rows = res.json()
    projects = []
    
    for r in rows:
        proj = {
            "id": r["id"],
            "vehicle_make": r["vehicle_make"],
            "vehicle_model": r["vehicle_model"],
            "vehicle_year": r["vehicle_year"],
            "client_name": r["client_name"],
            "client_contact": r.get("client_contact"),
            "description": r.get("description"),
            "status": r["status"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        }
        
        if status and proj["status"] != status:
            continue
            
        comps = r.get("components") or []
        
        if category:
            cat_match = any(c["category"] == category for c in comps)
            if not cat_match:
                continue
                
        if search:
            s = search.lower()
            make_match = s in proj["vehicle_make"].lower()
            model_match = s in proj["vehicle_model"].lower()
            client_match = s in proj["client_name"].lower()
            desc_match = s in (proj["description"] or "").lower()
            comp_match = any(s in c["brand"].lower() or s in c["model"].lower() for c in comps)
            if not (make_match or model_match or client_match or desc_match or comp_match):
                continue
                
        # Determine thumbnail
        media_list = r.get("media") or []
        thumb = None
        for m in media_list:
            if m.get("is_thumbnail"):
                thumb = m["file_path"]
                break
        if not thumb and media_list:
            sorted_media = sorted(media_list, key=lambda x: x["id"])
            thumb = sorted_media[0]["file_path"]
            
        proj["thumbnail"] = thumb
        proj["categories"] = list({c["category"] for c in comps if c.get("category")})
        projects.append(proj)
        
    return projects


def get_project_detail(project_id):
    """Retrieves a single project with its components and media list."""
    if is_supabase_enabled():
        return get_project_detail_supabase(project_id)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    project_row = cursor.fetchone()
    if not project_row:
        conn.close()
        return None
        
    project = dict(project_row)
    
    # Fetch components
    cursor.execute("SELECT * FROM components WHERE project_id = ? ORDER BY id ASC", (project_id,))
    project["components"] = [dict(c) for c in cursor.fetchall()]
    
    # Fetch media
    cursor.execute("SELECT * FROM media WHERE project_id = ? ORDER BY id ASC", (project_id,))
    project["media"] = [dict(m) for m in cursor.fetchall()]
    
    conn.close()
    return project


def get_project_detail_supabase(project_id):
    """Retrieves a single project detail from Supabase."""
    headers = get_supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}&select=*,components(*),media(*)"
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        raise Exception(f"Supabase get project error: {res.text}")
    
    rows = res.json()
    if not rows:
        return None
    r = rows[0]
    
    components = sorted(r.get("components") or [], key=lambda x: x["id"])
    media = sorted(r.get("media") or [], key=lambda x: x["id"])
    
    return {
        "id": r["id"],
        "vehicle_make": r["vehicle_make"],
        "vehicle_model": r["vehicle_model"],
        "vehicle_year": r["vehicle_year"],
        "client_name": r["client_name"],
        "client_contact": r.get("client_contact"),
        "description": r.get("description"),
        "status": r["status"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
        "components": components,
        "media": media
    }


def create_project(data):
    """Inserts a new project and optional initial component list."""
    if is_supabase_enabled():
        return create_project_supabase(data)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO projects (vehicle_make, vehicle_model, vehicle_year, client_name, client_contact, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["vehicle_make"],
        data["vehicle_model"],
        data["vehicle_year"],
        data["client_name"],
        data.get("client_contact"),
        data.get("description"),
        data.get("status", "In-Progress"),
        now,
        now
    ))
    project_id = cursor.lastrowid
    
    # Insert components if provided
    if "components" in data and data["components"]:
        for comp in data["components"]:
            cursor.execute("""
                INSERT INTO components (project_id, brand, model, category, quantity, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                comp["brand"],
                comp["model"],
                comp["category"],
                comp.get("quantity", 1),
                comp.get("notes")
            ))
            
    conn.commit()
    conn.close()
    return project_id


def create_project_supabase(data):
    """Inserts a new project and components to Supabase."""
    headers = get_supabase_headers()
    project_payload = {
        "vehicle_make": data["vehicle_make"],
        "vehicle_model": data["vehicle_model"],
        "vehicle_year": data["vehicle_year"],
        "client_name": data["client_name"],
        "client_contact": data.get("client_contact"),
        "description": data.get("description"),
        "status": data.get("status", "In-Progress")
    }
    url = f"{SUPABASE_URL}/rest/v1/projects"
    res = requests.post(url, headers=headers, json=project_payload)
    if res.status_code not in (200, 201):
        raise Exception(f"Supabase project creation failed: {res.text}")
    
    inserted_proj = res.json()[0]
    project_id = inserted_proj["id"]
    
    if "components" in data and data["components"]:
        comps_payload = []
        for comp in data["components"]:
            comps_payload.append({
                "project_id": project_id,
                "brand": comp["brand"],
                "model": comp["model"],
                "category": comp["category"],
                "quantity": comp.get("quantity", 1),
                "notes": comp.get("notes")
            })
        url_comps = f"{SUPABASE_URL}/rest/v1/components"
        res_comps = requests.post(url_comps, headers=headers, json=comps_payload)
        if res_comps.status_code not in (200, 201):
            raise Exception(f"Supabase components creation failed: {res_comps.text}")
            
    return project_id


def update_project(project_id, data):
    """Updates the project details and synchronizes components."""
    if is_supabase_enabled():
        return update_project_supabase(project_id, data)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if project exists
    cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not cursor.fetchone():
        conn.close()
        return False
        
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE projects
        SET vehicle_make = ?, vehicle_model = ?, vehicle_year = ?, client_name = ?, client_contact = ?, description = ?, status = ?, updated_at = ?
        WHERE id = ?
    """, (
        data["vehicle_make"],
        data["vehicle_model"],
        data["vehicle_year"],
        data["client_name"],
        data.get("client_contact"),
        data.get("description"),
        data.get("status", "In-Progress"),
        now,
        project_id
    ))
    
    # Synchronize components (delete old, insert new)
    if "components" in data:
        cursor.execute("DELETE FROM components WHERE project_id = ?", (project_id,))
        for comp in data["components"]:
            cursor.execute("""
                INSERT INTO components (project_id, brand, model, category, quantity, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                comp["brand"],
                comp["model"],
                comp["category"],
                comp.get("quantity", 1),
                comp.get("notes")
            ))
            
    conn.commit()
    conn.close()
    return True


def update_project_supabase(project_id, data):
    """Updates the project details and components on Supabase."""
    headers = get_supabase_headers()
    # Check if project exists
    url_check = f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}&select=id"
    res_check = requests.get(url_check, headers=headers)
    if res_check.status_code != 200 or not res_check.json():
        return False
        
    # Update project
    project_payload = {
        "vehicle_make": data["vehicle_make"],
        "vehicle_model": data["vehicle_model"],
        "vehicle_year": data["vehicle_year"],
        "client_name": data["client_name"],
        "client_contact": data.get("client_contact"),
        "description": data.get("description"),
        "status": data.get("status", "In-Progress"),
        "updated_at": datetime.now().isoformat()
    }
    url_update = f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}"
    res_update = requests.patch(url_update, headers=headers, json=project_payload)
    if res_update.status_code not in (200, 201, 204):
        raise Exception(f"Supabase update project failed: {res_update.text}")
        
    # Sync components
    if "components" in data:
        url_del = f"{SUPABASE_URL}/rest/v1/components?project_id=eq.{project_id}"
        requests.delete(url_del, headers=headers)
        
        if data["components"]:
            comps_payload = []
            for comp in data["components"]:
                comps_payload.append({
                    "project_id": project_id,
                    "brand": comp["brand"],
                    "model": comp["model"],
                    "category": comp["category"],
                    "quantity": comp.get("quantity", 1),
                    "notes": comp.get("notes")
                })
            url_comps = f"{SUPABASE_URL}/rest/v1/components"
            res_comps = requests.post(url_comps, headers=headers, json=comps_payload)
            if res_comps.status_code not in (200, 201):
                raise Exception(f"Supabase components update failed: {res_comps.text}")
                
    return True


def delete_project_record(project_id):
    """Deletes a project record from database and returns its media paths."""
    if is_supabase_enabled():
        return delete_project_record_supabase(project_id)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Retrieve media paths first to delete them from filesystems later
    cursor.execute("SELECT file_path FROM media WHERE project_id = ?", (project_id,))
    media_paths = [r["file_path"] for r in cursor.fetchall()]
    
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return media_paths


def delete_project_record_supabase(project_id):
    """Deletes a project record and nested records from Supabase."""
    headers = get_supabase_headers()
    # Fetch media paths
    url_media = f"{SUPABASE_URL}/rest/v1/media?project_id=eq.{project_id}&select=file_path"
    res_media = requests.get(url_media, headers=headers)
    media_paths = []
    if res_media.status_code == 200:
        media_paths = [r["file_path"] for r in res_media.json()]
        
    # Delete components
    url_comps = f"{SUPABASE_URL}/rest/v1/components?project_id=eq.{project_id}"
    requests.delete(url_comps, headers=headers)
    
    # Delete media
    url_del_media = f"{SUPABASE_URL}/rest/v1/media?project_id=eq.{project_id}"
    requests.delete(url_del_media, headers=headers)
    
    # Delete project
    url_proj = f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}"
    res_proj = requests.delete(url_proj, headers=headers)
    if res_proj.status_code not in (200, 201, 204):
        raise Exception(f"Supabase project deletion failed: {res_proj.text}")
        
    return media_paths


# --- MEDIA OPERATIONS ---

def add_media_record(project_id, file_path, file_type, is_thumbnail=False, caption=None):
    """Registers an uploaded media file path in the database."""
    if is_supabase_enabled():
        return add_media_record_supabase(project_id, file_path, file_type, is_thumbnail, caption)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # If this is set as thumbnail, unset other thumbnails for this project
    if is_thumbnail:
        cursor.execute("UPDATE media SET is_thumbnail = 0 WHERE project_id = ?", (project_id,))
        
    cursor.execute("""
        INSERT INTO media (project_id, file_path, file_type, is_thumbnail, caption)
        VALUES (?, ?, ?, ?, ?)
    """, (project_id, file_path, file_type, 1 if is_thumbnail else 0, caption))
    
    media_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return media_id


def add_media_record_supabase(project_id, file_path, file_type, is_thumbnail=False, caption=None):
    """Registers an uploaded media path in Supabase."""
    headers = get_supabase_headers()
    if is_thumbnail:
        url_unset = f"{SUPABASE_URL}/rest/v1/media?project_id=eq.{project_id}"
        requests.patch(url_unset, headers=headers, json={"is_thumbnail": False})
        
    media_payload = {
        "project_id": project_id,
        "file_path": file_path,
        "file_type": file_type,
        "is_thumbnail": is_thumbnail,
        "caption": caption
    }
    url_insert = f"{SUPABASE_URL}/rest/v1/media"
    res_insert = requests.post(url_insert, headers=headers, json=media_payload)
    if res_insert.status_code not in (200, 201):
        raise Exception(f"Supabase media insertion failed: {res_insert.text}")
        
    return res_insert.json()[0]["id"]


def delete_media_record(media_id):
    """Removes a media file record and returns its file path for disk deletion."""
    if is_supabase_enabled():
        return delete_media_record_supabase(media_id)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT file_path FROM media WHERE id = ?", (media_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    file_path = row["file_path"]
    cursor.execute("DELETE FROM media WHERE id = ?", (media_id,))
    conn.commit()
    conn.close()
    return file_path


def delete_media_record_supabase(media_id):
    """Removes a media file record from Supabase and returns its file path."""
    headers = get_supabase_headers()
    url_media = f"{SUPABASE_URL}/rest/v1/media?id=eq.{media_id}&select=file_path"
    res_media = requests.get(url_media, headers=headers)
    if res_media.status_code != 200 or not res_media.json():
        return None
    file_path = res_media.json()[0]["file_path"]
    
    url_del = f"{SUPABASE_URL}/rest/v1/media?id=eq.{media_id}"
    res_del = requests.delete(url_del, headers=headers)
    if res_del.status_code not in (200, 201, 204):
        raise Exception(f"Supabase media deletion failed: {res_del.text}")
        
    return file_path


def get_all_media_paths():
    """Retrieves all media file paths currently saved in the database (for cleanup checks)."""
    if is_supabase_enabled():
        headers = get_supabase_headers()
        res = requests.get(f"{SUPABASE_URL}/rest/v1/media?select=file_path", headers=headers)
        if res.status_code == 200:
            return [r["file_path"] for r in res.json()]
        return []
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM media")
    paths = [r["file_path"] for r in cursor.fetchall()]
    conn.close()
    return paths

# --- STATISTICS HELPER ---

def get_statistics():
    """Aggregates metrics for the system Dashboard view."""
    if is_supabase_enabled():
        return get_statistics_supabase()
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # Project counts
    cursor.execute("SELECT COUNT(*) FROM projects")
    stats["total_projects"] = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM projects WHERE status = 'Completed'")
    stats["completed_projects"] = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM projects WHERE status = 'In-Progress'")
    stats["inprogress_projects"] = cursor.fetchone()[0]
    
    # Component metrics
    cursor.execute("SELECT COUNT(*) FROM components")
    stats["total_components"] = cursor.fetchone()[0]
    
    # Category break down
    cursor.execute("SELECT category, COUNT(*) FROM components GROUP BY category")
    stats["categories"] = {r[0]: r[1] for r in cursor.fetchall()}
    
    # Media count
    cursor.execute("SELECT COUNT(*) FROM media")
    stats["total_media"] = cursor.fetchone()[0]
    
    conn.close()
    return stats


def get_statistics_supabase():
    """Aggregates metrics for the system Dashboard view from Supabase."""
    headers = get_supabase_headers()
    
    res_proj = requests.get(f"{SUPABASE_URL}/rest/v1/projects?select=status", headers=headers)
    projects = res_proj.json() if res_proj.status_code == 200 else []
    
    res_comps = requests.get(f"{SUPABASE_URL}/rest/v1/components?select=category", headers=headers)
    components = res_comps.json() if res_comps.status_code == 200 else []
    
    res_media = requests.get(f"{SUPABASE_URL}/rest/v1/media?select=id", headers=headers)
    media_count = len(res_media.json()) if res_media.status_code == 200 else 0
    
    total_projects = len(projects)
    completed = sum(1 for p in projects if p["status"] == "Completed")
    inprogress = sum(1 for p in projects if p["status"] == "In-Progress")
    
    categories = {}
    for c in components:
        cat = c.get("category", "Other")
        categories[cat] = categories.get(cat, 0) + 1
        
    return {
        "total_projects": total_projects,
        "completed_projects": completed,
        "inprogress_projects": inprogress,
        "total_components": len(components),
        "categories": categories,
        "total_media": media_count
    }
