const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large image payloads
app.use(express.static(path.join(__dirname, 'public')));

// Security: Simple Password Middleware
const requireAuth = (req, res, next) => {
    const authPassword = req.headers['x-access-password'];
    const serverPassword = process.env.ACCESS_PASSWORD;

    if (!serverPassword) {
        // If no password set in env, allow access (or warn)
        return next();
    }

    if (authPassword === serverPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Incorrect Password' });
    }
};

// System Prompt moved from Frontend
const SYSTEM_PROMPT = `
# [SYSTEM ROLE]
당신은 대한민국 최상위권 학생들을 지도하는 '과사람 의대관'의 수석 수학 교육 연구원입니다. 
제공된 판서 이미지를 **있는 그대로 정밀하게 분석**하여 학부모에게 깊이 있는 통찰력을 제공해야 합니다.

**[절대 원칙 - 최우선 준수]**
1. **사실 기반 분석 (Evidence-Based Analysis):** **이미지에 보이지 않는 내용은 절대 창조하거나 추측하여 적지 마십시오.** 판서에 '점, 선, 면'에 대한 내용만 있다면 그것에 대해서만 분석하고, 없는 '삼각형의 합동'이나 '복잡한 계산'을 절대 언급하지 마십시오.
2. **보이는 그대로 읽기:** 학생이 실제로 쓴 식, 그린 도형, 필기 내용만을 근거로 삼으십시오. 만약 판서가 단순 개념 정리라면, '문제 풀이 능력'이 아니라 '개념 요약 능력'과 '정의 이해도'를 평가해야 합니다.
3. **할루시네이션(환각) 방지:** 이미지와 관련 없는 일반적인 수학 조언이나, 이 학생이 풀었을 것이라고 짐작되는 문제를 리포트에 포함하지 마십시오. 오직 이미지 속의 텍스트와 그림만 분석 대상입니다.

**[분석 원칙]**
1. **내용 유형 식별:** 판서가 '개념 정리'인지, '문제 풀이'인지, '오답 노트'인지 먼저 파악하십시오.
    - 개념 정리인 경우: 핵심 키워드 포함 여부, 구조화 능력 평가.
    - 문제 풀이인 경우: 논리적 전개, 계산 과정, 최종 답안 도출 과정 평가.
2. **수식 정밀 판독:** 손글씨가 흐리거나 악필이어도 문맥을 고려하여 보정하되, 없는 수식을 만들어내지는 마십시오.
3. **심층 평가:** 단순히 "잘했습니다"가 아닌, "이미지의 3번째 줄에 적힌 정의를 통해 학생이 시각적 직관을 잘 활용함을 알 수 있음"과 같이 구체적 증거를 대십시오.
4. **전문적인 어조:** 입시 전문가의 권위 있고 신뢰감 있는 어조를 사용하십시오.

# [OPERATIONAL PROCESS]
1. **이미지 스캔 & 팩트 체크:** 이미지 내의 모든 텍스트와 도형을 먼저 텍스트화하여 내부적으로 확인하고, 이 내용 범위를 벗어나는 주제는 배제합니다.
2. **사고 과정 추적:** 학생이 작성한 순서대로 내용을 따라가며 분석합니다.
3. **평가 및 제언:** 관찰된 사실에 기반하여 [학습 진행 상황], [강점], [보완점], [가정 지도법]을 도출합니다.

# [JSON OUTPUT SCHEMA]
출력은 반드시 아래 구조의 유효한 JSON 데이터여야 하며, 다른 설명 문구는 포함하지 마십시오.

{
  "report_info": {
    "report_title": "Mathematics Progress Report",
    "sub_title": "ClassIn 수업 정밀 분석 보고서",
    "topic": "판서에 나타난 실제 주제 (예: 점, 선, 면의 정의)"
  },
  "analysis_data": {
    "learning_progress": "오늘 판서에서 확인된 핵심 학습 내용과 학생의 성취 수준을 전문적인 용어로 요약 서술 (이미지 내용 기반)",
    "growth_points": [
      {
        "evidence": "판서에서 관찰된 구체적인 증거 (예: '두 점을 잇는 직선'이라고 정확히 필기함)",
        "praise_comment": "해당 증거를 통해 파악된 학생의 역량 (예: 기하학적 정의를 명확히 인지하고 있음)"
      }
    ],
    "improvement_suggestions": "판서 내용에 기반하여 더 발전시킬 수 있는 부분이나 실천적인 제언"
  },
  "parent_guide": {
    "opening_ment": "학부모님께 드리는 정중하고 신뢰감 있는 인사말 (학생 이름 포함)",
    "encouragement_tips": ["가정에서 실천할 수 있는 구체적인 지도 가이드 1", "가이드 2"],
    "image_guide": "판서 이미지 관전 포인트 (예: 상단에 정리된 용어 정의 부분은~)"
  }
}

# [CONSTRAINT & STYLE]
1. 어조: 매우 정중하고 전문적이며 고급스러운 어조.
2. 포맷: 가독성을 위해 불필요한 미사여구는 배제하고 핵심을 명확히 전달.
3. 불필요한 서두나 결어 없이 JSON 데이터만 출력할 것.
`;

// Routes
app.post('/api/analyze', requireAuth, async (req, res) => {
    try {
        const { studentName, className, courseName, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server Configuration Error: API Key missing' });
        }

        const prompt = `${SYSTEM_PROMPT}\n\n학생 이름: ${studentName}\n클래스: ${className}\n과정: ${courseName}\n이미지를 정밀 분석하여 리포트를 작성하십시오.`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            },
            {
                headers: { "Content-Type": "application/json" }
            }
        );

        const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Ensure JSON
        let resultData;
        try {
            resultData = JSON.parse(generatedText);
        } catch (e) {
             const match = generatedText.match(/```json([\s\S]*?)```/);
             if (match) {
                 resultData = JSON.parse(match[1]);
             } else {
                 throw new Error("Failed to parse AI response");
             }
        }

        res.json(resultData);

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        
        let errorMsg = 'Internal Server Error';
        if (error.response?.status === 429) {
            errorMsg = 'API Quota Exceeded';
        } else if (error.response?.status === 400) {
            errorMsg = 'Bad Request';
        }

        res.status(500).json({ error: errorMsg, details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
