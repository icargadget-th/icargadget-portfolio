import os
import shutil
import uuid
import requests
from pathlib import Path
from PIL import Image
from backend.app.database import get_all_media_paths, is_supabase_enabled, SUPABASE_URL, SUPABASE_KEY

MEDIA_DIR = Path("data/media")
TEMP_DIR = Path("data/media_temp")

# Ensure directories exist
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def optimize_image(source_path: Path, target_path: Path, max_width: int = 1200, quality: int = 80):
    """Resizes and compresses an image, converting it to WebP format to save space."""
    try:
        with Image.open(source_path) as img:
            # Handle EXIF orientation
            try:
                from PIL import ImageOps
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass
                
            # Convert to RGB if it has transparency or is in RGBA/P mode to avoid WebP saving issues
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                pass
            else:
                img = img.convert("RGB")
                
            # Check size and resize if necessary
            width, height = img.size
            if width > max_width:
                ratio = max_width / float(width)
                new_height = int(float(height) * float(ratio))
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
            img.save(target_path, "WEBP", quality=quality)
            return True
    except Exception as e:
        print(f"Error optimizing image {source_path}: {e}")
        return False

def save_uploaded_media(file_bytes: bytes, original_filename: str, project_id: int):
    """
    Saves an uploaded file.
    If it's an image, optimize it and convert to WebP.
    If it's a video, copy it.
    If Supabase is enabled, uploads to Supabase Storage and returns the public URL.
    Otherwise, saves to local disk and returns the relative path.
    """
    ext = os.path.splitext(original_filename)[1].lower()
    unique_id = uuid.uuid4().hex
    
    # Define file types
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    video_exts = {".mp4", ".mov", ".webm", ".avi"}
    
    file_type = None
    if ext in image_exts:
        file_type = "image"
        target_filename = f"proj_{project_id}_{unique_id}.webp"
    elif ext in video_exts:
        file_type = "video"
        target_filename = f"proj_{project_id}_{unique_id}{ext}"
    else:
        file_type = "other"
        target_filename = f"proj_{project_id}_{unique_id}{ext}"
        
    temp_path = TEMP_DIR / f"temp_{unique_id}{ext}"
    target_path = MEDIA_DIR / target_filename
    
    # Save bytes to temp file first
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
        
    try:
        if file_type == "image":
            success = optimize_image(temp_path, target_path)
            if not success:
                shutil.copy2(temp_path, target_path)
        else:
            shutil.copy2(temp_path, target_path)
            
        # If Supabase is enabled, upload to bucket and clean up local file
        if is_supabase_enabled():
            content_type = "application/octet-stream"
            if file_type == "image":
                content_type = "image/webp"
            elif ext == ".mp4":
                content_type = "video/mp4"
            elif ext == ".mov":
                content_type = "video/quicktime"
            elif ext == ".webm":
                content_type = "video/webm"
                
            upload_url = f"{SUPABASE_URL}/storage/v1/object/icargadget-media/{target_filename}"
            upload_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": content_type
            }
            
            with open(target_path, "rb") as f_data:
                file_content = f_data.read()
                
            res = requests.post(upload_url, headers=upload_headers, data=file_content)
            if res.status_code != 200:
                # If bucket doesn't exist, we can try to create it, but it's better to raise an instruction
                raise Exception(f"Failed to upload file to Supabase storage. Status: {res.status_code}, Response: {res.text}. Please ensure 'icargadget-media' bucket exists and is public.")
                
            # Clean up the local target file since it's uploaded
            if target_path.exists():
                os.remove(target_path)
                
            # Return Supabase public URL
            return f"{SUPABASE_URL}/storage/v1/object/public/icargadget-media/{target_filename}", file_type
            
    finally:
        # Clean up temp file
        if temp_path.exists():
            os.remove(temp_path)
            
    # Return local relative path (fallback mode)
    return f"data/media/{target_filename}", file_type

def remove_media_file(relative_path: str):
    """Deletes a media file from Supabase Storage or local disk depending on the path type."""
    if not relative_path:
        return False
        
    # If it is a Supabase URL, delete from Supabase storage
    if relative_path.startswith("http://") or relative_path.startswith("https://"):
        if is_supabase_enabled():
            try:
                filename = relative_path.split("/")[-1]
                del_url = f"{SUPABASE_URL}/storage/v1/object/icargadget-media"
                del_headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                }
                res = requests.delete(del_url, headers=del_headers, json={"prefixes": [filename]})
                return res.status_code == 200
            except Exception as e:
                print(f"Error removing file from Supabase storage: {e}")
        return False
        
    # Otherwise, it's a local file path
    full_path = Path(relative_path)
    try:
        if full_path.exists() and full_path.is_file():
            os.remove(full_path)
            return True
    except Exception as e:
        print(f"Error removing local file {full_path}: {e}")
    return False

def cleanup_orphaned_media():
    """
    Compares the files in local folder or Supabase storage against records in the database.
    Deletes any orphaned files.
    """
    if is_supabase_enabled():
        try:
            db_paths = get_all_media_paths()
            db_filenames = {p.split("/")[-1] for p in db_paths}
            
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            list_url = f"{SUPABASE_URL}/storage/v1/bucket/icargadget-media/list"
            res = requests.post(list_url, headers=headers, json={"limit": 1000})
            if res.status_code != 200:
                return []
                
            files = res.json()
            deleted_files = []
            for f in files:
                name = f.get("name")
                if name and name not in db_filenames:
                    del_url = f"{SUPABASE_URL}/storage/v1/object/icargadget-media"
                    requests.delete(del_url, headers=del_headers, json={"prefixes": [name]})
                    deleted_files.append(name)
            return deleted_files
        except Exception as e:
            print(f"Error in Supabase media cleanup: {e}")
            return []
            
    # Local fallback cleanup
    db_paths = get_all_media_paths()
    db_filenames = {os.path.basename(p) for p in db_paths}
    
    deleted_files = []
    if not MEDIA_DIR.exists():
        return deleted_files
        
    for item in MEDIA_DIR.iterdir():
        if item.is_file():
            if item.name not in db_filenames:
                try:
                    os.remove(item)
                    deleted_files.append(item.name)
                except Exception as e:
                    print(f"Failed to delete orphaned file {item.name}: {e}")
                    
    return deleted_files
