# 모아팡

김은경 선생님의 방과후 수업 홈페이지 — https://sadacaca37.github.io/moa/

## 화면
| 파일 | 하는 일 |
|---|---|
| `index.html` | 첫 화면: 방번호 5자리 → 이름 쓰기, 이어하기, 타자팡 바로가기, 링크 게시판 |
| `dress.html` | 캐릭터 꾸미기 (기본 몸 + 옷·소품, 색 바꾸기) |
| `class.html` | 반 화면: 대기실·가상 교실(실시간 이동·채팅), 게시판(반 링크·수업 보드), 퀴즈 |
| `games.html` | 미니 게임 10가지, 문제 만들기 |
| `board.html` | 수업 보드 보기 (학생용) |
| `teacher.html` | 선생님 화면: 반 만들기, 방번호·QR, 진행판(수업 시작, 맵, 공지, 퀴즈, 게임), 첫 화면 꾸미기 |
| `padlet.html` | 내 패들렛: 패들렛 CSV·엑셀 가져오기, 보드 고치기, 학생에게 보이기 |

## 공통
- `js/fb.js` — Firebase(moaboard-943a3) 연결: Firestore(반·학생·보드), Realtime Database(접속·움직임·채팅·퀴즈·게임 진행)
- `js/avatar.js` — 캐릭터 그리기 (`assets/layers/*.png`를 겹치고 색만 바꿈)
- `css/moa.css` — 도트 게임 모양

## 그림
모든 그림은 제미나이로 만든 것(`assets/`). 코드는 버튼·글자·반투명 표시만 그린다.
