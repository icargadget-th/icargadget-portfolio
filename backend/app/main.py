import os
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Database operations
from backend.app.database import (
    init_db,
    list_projects,
    get_project_detail,
    create_project,
    update_project,
    delete_project_record,
    add_media_record,
    delete_media_record,
    get_statistics,
    is_supabase_enabled
)

# Media processing
from backend.app.media import save_uploaded_media, remove_media_file, cleanup_orphaned_media

# PDF Compiler
from backend.app.pdf import generate_project_pdf

# Backup / Restore
from backend.app.backup import create_backup_zip, restore_backup_zip

# Create directories
Path("data/media").mkdir(parents=True, exist_ok=True)
Path("data/exports").mkdir(parents=True, exist_ok=True)
Path("data/backups").mkdir(parents=True, exist_ok=True)

# Initialize database
init_db()

app = FastAPI(
    title="Car Installation Portfolio API",
    description="Backend services for iCarGadget installation portfolio",
    version="1.0.0"
)

# Enable CORS for localhost frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC MODEL SCHEMAS ---

class ComponentSchema(BaseModel):
    id: Optional[int] = None
    project_id: Optional[int] = None
    brand: str
    model: str
    category: str
    quantity: int = 1
    notes: Optional[str] = None

class ProjectCreateSchema(BaseModel):
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    client_name: str
    client_contact: Optional[str] = None
    description: Optional[str] = None
    status: str = "In-Progress"
    components: Optional[List[ComponentSchema]] = []

class LoginRequest(BaseModel):
    username: str
    password: str

# --- AUTH HELPER ---

def verify_admin(authorization: Optional[str] = Header(None)):
    """Simple verification helper for admin mutation routes."""
    expected_token = "Bearer icargadget-admin-token-xyz"
    if not authorization or authorization != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized admin session. Please log in.")

# --- API ENDPOINTS ---

@app.post("/api/admin/login")
def api_admin_login(req: LoginRequest):
    """Authenticates the admin user."""
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin1234")
    
    if req.username == admin_user and req.password == admin_pass:
        return {"success": True, "token": "icargadget-admin-token-xyz"}
    else:
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง")

@app.get("/api/config")
def api_get_config():
    """Retrieve system configuration state (e.g. Supabase status)."""
    return {
        "supabase_enabled": is_supabase_enabled(),
        "supabase_url": os.getenv("SUPABASE_URL", "")
    }

@app.get("/api/stats")
def api_get_stats():
    """Retrieve quick aggregate statistics for the dashboard."""
    try:
        return get_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
def api_list_projects(
    search: Optional[str] = Query(None, description="Search vehicle, client, or component"),
    category: Optional[str] = Query(None, description="Filter by component category"),
    status: Optional[str] = Query(None, description="Filter by project status")
):
    """Retrieve all projects matching search and category queries."""
    try:
        return list_projects(search=search, category=category, status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}")
