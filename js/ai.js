// 모아팡 AI — Firebase AI Logic (Gemini Developer API, 무료 등급)
//  - 콘솔: AI 서비스 > AI Logic 에서 Gemini Developer API를 켜 둠 (2026-11-23)
//  - 키를 코드에 넣지 않아도 됨 (Firebase 프로젝트로 부름)
//  - 모델이 없어지면 다음 모델로 넘어감
const V = '12.19.0';
// App Check 사이트 키 (Google Cloud Fraud Defense = 예전 reCAPTCHA Enterprise, 'moapang.kr App Check', 2026-11-26 만듦).
// 공개해도 되는 키. Firebase 콘솔 App Check에 모아팡 웹 앱으로 등록되어 있음. AI 요청에만 붙여서 무료 확인 횟수(월 1만)를 아낌
const AI_APPCHECK_SITE_KEY = '6LeyrzIuAAAAAH6wwuR5HOCkXVVf011Lxsz6YYJ3';
const CFG = {
  apiKey: 'AIzaSyBlA9TN1BKvnsKrzuq2fMalCrATTeFgkUo',
  authDomain: 'moaboard-943a3.firebaseapp.com',
  projectId: 'moaboard-943a3',
  messagingSenderId: '986530203160',
  appId: '1:986530203160:web:b48121b7113f38a49c656d'
};
// 빠른 모델부터 (2026-11 Firebase AI Logic 문서: 세 모델 모두 무료 등급에서 결제 없이 씀). 하나가 막히면 다음 모델로
// 2026-11-26 실제 시험: 3.8-flash는 15문제에 40초 넘게 걸리고 '사용자가 많아요'(500)도 나옴 → 빠른 flash-lite부터
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.6-flash'];
const TIMEOUT = 45000; // 모델 하나를 이만큼 기다려도 답이 없으면 다음 모델로
// 실패 이유를 선생님이 알아볼 수 있는 말로 (화면에 작게 보여 줌)
export function aiReason(e) {
  const m = String((e && (e.detail || e.message)) || e || '');
  if (/timeout|시간 초과/i.test(m)) return 'AI 답이 너무 늦어요(45초 넘게)';
  if (/Failed to fetch|NetworkError|network|ERR_|Load failed|dynamically imported/i.test(m)) return '인터넷이나 학교 방화벽이 AI 연결(googleapis.com)을 막고 있어요';
  if (/has not been used|SERVICE_DISABLED|is disabled|not enabled/i.test(m)) return 'Firebase 콘솔에서 AI Logic(Gemini Developer API)이 꺼져 있어요';
  if (/API_KEY_SERVICE_BLOCKED|API key not valid|referer|referrer|blocked/i.test(m)) return 'API 키 설정이 AI 서비스나 이 주소를 막고 있어요';
  if (/App ?Check|app-check|appcheck/i.test(m)) return 'App Check(모아팡에서 온 요청인지 확인)가 아직 설정되지 않았어요';
  if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(m)) return 'AI 무료 사용량이 다 찼어요';
  if (/location|region|country|not supported/i.test(m)) return '이 지역에서는 이 AI를 쓸 수 없대요';
  if (/\b404\b|not found/i.test(m)) return 'AI 모델을 찾지 못했어요';
  if (/JSON|Unexpected token/i.test(m)) return 'AI 답을 읽지 못했어요';
  return m.slice(0, 80);
}
let ready = null;
function load() {
  if (!ready) {
    ready = Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-ai.js')
    ]).then(async ([A, AI]) => {
      const old = A.getApps().find((x) => x.name === 'moa-ai');
      const app = old || A.initializeApp(CFG, 'moa-ai');
      // App Check: Firebase가 AI Logic에는 App Check를 꼭 켜 둠(2026-07부터 설정할 때 자동).
      // AI 요청에 '모아팡(moapang.kr)에서 온 요청' 표시(App Check 토큰)를 붙인다
      if (AI_APPCHECK_SITE_KEY && !old) {
        const AC = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app-check.js');
        AC.initializeAppCheck(app, { provider: new AC.ReCaptchaEnterpriseProvider(AI_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
      }
      return { AI, ai: AI.getAI(app, { backend: new AI.GoogleAIBackend() }) };
    });
    ready.catch(() => { ready = null; });
  }
  return ready;
}
const abortErr = () => { const e = new Error('aborted'); e.name = 'AbortError'; return e; };
function withSignal(p, signal) {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(abortErr());
  return new Promise((ok, no) => { signal.addEventListener('abort', () => no(abortErr()), { once: true }); p.then(ok, no); });
}
function parseJSON(t) {
  const s = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch (e) { /* 앞뒤 말이 붙은 경우 */ }
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
  const c = s.indexOf('{'), d = s.lastIndexOf('}');
  return JSON.parse(s.slice(c, d + 1));
}
// prompt를 보내고 JSON으로 받기. 실패하면 code: 'rate_limited' | 'unavailable'
export async function aiJSON(prompt, { signal } = {}) {
  let loaded;
  try { loaded = await withSignal(load(), signal); }
  catch (e) { if (e && e.name === 'AbortError') throw e; console.warn('[모아팡 AI] 불러오기 실패', e); const x = new Error(String((e && e.message) || e)); x.code = 'unavailable'; x.detail = x.message; throw x; }
  const { AI, ai } = loaded;
  const errs = []; let limited = 0, guard = 0;
  for (const m of MODELS) {
    try {
      const model = AI.getGenerativeModel(ai, { model: m, generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } });
      let timer;
      const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error('timeout ' + m)), TIMEOUT); });
      const r = await withSignal(Promise.race([model.generateContent(prompt), late]), signal).finally(() => clearTimeout(timer));
      return parseJSON(r.response.text());
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      const msg = String((e && e.message) || e);
      console.warn('[모아팡 AI] ' + m + ' 실패:', msg);
      errs.push(m + ': ' + msg);
      if (/App ?Check|app-check|appcheck/i.test(msg)) { guard++; break; } // App Check는 모델을 바꿔도 같음
      if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) limited++; // 이 모델 사용량이 찼으면 다음 모델로
    }
  }
  const x = new Error(errs.join(' | ') || 'AI');
  x.code = guard ? 'appcheck' : limited === MODELS.length ? 'rate_limited' : 'unavailable';
  // 화면에 보여 줄 이유: 모델 이름 문제(404)가 아닌 첫 번째 진짜 이유
  x.detail = (errs.find((s) => !/\b404\b|not found/i.test(s)) || errs[0] || '').replace(/^[^:]+:\s*/, '');
  throw x;
}

