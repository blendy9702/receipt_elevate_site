# Receipt Elevate Site

운영 도메인: https://elevate.fans

일반 사용자(parent/child)용 Next.js 대시보드입니다. FastAPI(`127.0.0.1:8000`)와 세션 쿠키 `review_session`으로 통신합니다.

## 운영 (상시)

개발 서버(`npm run dev`)는 상시 실행하지 않습니다. production 빌드 후 systemd로 띄웁니다.

```bash
cd /usr/local/receipt_server/frontend/receipt_elevate_site
sudo ./restart.sh
```

- 서비스: `receipt-elevate.service`
- 포트: `3002` (`next start`)
- 상태: `systemctl status receipt-elevate`

## 로컬 개발

`npm run dev`는 **3003**입니다. 운영(`3002`, elevate.fans)과 동시에 띄울 수 있습니다.

```bash
cd /usr/local/receipt_server/frontend/receipt_elevate_site
npm run dev
```

- 개발: http://localhost:3003
- 운영 반영: `sudo ./restart.sh`
