"""
Sidecar 진입점: PyInstaller로 패키징할 때 사용.
DATA_DIR 안에 .env 파일을 생성/관리하여 OpenAI API 키 등 설정을 영구 저장.
"""
import os
import sys

# .env 템플릿 (DATA_DIR에 파일이 없을 때 최초 생성)
DEFAULT_ENV = """\
# LIH Desktop - 설정 파일
# 앱 Settings 페이지에서도 수정 가능합니다.

LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini
USE_OPENAI_EMBEDDING=true
"""


def main():
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    data_dir = os.environ.get("DATA_DIR", "")

    if data_dir:
        os.makedirs(data_dir, exist_ok=True)
        for sub in ("chroma",):
            os.makedirs(os.path.join(data_dir, sub), exist_ok=True)

        # DATA_DIR을 CWD로 설정 → pydantic_settings가 이 폴더의 .env를 읽음
        os.chdir(data_dir)

        # .env 파일이 없으면 기본 템플릿 생성
        env_path = os.path.join(data_dir, ".env")
        if not os.path.exists(env_path):
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(DEFAULT_ENV)

    import uvicorn
    from app.main import app

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
    sys.exit(0)
