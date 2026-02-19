# .dmg 빌드 가이드 (DMG 브랜치)

이 브랜치(`DMG`)는 **macOS .dmg 데스크톱 앱**을 만들 때 사용합니다.

## 옵션 A: 백엔드 내장 (.dmg만 배포 — 권장)

앱을 켜면 **백엔드가 자동으로 실행**됩니다. 사용자는 .dmg만 설치하면 됩니다.

### 사전 요구사항

- **Rust**, **Node.js 18+**, **Tauri CLI** (위와 동일)
- **Python 3.11+**, **pip** (백엔드 sidecar 빌드용)

### 빌드 순서

1. **브랜치**
   ```bash
   git checkout DMG
   ```

2. **백엔드 sidecar 빌드** (한 번만 실행)
   ```bash
   chmod +x scripts/build_sidecar.sh
   ./scripts/build_sidecar.sh
   ```
   - `backend/`에서 PyInstaller로 단일 실행 파일 생성
   - `src-tauri/binaries/lih-backend-<target>` 에 복사됨

3. **.dmg 빌드**
   ```bash
   cargo tauri build
   ```

4. **결과물**
   - `src-tauri/target/release/bundle/dmg/Local Intelligence Hub_0.1.0_aarch64.dmg`
   - 이 .dmg를 설치한 사용자는 **백엔드를 따로 실행할 필요 없음** (앱이 자동으로 백엔드 기동)

### 사용자 실행 방법 (백엔드 내장 .dmg)

1. .dmg 설치 후 **Local Intelligence Hub** 앱만 실행하면 됨.
2. (선택) OpenAI 사용 시 앱 내 **설정**에서 API 키 입력.

---

## 옵션 B: 백엔드 없이 .dmg만 (수동 백엔드)

sidecar를 빌드하지 않으면, `src-tauri/binaries/` 안의 **placeholder**만 포함됩니다.  
이 경우 앱은 뜨지만 API가 동작하지 않으며, 사용자가 직접 백엔드를 실행해야 합니다.

1. **빌드** (sidecar 스크립트 생략)
   ```bash
   git checkout DMG
   cargo tauri build
   ```

2. **사용자**
   - 백엔드 실행: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - 그 다음 앱 실행

---

## 사전 요구사항 (공통)

- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (frontend): `node -v` 18+
- **Tauri CLI**: `cargo install tauri-cli --version "^2"`

**참고**: 웹 배포(Vercel)는 `main` 브랜치를 사용하세요.
