// 기존 3곳(ReportModal, MultiLogForm-OCR, MultiLogForm-AI저장)에 중복되어 있던
// "여러 API 키 x 여러 모델을 순차 시도" 로직을 한 곳으로 모았습니다.
//
// ⚠️ 보안 주의:
// Vite의 import.meta.env.VITE_* 값은 빌드 시 클라이언트 JS 번들에 그대로 노출됩니다.
// 즉, 지금 구조에서는 "코드에 하드코딩" → ".env에 하드코딩"으로 위치만 바뀐 것이고,
// 배포된 사이트의 소스를 열어보면 누구나 키를 볼 수 있는 점은 동일합니다.
// .env로 옮기면 (1) git에 키가 커밋되는 것을 막고 (2) 환경별로 키를 쉽게 교체할 수 있다는
// 이점은 있지만, 진짜 보안(키 완전 비공개)을 원한다면 추후 Firebase Cloud Functions 같은
// 서버리스 함수로 Gemini 호출을 옮기고, 프론트에서는 그 함수만 호출하도록 바꾸는 것을 권장합니다.

const apiKeys = (import.meta.env.VITE_GEMINI_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const DEFAULT_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-2.5-flash',
];

const modelsToTry = (import.meta.env.VITE_GEMINI_MODELS || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const MODELS = modelsToTry.length > 0 ? modelsToTry : DEFAULT_MODELS;

/**
 * Gemini generateContent를 여러 API 키 x 여러 모델 조합으로 순차 시도합니다.
 * 429(rate limit)는 잠시 대기 후 다음 조합으로, 그 외 에러는 즉시 다음 조합으로 넘어갑니다.
 *
 * @param {object} payload - { contents: [...] } 형태의 Gemini 요청 바디
 * @returns {Promise<{ text: string|null, error: string|null }>}
 */
export async function callGeminiAPI(payload) {
  if (apiKeys.length === 0) {
    return { text: null, error: 'GEMINI_API_KEY_MISSING: .env 파일에 VITE_GEMINI_API_KEYS를 설정하세요.' };
  }

  let lastErrorMsg = '알 수 없는 오류';

  for (const key of apiKeys) {
    for (const modelName of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();

        if (res.ok) {
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, error: null };
        } else {
          lastErrorMsg = data?.error?.message || '서버 응답 오류';
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 2000));
          }
          // 404(모델 없음) 등은 그냥 다음 모델/키로 즉시 넘어감
        }
      } catch (e) {
        lastErrorMsg = e.message;
      }
    }
  }

  return { text: null, error: lastErrorMsg };
}
