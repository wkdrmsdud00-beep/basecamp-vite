export const normalizeDateString = (dateStr) => {
    if (!dateStr) return '';
    let clean = dateStr.replace(/[\.\/]/g, '-').replace(/\s/g, '').replace(/-+/g, '-').replace(/-+$/, '');
    return clean;
};

// ==========================================
// 헬퍼 함수: AI 피드백 4단 분리 파싱 (과거 텍스트 호환 정규식 탑재)
// ==========================================
export const parseAIFeedback = (feedbackText) => {
    if (!feedbackText) return null;
    let parsed = null;

    if (typeof feedbackText === 'string') {
        // 1. 최신 JSON 포맷 시도
        try {
            let j = JSON.parse(feedbackText);
            if (Array.isArray(j)) j = j[0];
            if (j && (j.kinesiology || j.운동학적 || j.rest || j.휴식)) {
                return j;
            }
        } catch (e) {
            // 에러 발생 시 여기서 포기하지 않고 2번 단계(정규식)로 넘어감
        }

        // 2. 과거의 일반 텍스트 데이터 정규식 파싱
        if (feedbackText.includes('운동학적')) {
            parsed = {
                kinesiology: (feedbackText.match(/\[?운동학적 관점\]?\s*([\s\S]*?)(?=\[?휴식 관점\]?|$)/) || [])[1]?.trim(),
                rest: (feedbackText.match(/\[?휴식 관점\]?\s*([\s\S]*?)(?=\[?영양 관점\]?|$)/) || [])[1]?.trim(),
                nutrition: (feedbackText.match(/\[?영양 관점\]?\s*([\s\S]*?)(?=\[?권장 유산소\]?|$)/) || [])[1]?.trim(),
                cardio: (feedbackText.match(/\[?권장 유산소\]?\s*([\s\S]*?)$/) || [])[1]?.trim()
            };
            if (!parsed.kinesiology && !parsed.rest) parsed = null;
        }
    } else if (typeof feedbackText === 'object') {
        parsed = feedbackText;
    }

    return parsed;
};