// 퀴즈 문제 만들기 (OX·객관식) — 선생님 화면과 미니 게임이 같이 씀
export const AGES = ['초등 1~2학년 (8~9살)', '초등 3~4학년 (10~11살)', '초등 5~6학년 (12~13살)', '중학생 (14~16살)', '고등학생 (17~19살)', '어른'];
export const CATS = ['컴퓨터·코딩', '인공지능', '디지털 안전·예절', '과학', '수학', '우리말·낱말', '사회·우리나라', '역사', '세계·지리', '영어 낱말', '음악·미술', '체육·건강', '동물·식물', '생활 상식', '여러 분야 섞어서'];
export async function aiQuiz({ kind, age, cat, level = '보통', n = 10, topic = '', have = [] }, opts) {
  const fmt = kind === 'ox'
    ? '[{"q":"맞거나 틀린 문장","a":"O 또는 X","why":"한 줄 해설"}] — O와 X가 반반쯤 되게'
    : '[{"q":"질문","options":["보기1","보기2","보기3","보기4"],"answer":정답 보기 번호(1~4),"why":"한 줄 해설"}] — 보기는 짧게, 정답 번호가 한쪽으로 몰리지 않게';
  const prompt = `너는 한국 학교 방과후 수업에서 쓰는 퀴즈를 만드는 선생님 도우미야.
아래 조건으로 ${kind === 'ox' ? 'OX 퀴즈' : '4지선다 객관식 퀴즈'} 문제를 ${n}개 만들어 줘.
- 대상(나이): ${age}
- 분야(카테고리): ${cat}${topic ? `\n- 주제·차시: ${topic}` : ''}
- 난이도: ${level} (대상 나이에 맞춰서)
규칙:
- 대상 나이가 아는 쉬운 우리말로 짧게 써요.
- 사실이 확실한 내용만 내요. 답이 두 개일 수 있거나 헷갈리는 문제는 빼요.
- 무섭거나 슬프거나 어른용인 내용, 누군가를 놀리는 내용은 넣지 않아요.
- 서로 겹치지 않게 골고루 내요.${have.length ? `\n- 이미 있는 문제와 겹치지 않게 해요: ${have.slice(0, 40).join(' / ')}` : ''}
다른 말 없이 JSON 배열 하나로만 답해요. 형식: ${fmt}`;
  let v = await aiJSON(prompt, opts);
  if (v && !Array.isArray(v)) v = v.questions || v.items || Object.values(v).find(Array.isArray) || [];
  const clean = (x) => String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').trim();
  if (kind === 'ox') {
    const toOX = (x) => { const s = clean(x).toUpperCase(); return /^(O|○|TRUE|참|맞음)$/.test(s) ? 'O' : /^(X|×|FALSE|거짓|틀림)$/.test(s) ? 'X' : ''; };
    return (v || []).map((x) => ({ q: clean(x.q || x.question).slice(0, 120), a: toOX(x.a ?? x.answer), why: clean(x.why || x.explain).slice(0, 80) })).filter((x) => x.q && x.a);
  }
  return (v || []).map((x) => {
    const o = (x.options || x.o || []).map(clean).filter(Boolean).slice(0, 4).map((s) => s.slice(0, 40));
    let a = typeof x.answer === 'number' ? x.answer - 1 : /^\d$/.test(clean(x.answer)) ? +clean(x.answer) - 1 : o.indexOf(clean(x.answer));
    if (!(a >= 0 && a < o.length)) a = -1;
    return { q: clean(x.q || x.question).slice(0, 120), o, a, why: clean(x.why || '').slice(0, 80) };
  }).filter((x) => x.q && x.o.length >= 2 && x.a >= 0);
}
