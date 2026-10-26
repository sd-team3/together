const { GoogleGenAI } = require('@google/genai');
const { CONSTANTS } = require('../config/constants');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SPORT_KEYS = Object.keys(CONSTANTS.SPORTS);           // ['soccer','baseball',...]
const STATE_LIST = Object.keys(CONSTANTS.AREAS);            // ['서울','경기',...]
const AGE_VALUES = Object.values(CONSTANTS.AGES).map(a => a.v); // ['10s','20s',...,'60+']

const SYSTEM_PROMPT = `
너는 스포츠 모임 매칭 앱의 검색어 파서야.
사용자의 자연어 검색어를 분석해서 아래 JSON 스키마로만 응답해. 설명, 코드블록 없이 순수 JSON만 반환해.

스키마:
{
  "sport": string | null,     // 다음 영문 키 중 하나: ${SPORT_KEYS.join(', ')} (한글 종목명이면 대응 영문 키로 변환)
  "state": string | null,     // 시/도명, 다음 중 하나: ${STATE_LIST.join(', ')}
  "city": string | null,      // 구/시/군명. "강남"처럼 접미사 생략되면 "강남구"처럼 정확한 명칭으로 변환. 참고 목록: ${JSON.stringify(CONSTANTS.AREAS)}
  "day": string[] | null,     // mon,tue,wed,thu,fri,sat,sun 중 0개 이상. "주말"→["sat","sun"], "평일"→["mon","tue","wed","thu","fri"]
  "ageRange": string | null,  // 다음 중 하나: ${AGE_VALUES.join(', ')} ("20대"→"20s")
  "keyword": string | null    // 위 필드로 못 담는 나머지 자유 키워드(제목/소개 검색용)
}

예시 입력: "강남에서 주말에 할만한 배드민턴 모임"
예시 출력: {"sport":"badminton","state":"서울","city":"강남구","day":["sat","sun"],"ageRange":null,"keyword":null}
`;

exports.parseSearchQuery = async (rawQuery, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: `${SYSTEM_PROMPT}\n\n입력: "${rawQuery}"`
            });
            const text = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(text);

            if (parsed.sport && !SPORT_KEYS.includes(parsed.sport)) parsed.sport = null;
            if (parsed.state && !STATE_LIST.includes(parsed.state)) parsed.state = null;
            if (parsed.ageRange && !AGE_VALUES.includes(parsed.ageRange)) parsed.ageRange = null;
            if (Array.isArray(parsed.day)) {
                parsed.day = parsed.day.filter(d => CONSTANTS.DAYS[d]);
            }
            return parsed;
        } catch (err) {
            const isOverloaded = err.message?.includes('UNAVAILABLE') || err.message?.includes('503');
            if (isOverloaded && attempt < retries) {
                await new Promise(r => setTimeout(r, 800 * (attempt + 1))); // 800ms, 1600ms 대기 후 재시도
                continue;
            }
            console.error('[aiSearchService] Gemini 파싱 실패, 폴백:', err.message);
            return { sport: null, state: null, city: null, day: null, ageRange: null, keyword: rawQuery };
        }
    }
};