def api_get_project(project_id: int):
    """Retrieve detailed project record (including component list and media)."""
    try:
        project = get_project_detail(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
def api_create_project(project: ProjectCreateSchema, authorization: Optional[str] = Header(None)):
    """Create a new project record."""
    verify_admin(authorization)
    try:
        project_id = create_project(project.dict())
        return {"id": project_id, "message": "Project created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/projects/{project_id}")
def api_update_project(project_id: int, project: ProjectCreateSchema, authorization: Optional[str] = Header(None)):
    """Update details and component lists of an existing project."""
    verify_admin(authorization)
    try:
        success = update_project(project_id, project.dict())
        if not success:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        return {"id": project_id, "message": "Project updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}")
def api_delete_project(project_id: int, authorization: Optional[str] = Header(None)):
    """Delete project from database and delete all associated media files."""
    verify_admin(authorization)
    try:
        # Delete from DB and fetch associated file paths
        media_paths = delete_project_record(project_id)
        
        # Remove files (works for both local disk and Supabase Storage)
        deleted_count = 0
        for path in media_paths:
            if remove_media_file(path):
                deleted_count += 1
                
        return {
            "success": True,
            "message": f"Project and {deleted_count} media files deleted successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/media")
async def api_upload_media(
    project_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    is_thumbnail: bool = Form(False),
    authorization: Optional[str] = Header(None)
):
    """Upload project media (image or video), processes images, and records in DB."""
    verify_admin(authorization)
    # Enforce 100MB file limit
    MAX_FILE_SIZE = 100 * 1024 * 1024 # 100MB
    
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File exceeds maximum allowed size of 100MB. Uploaded size: {file_size / (1024*1024):.2f}MB"
        )
        
    try:
        # Save (optimizes if image, uploads to Supabase if active)
        saved_path, file_type = save_uploaded_media(contents, file.filename, project_id)
        
        # Add entry to DB
        media_id = add_media_record(
            project_id=project_id,
            file_path=saved_path,
            file_type=file_type,
            is_thumbnail=is_thumbnail,
            caption=caption
        )
        
        return {
            "id": media_id,
            "file_path": saved_path,
            "file_type": file_type,
            "is_thumbnail": is_thumbnail,
            "caption": caption
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/media/{media_id}")
def api_delete_media(media_id: int, authorization: Optional[str] = Header(None)):
    """Delete specific media from database and storage."""
    verify_admin(authorization)
    try:
        file_path = delete_media_record(media_id)
        if not file_path:
            raise HTTPException(status_code=404, detail="Media record not found")
            
        remove_media_file(file_path)
        return {"success": True, "message": "Media file deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/media/cleanup")
def api_cleanup_media(authorization: Optional[str] = Header(None)):
    """Audit media directory/storage and sweep orphaned files."""
    verify_admin(authorization)
    try:
        deleted_files = cleanup_orphaned_media()
        return {
            "success": True,
            "deleted_count": len(deleted_files),
            "deleted_files": deleted_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/{project_id}")
def api_export_pdf(project_id: int):
    """Generate project layout PDF and serve for direct download."""
    try:
        project = get_project_detail(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        pdf_path = generate_project_pdf(project)
        
        filename = f"Portfolio_{project['vehicle_year']}_{project['vehicle_make']}_{project['vehicle_model']}.pdf"
        filename = filename.replace(" ", "_")
        
        return FileResponse(
            path=str(pdf_path),
            filename=filename,
            media_type="application/pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup")
def api_export_backup(authorization: Optional[str] = Header(None)):
    """Create local ZIP backup and return file (local SQLite mode only)."""
    verify_admin(authorization)
    if is_supabase_enabled():
        raise HTTPException(status_code=400, detail="Backups are disabled in Supabase Cloud mode since database and media are stored securely in the cloud.")
    try:
        zip_path = create_backup_zip()
        return FileResponse(
            path=str(zip_path),
            filename=zip_path.name,
            media_type="application/zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/restore")
async def api_import_restore(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """Upload a backup ZIP file and restore (local SQLite mode only)."""
    verify_admin(authorization)
    if is_supabase_enabled():
        raise HTTPException(status_code=400, detail="Restoring backups is disabled in Supabase Cloud mode.")
    temp_zip_path = Path(f"data/backups/temp_restore_{file.filename}")
    try:
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        success, message = restore_backup_zip(temp_zip_path)
        if not success:
            raise HTTPException(status_code=400, detail=message)
            
        return {"success": True, "message": message}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_zip_path.exists():
            os.remove(temp_zip_path)

# --- STATIC FILES SERVING & REACT SPA ROUTING ---

# Mount local uploads folder (only used/accessible in local fallback mode)
app.mount("/data/media", StaticFiles(directory="data/media"), name="media")

# Mount Admin static build directory (separated admin panel)
if Path("admin/dist").exists():
    app.mount("/admin/assets", StaticFiles(directory="admin/dist/assets"), name="admin_assets")
    
    @app.get("/admin/{admin_catchall:path}")
    def serve_admin(admin_catchall: str):
        if admin_catchall.startswith("api/") or admin_catchall.startswith("data/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
        # Check if requested path is a file in the admin build folder (e.g. logo.png)
        file_path = Path("admin/dist") / admin_catchall
        if admin_catchall and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        return FileResponse("admin/dist/index.html")
        
    @app.get("/admin")
    def serve_admin_root():
        return FileResponse("admin/dist/index.html")

# Mount React static build directory (customer landing page)
if Path("frontend/dist").exists():
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        if catchall.startswith("api/") or catchall.startswith("data/") or catchall.startswith("admin"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
        # Check if requested path is a file in the build folder (e.g. logo.png, favicon.ico)
        file_path = Path("frontend/dist") / catchall
        if catchall and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        return FileResponse("frontend/dist/index.html")
else:
    @app.get("/{catchall:path}")
    def serve_placeholder(catchall: str):
        if catchall.startswith("api/") or catchall.startswith("admin"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        return JSONResponse(
            status_code=200, 
            content={"status": "API is active. Frontend is not compiled yet. Please run build scripts first."}
        )
