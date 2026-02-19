# Vercel 배포 방법 (LIH 프론트엔드)

제출용 **제품/서비스 주소**를 만들려면 프론트엔드를 Vercel에 배포하면 됩니다.  
백엔드는 별도 서버(Railway 등)에 올리거나, **백엔드 없이** 배포해 두고 시연은 로컬 영상으로 보여줄 수 있습니다.

---

## 1. 저장소 연결 (GitHub 권장)

1. [Vercel](https://vercel.com) 로그인 후 **Add New → Project**
2. 이 레포지토리 선택 후 **Import**
3. **Root Directory**를 `frontend`로 지정
4. **Framework Preset**: Vite (자동 인식됨)
5. **Build Command**: `npm run build` (기본값)
6. **Output Directory**: `dist` (기본값)

---

## 2. 환경 변수 (선택)

백엔드를 따로 배포한 경우에만 설정합니다.

| 이름 | 값 | 설명 |
|------|-----|------|
| `VITE_API_BASE_URL` | `https://your-backend-url.railway.app/api/v1` | 백엔드 API 주소 (끝에 `/api/v1` 포함) |

- 백엔드 없이 **UI만** 제출할 때: 설정 안 해도 됨. (API 호출은 실패하지만 페이지는 열림.)
- 백엔드도 배포했을 때: 위처럼 넣고 **Redeploy** 한 번 더 실행.

---

## 3. 배포 실행

- **Deploy** 클릭
- 끝나면 `https://프로젝트명.vercel.app` 형태의 URL이 생성됨
- 이 URL을 해커톤 **제품/서비스 주소**로 제출

---

## 4. 백엔드도 같이 쓰고 싶을 때 (Railway 예시)

1. [Railway](https://railway.app)에서 **New Project → Deploy from GitHub**
2. 이 레포 선택 후 **Root Directory**: `backend`
3. **Variables**에 `OPENAI_API_KEY` 등 설정
4. 배포 후 나온 URL(예: `https://xxx.railway.app`) 복사
5. Vercel 프로젝트 **Settings → Environment Variables**에  
   `VITE_API_BASE_URL` = `https://xxx.railway.app/api/v1` 추가
6. Vercel에서 **Redeploy**

백엔드 서버의 **CORS**에 Vercel 도메인을 허용해야 합니다.  
`backend/.env`에 다음 추가 후 재시작:

```env
CORS_ORIGINS=https://프로젝트명.vercel.app,https://프로젝트명-팀명.vercel.app
```

---

## 요약

| 목적 | 작업 |
|------|------|
| 제출용 URL만 필요 | 프론트만 Vercel 배포 → 나온 URL 제출 |
| 실제 API까지 동작하게 | 백엔드 Railway 등에 배포 → `VITE_API_BASE_URL` 설정 + CORS 설정 |

시연은 로컬에서 실행한 뒤 영상으로 보여주면 됩니다.
