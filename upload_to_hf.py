"""
Upload ColisConnect files to Hugging Face Space file by file.
Only uploads key files (no node_modules, no large DB).
"""
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi

TOKEN = os.getenv("HF_API_TOKEN")
REPO_ID = "yoann1234/colisconnect"
LOCAL_ROOT = Path(".")

# Patterns to skip
SKIP_DIRS = {
    "node_modules", "backend/node_modules", ".git", "_temp_npm",
    "playwright-report", "test-results", ".playwright", ".vscode",
    ".cursor", ".codex", ".agent", "hf_deploy", "_hf_deploy",
    "hf_mcp_server", "hf_ocr_server", "tests"
}
SKIP_EXTS = {".sqlite", ".sqlite-wal", ".sqlite-shm", ".db", ".log",
             ".err.log", ".out.log"}
SKIP_FILES = {
    "datalist_test.png", "nexus_hero.png",  # large images
    "create_seed_db.js",  # will be uploaded separately
}

api = HfApi(token=TOKEN)

def should_skip(rel_path: str) -> bool:
    parts = Path(rel_path).parts
    for skip in SKIP_DIRS:
        sp = Path(skip).parts
        if parts[:len(sp)] == sp:
            return True
    ext = Path(rel_path).suffix.lower()
    if ext in SKIP_EXTS:
        return True
    name = Path(rel_path).name
    if name in SKIP_FILES:
        return True
    return False

files_to_upload = []
for p in LOCAL_ROOT.rglob("*"):
    if p.is_dir():
        continue
    rel = p.as_posix().lstrip("./")
    if not rel:
        continue
    if should_skip(rel):
        continue
    files_to_upload.append((str(p), rel))

total = len(files_to_upload)
print(f"Uploading {total} files to {REPO_ID} ...")

for i, (local, remote) in enumerate(files_to_upload, 1):
    try:
        api.upload_file(
            path_or_fileobj=local,
            path_in_repo=remote,
            repo_id=REPO_ID,
            repo_type="space",
        )
        print(f"[{i}/{total}] OK {remote}")
    except Exception as e:
        print(f"[{i}/{total}] FAIL {remote} -- {e}", file=sys.stderr)

print("Done!")
