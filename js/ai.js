// 모아팡 AI — Firebase AI Logic (Gemini Developer API, 무료 등급)
//  - 콘솔: AI 서비스 > AI Logic 에서 Gemini Developer API를 켜 둠 (2026-11-23)
//  - 키를 코드에 넣지 않아도 됨 (Firebase 프로젝트로 부름)
//  - 모델이 없어지면 다음 모델로 넘어감
const V = '12.19.0';
const CFG = {
  apiKey: 'AIzaSyBlA9TN1BKvnsKrzuq2fMalCrATTeFgkUo',
  authDomain: 'moaboard-943a3.firebaseapp.com',
  projectId: 'moaboard-943a3',
  messagingSenderId: '986530203160',
  appId: '1:986530203160:web:b48121b7113f38a49c656d'
};
const MODELS = ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
let ready = null;
function load() {
  if (!ready) {
    ready = Promise.all([
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + V + '/firebase-ai.js')
    ]).then(([A, AI]) => {
      const app = A.getApps().find((x) => x.name === 'moa-ai') || A.initializeApp(CFG, 'moa-ai');
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
  let last = null;
  const { AI, ai } = await withSignal(load(), signal);
  for (const m of MODELS) {
    try {
      const model = AI.getGenerativeModel(ai, { model: m, generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } });
      const r = await withSignal(model.generateContent(prompt), signal);
      return parseJSON(r.response.text());
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      const msg = String((e && e.message) || e);
      if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate/i.test(msg)) { const x = new Error(msg); x.code = 'rate_limited'; throw x; }
      last = e; // 404(모델 없음)·잠깐 오류 → 다음 모델
    }
  }
  const x = new Error(String((last && last.message) || 'AI')); x.code = 'unavailable'; throw x;
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
