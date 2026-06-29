import os
import zipfile
import shutil
from pathlib import Path
from datetime import datetime

if os.getenv("VERCEL"):
    BACKUP_DIR = Path("/tmp/backups")
    DB_PATH = Path("/tmp/database.db")
    MEDIA_DIR = Path("/tmp/media")
else:
    BACKUP_DIR = Path("data/backups")
    DB_PATH = Path("data/database.db")
    MEDIA_DIR = Path("data/media")

try:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"[BACKUP] Warning: Could not create backup directory: {e}")

def create_backup_zip() -> Path:
    """
    Creates a ZIP archive containing the SQLite database file and all files in data/media.
    Saves the zip in data/backups/portfolio_backup_[timestamp].zip.
    Returns the Path to the created backup zip.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"portfolio_backup_{timestamp}.zip"
    zip_path = BACKUP_DIR / zip_filename
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add database.db if it exists
        if DB_PATH.exists():
            # Save it as 'database.db' in the zip root
            zip_file.write(DB_PATH, arcname="database.db")
            
        # Add all files in data/media
        if MEDIA_DIR.exists():
            for root, dirs, files in os.walk(MEDIA_DIR):
                for file in files:
                    file_path = Path(root) / file
                    # Save relative path starting with media/
                    arcname = Path("media") / file
                    zip_file.write(file_path, arcname=arcname)
                    
    return zip_path

def restore_backup_zip(uploaded_zip_path: Path) -> tuple[bool, str]:
    """
    Restores the SQLite database and media files from a backup ZIP.
    Creates a safety backup of the current state before replacing.
    Returns (success, message).
    """
    # 1. Verify zip structure before doing anything
    try:
        with zipfile.ZipFile(uploaded_zip_path, 'r') as zip_file:
            namelist = zip_file.namelist()
            # A valid backup must contain database.db or files starting with media/
            has_db = "database.db" in namelist
            has_media = any(name.startswith("media/") for name in namelist)
            
            if not has_db and not has_media:
                return False, "Invalid backup file: Could not find database.db or media directory inside ZIP."
    except Exception as e:
        return False, f"Failed to read backup file: {e}"
        
    # 2. Create safety roll-back backup of the current state
    safety_zip_path = None
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safety_zip_path = BACKUP_DIR / f"pre_restore_safety_{timestamp}.zip"
        
        with zipfile.ZipFile(safety_zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            if DB_PATH.exists():
                zip_file.write(DB_PATH, arcname="database.db")
            if MEDIA_DIR.exists():
                for root, dirs, files in os.walk(MEDIA_DIR):
                    for file in files:
                        file_path = Path(root) / file
                        zip_file.write(file_path, arcname=Path("media") / file)
    except Exception as e:
        return False, f"Failed to create safety rollback backup: {e}. Restore aborted."
        
    # 3. Perform the restore
    try:
        # Close any active connections or delete DB (since we are on FastAPI, we might lock it.
        # SQLite handles hot updates but deleting is cleaner.
        # We can temporarily rename the database file, extract, then delete the old one.
        temp_old_db = Path("data/database.db.old")
        if DB_PATH.exists():
            os.rename(DB_PATH, temp_old_db)
            
        # Clean current media directory
        temp_old_media = Path("data/media_old")
        if MEDIA_DIR.exists():
            os.rename(MEDIA_DIR, temp_old_media)
            
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        
        # Extract files
        with zipfile.ZipFile(uploaded_zip_path, 'r') as zip_file:
            for member in zip_file.infolist():
                if member.filename == "database.db":
                    # Extract to database.db
                    with zip_file.open(member) as source, open(DB_PATH, 'wb') as target:
                        shutil.copyfileobj(source, target)
                elif member.filename.startswith("media/") and not member.is_dir():
                    # Extract to data/media/
                    # member.filename looks like 'media/file.webp'
                    filename = os.path.basename(member.filename)
                    if filename:
                        target_file_path = MEDIA_DIR / filename
                        with zip_file.open(member) as source, open(target_file_path, 'wb') as target:
                            shutil.copyfileobj(source, target)
                            
        # Clean up temporary folders
        if temp_old_db.exists():
            os.remove(temp_old_db)
        if temp_old_media.exists():
            shutil.rmtree(temp_old_media)
            
        return True, "Backup successfully restored. Database and media synchronized."
        
    except Exception as e:
        # Fail-safe rollback: Restore from safety backup!
        try:
            # Clean whatever we partial extracted
            if DB_PATH.exists():
                os.remove(DB_PATH)
            if MEDIA_DIR.exists():
                shutil.rmtree(MEDIA_DIR)
                
            # Extract safety zip
            MEDIA_DIR.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(safety_zip_path, 'r') as zip_file:
                for member in zip_file.infolist():
                    if member.filename == "database.db":
                        with zip_file.open(member) as source, open(DB_PATH, 'wb') as target:
                            shutil.copyfileobj(source, target)
                    elif member.filename.startswith("media/") and not member.is_dir():
                        filename = os.path.basename(member.filename)
                        if filename:
                            with zip_file.open(member) as source, open(MEDIA_DIR / filename, 'wb') as target:
                                shutil.copyfileobj(source, target)
            rollback_msg = "Restore failed. Successfully rolled back to pre-restore state."
        except Exception as rollback_err:
            rollback_msg = f"Restore failed and rollback failed: {rollback_err}. Current state may be corrupt. Manual restore from safety ZIP {safety_zip_path.name} required."
            
        return False, f"Restore failed: {e}. {rollback_msg}"
