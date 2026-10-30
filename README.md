# PNU AFTER DARK

부산대학교 학생회 할로윈 이벤트 기획 시안. 실제 일정·가격·공식 주최는 확정되지 않았으며 현재는 익명 관심 등록만 제공합니다.

## 실행 및 배포

빌드 없는 HTML/CSS/JavaScript. `python -m http.server 8080` 후 http://localhost:8080 에서 확인합니다. GitHub Pages는 `.github/workflows/pages.yml`로 main 푸시 시 배포합니다. 저장소 Settings → Pages → Source를 GitHub Actions로 설정하세요.

## Supabase 연결

1. Supabase MCP를 인증한 세션에서 대상 프로젝트를 확인합니다. `supabase/schema.sql`을 `apply_migration`으로 적용하세요. 신규 테이블과 함수만 추가합니다.
2. `assets/config.js`의 supabaseUrl과 supabaseAnonKey에 프로젝트 URL 및 publishable/anon 키를 입력합니다. **service_role 키를 프런트엔드에 넣지 마세요.**
3. Supabase Auth에 운영자 계정을 만든 뒤 SQL로 권한을 부여합니다: `insert into public.event_admins(user_id) values ('운영자 Auth UUID');`
4. `admin.html`에서 로그인해 집계합니다. 토큰은 메모리에만 보관합니다.

현재 연결 프로젝트는 `ssmtsuhtjnkvtlvxakqb`입니다. `supabase/admin-bootstrap.sql`을 적용해 지정한 운영자 이메일 `ksy31098046@gmail.com`의 인증 완료 시 자동으로 권한을 부여하도록 설정했습니다. 운영자는 `admin.html`에서 계정을 생성하고 메일 인증 후 로그인합니다. Supabase Site URL은 배포된 `admin.html`로 설정되어 있습니다. 지정 이메일 변경·인증 해제 시 자동 부여한 권한을 회수합니다.

## 측정 정의

- 분석 동의 후 page_view → event_view(참여 안내 30% 노출) → registration_start → registration_complete(서버 등록 성공)를 세션별 순서로 집계합니다. 동일 단계 반복은 세션 단위로 중복 제거합니다.
- 단계 이탈률 = (해당 단계 세션 − 다음 단계 세션) / 해당 단계 세션. 진행 중 세션과 동의 거절·차단으로 인한 편향을 고려하세요.
- 모든 주요 버튼은 data-track ID로 총 클릭과 클릭 세션을 집계합니다. UTM source/medium/campaign은 각 세션 첫 방문을 기준으로 표시합니다.
- 관심 등록은 분석 동의와 별개로 사용자가 제출할 때 저장됩니다. 분석 거절 사용자의 관심 등록도 총 관심 수에 포함되므로 퍼널 완료 세션 수와 다를 수 있습니다.
- 구매 전환율 = 기간 내 방문 이후 검증된 구매가 발생한 세션 / 방문 세션. 매출은 기간 내 검증된 구매 전체입니다.
- **실제 결제는 미연동입니다.** 결제 제공자의 서명을 검증한 웹훅 서버만 verified_purchases에 order_id(중복 방지), event_id, session_id, amount(원)를 기록해야 합니다. 브라우저에서 구매 성공을 기록하는 API는 제공하지 않습니다.
- 익명 ID는 로컬 저장소, 세션 ID는 탭 세션 저장소에 저장합니다. 동의 철회 시 미전송 이벤트와 방문자 ID를 삭제합니다. 기존 서버 데이터 삭제는 별도 운영 절차가 필요합니다.
- 네트워크 실패 시 메모리 큐를 재시도하며 ID로 중복을 방지합니다. 페이지 종료·장기 장애 시 일부 이벤트가 유실될 수 있습니다.

## 운영 전 점검

공식 행사 정보와 개인정보 안내를 확정하고 공개 수집 API에 속도 제한/봇 방어를 추가하세요. 현재 익명 수집은 조작 가능한 클라이언트 분석이며 회계나 인증 근거가 아닙니다. Supabase에서 보관 기간(예: 90일)에 따른 삭제 작업을 설정하세요. 운영자 계정에만 조회 권한이 있으며 익명 사용자는 원본 테이블을 읽을 수 없습니다.

## 검증

`node --check assets/app.js`, `node --check assets/analytics.js`, `node --check assets/admin.js`, `node --test assets/analytics.test.mjs`. 동의 전 미전송, 단계 중복 방지, 실패 재시도 ID 유지, 동의 철회 큐 삭제를 검증합니다. 실제 수집·운영자 인증·SQL 실행은 Supabase 설정 후 확인해야 합니다.
