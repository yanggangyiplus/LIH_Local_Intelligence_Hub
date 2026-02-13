"""
네이티브 폴더 선택 다이얼로그.
브라우저에서 전체 경로를 얻을 수 없을 때 백엔드에서 시스템 다이얼로그를 띄움.
"""

import platform
import subprocess
from typing import Optional


def pick_folder(title: str = "폴더 선택") -> Optional[str]:
    """
    OS별 네이티브 폴더 선택 다이얼로그를 띄우고 선택된 경로 반환.
    Returns:
        선택된 폴더 절대 경로 또는 None (취소 시)
    """
    system = platform.system()

    try:
        if system == "Darwin":  # macOS
            script = f'return POSIX path of (choose folder with prompt "{title}")'
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()

        elif system == "Linux":
            for cmd in [
                ["zenity", "--file-selection", "--directory", f"--title={title}"],
                ["kdialog", "--getexistingdirectory", "--title", title],
            ]:
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=300,
                    )
                    if result.returncode == 0 and result.stdout.strip():
                        return result.stdout.strip()
                except FileNotFoundError:
                    continue
            return _pick_folder_tk(title)

        elif system == "Windows":
            ps_script = f'''
Add-Type -AssemblyName System.Windows.Forms
$folder = New-Object System.Windows.Forms.FolderBrowserDialog
$folder.Description = "{title}"
$folder.ShowNewFolderButton = $true
if ($folder.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
    $folder.SelectedPath
}}
'''
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=300,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()

        else:
            return _pick_folder_tk(title)

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return _pick_folder_tk(title)

    return None


def _pick_folder_tk(title: str) -> Optional[str]:
    """tkinter fallback (대부분의 환경에서 동작)."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askdirectory(title=title)
        root.destroy()
        return path if path else None
    except Exception:
        return None
