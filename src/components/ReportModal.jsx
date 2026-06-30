import { useState } from 'react';
import { normalizeDateString } from '../utils/helpers';
import { callGeminiAPI } from '../services/geminiService';

// ==========================================
// 📊 A4 월간 컨디션 리포트 (5단계 컨디션 적용)
// ==========================================
const ReportModal = ({ logs, memberProfile, reportMonth, onClose, allLogs }) => {
    const [aiSummary, setAiSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [trainerComment, setTrainerComment] = useState('');
    const [compareRange, setCompareRange] = useState(1); 

    const monthData = logs.filter(log => normalizeDateString(log.date).startsWith(reportMonth));
    
    const [yearStr, monthStr] = reportMonth.split('-');
    const targetDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const pastStartDate = new Date(targetDate);
    pastStartDate.setMonth(pastStartDate.getMonth() - compareRange);
    
    const pastLogs = logs.filter(log => {
        const logDate = new Date(normalizeDateString(log.date));
        return logDate >= pastStartDate && logDate < targetDate;
    });

    let totalTime = 0, validTimeCount = 0, totalCalories = 0;
    const targetCounts = { '가슴': 0, '등': 0, '하체': 0, '어깨': 0, '복근': 0, '기타': 0 };
    
    // 🌟 5단계 컨디션 카운터로 확장
    const conditionCounts = { '최상': 0, '상': 0, '중': 0, '하': 0, '최하': 0 };

    monthData.forEach(log => {
        const durationMatch = (log.duration || '').match(/\d+/);
        if (durationMatch) { totalTime += parseInt(durationMatch[0]); validTimeCount++; }
        if (log.watchData && log.watchData.calories) totalCalories += parseInt(log.watchData.calories) || 0;

        let t = log.target || '';
        if (t.includes('가슴')) targetCounts['가슴']++;
        else if (t.includes('등')) targetCounts['등']++;
        else if (t.includes('하체') || t.includes('다리')) targetCounts['하체']++;
        else if (t.includes('어깨')) targetCounts['어깨']++;
        else if (t.includes('복근') || t.includes('코어')) targetCounts['복근']++;
        else targetCounts['기타']++;

        // 🌟 5단계 컨디션 집계 적용
        if (['최상', '상', '중', '하', '최하'].includes(log.condition)) {
            conditionCounts[log.condition]++;
        } else {
            conditionCounts['중']++; // 값이 없거나 이상하면 '중'으로 기본 편입
        }
    });

    const avgTime = validTimeCount > 0 ? Math.round(totalTime / validTimeCount) : 0;
    const totalWorkouts = monthData.length;

    const allMonthData = allLogs.filter(log => normalizeDateString(log.date).startsWith(reportMonth));
    const rankStats = {};
    allMonthData.forEach(log => {
        const mId = log.memberId || 'unknown';
        rankStats[mId] = (rankStats[mId] || 0) + 1;
    });
    const sortedRank = Object.entries(rankStats).sort((a, b) => b[1] - a[1]);
    const myRankIndex = sortedRank.findIndex(r => r[0] === memberProfile?.id);
    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
    const totalMembers = Object.keys(rankStats).length;

    const generatePieGradient = () => {
        const colors = { '가슴': '#D9C54B', '등': '#3B82F6', '하체': '#EF4444', '어깨': '#8B5CF6', '복근': '#10B981', '기타': '#6B7280' };
        let gradientString = '';
        let currentPercentage = 0;

        const sortedTargets = Object.entries(targetCounts).filter(t => t[1] > 0).sort((a, b) => b[1] - a[1]);
        if (sortedTargets.length === 0) return 'conic-gradient(#f1f5f9 0% 100%)';

        sortedTargets.forEach(([target, count], index) => {
            const percentage = (count / totalWorkouts) * 100;
            gradientString += `${colors[target]} ${currentPercentage}% ${currentPercentage + percentage}%${index === sortedTargets.length - 1 ? '' : ', '}`;
            currentPercentage += percentage;
        });
        return `conic-gradient(${gradientString})`;
    };

    const generateAISummary = async () => {
        if (monthData.length === 0) { alert("기준 월의 운동 기록이 없어 AI 요약을 생성할 수 없습니다."); return; }
        
        setIsGenerating(true);
        setAiSummary("AI가 과거 데이터와 비교 분석하여 요약을 작성 중입니다...");

        const currentDataStr = monthData.map(l => `[${normalizeDateString(l.date)}] 부위: ${l.target}, 컨디션: ${l.condition}`).join('\n');
        const pastDataStr = pastLogs.map(l => `[${normalizeDateString(l.date)}] 부위: ${l.target}, 컨디션: ${l.condition}`).join('\n');

        const prompt = `당신은 전문 퍼스널 트레이너입니다. 회원명: ${memberProfile?.name}
        [과거 ${compareRange}개월간 운동 요약]
        총 출석: ${pastLogs.length}회
        상세: ${pastDataStr || '기록 없음'}

        [이번 달(${reportMonth}) 운동 데이터]
        총 출석: ${totalWorkouts}회
        상세: ${currentDataStr}

        위 데이터를 바탕으로 과거(${compareRange}개월 전) 대비 이번 달의 성장과 발전(운동 빈도, 타겟 부위 다양성, 컨디션 유지 등)을 구체적으로 비교 분석해 주세요. 
        가독성을 위해 3~4줄로 핵심만 요약해서 긍정적인 어조로 작성해 주세요.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const { text, error } = await callGeminiAPI(payload);
        if (text) {
            setAiSummary(text.trim());
        } else {
            setAiSummary("");
            alert(`AI 요약 생성에 실패했습니다. (${error || ''})`);
        }
        setIsGenerating(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex justify-center items-start overflow-y-auto p-4 custom-scrollbar">
            <div className="bg-slate-900 w-full max-w-[850px] my-4 rounded-xl shadow-2xl relative flex flex-col print:bg-transparent print:shadow-none print:m-0 print:w-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 rounded-t-xl sticky top-0 z-10 no-print flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-white flex items-center whitespace-nowrap"><i className="fa-solid fa-file-invoice mr-2 text-primary-500"></i> 월간 리포트 (과거 비교 분석)</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select 
                            value={compareRange} 
                            onChange={e => setCompareRange(parseInt(e.target.value))} 
                            className="bg-black border border-slate-600 text-white text-sm rounded px-2 py-1 outline-none focus:border-primary-500"
                        >
                            <option value={1}>직전 1개월 비교</option>
                            <option value={3}>직전 3개월 비교</option>
                            <option value={6}>직전 6개월 비교</option>
                            <option value={12}>직전 12개월 비교</option>
                        </select>
                        <button onClick={() => window.print()} className="bg-primary-600 hover:bg-primary-500 text-black px-4 py-1.5 rounded font-bold text-sm"><i className="fa-solid fa-print mr-1"></i> 출력</button>
                        <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded text-sm"><i className="fa-solid fa-xmark mr-1"></i> 닫기</button>
                    </div>
                </div>

                <div className="p-4 bg-slate-400 flex justify-center overflow-x-auto print:bg-transparent print:p-0 print:overflow-visible">
                    <div id="report-print-area" className="bg-white w-[210mm] h-[297mm] text-black p-8 sm:p-10 relative shadow-lg mx-auto overflow-hidden box-border" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                            <img src="logo.jpg" alt="watermark" className="w-[80%]" style={{ filter: 'invert(1) grayscale(100%)' }} />
                        </div>

                        <div className="relative z-10 h-full flex flex-col">
                            <div className="text-center mb-5 border-b-2 border-black pb-4">
                                <h1 className="text-3xl font-black tracking-tight">{yearStr}년 {parseInt(monthStr)}월 CONDITION REPORT</h1>
                            </div>

                            <div className="flex justify-between items-end mb-5 border-l-4 border-[#D9C54B] pl-4">
                                <div>
                                    <h2 className="text-2xl font-bold">{memberProfile?.name} <span className="text-base text-gray-500 font-normal">회원님</span></h2>
                                    <p className="text-gray-600 text-sm mt-1">{memberProfile?.goal ? `목표: ${memberProfile.goal}` : 'BASECAMP와 함께하는 건강한 변화'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-1">월간 출석 랭킹</div>
                                    <div className="text-2xl font-black text-[#D9C54B]">{myRank}위 <span className="text-base text-gray-400 font-normal">/ {totalMembers}명</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3 mb-5">
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 flex flex-col justify-center">
                                    <div className="text-[11px] text-gray-500 font-bold mb-1">출석 횟수</div>
                                    <div className="text-lg font-black">{totalWorkouts}<span className="text-[10px] font-normal text-gray-500 ml-1">회</span></div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 flex flex-col justify-center">
                                    <div className="text-[11px] text-gray-500 font-bold mb-1">총 운동 시간</div>
                                    <div className="text-lg font-black">{totalTime}<span className="text-[10px] font-normal text-gray-500 ml-1">분</span></div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 flex flex-col justify-center">
                                    <div className="text-[11px] text-gray-500 font-bold mb-1">평균 운동 시간</div>
                                    <div className="text-lg font-black">{avgTime}<span className="text-[10px] font-normal text-gray-500 ml-1">분</span></div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 flex flex-col justify-center">
                                    <div className="text-[11px] text-gray-500 font-bold mb-1">총 소모 칼로리</div>
                                    <div className="text-lg font-black text-orange-500">{totalCalories.toLocaleString()}<span className="text-[10px] font-normal text-gray-500 ml-1">kcal</span></div>
                                </div>
                            </div>

                            <div className="mb-5">
                                <h3 className="text-base font-bold mb-2 flex items-center"><i className="fa-solid fa-chart-pie mr-2 text-gray-400"></i> 이번 달 훈련 데이터 시각화</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                        <div className="w-24 h-24 rounded-full border border-gray-100 flex-shrink-0" style={{ background: generatePieGradient() }}></div>
                                        <div className="flex-1 ml-4 space-y-1">
                                            <div className="font-bold text-[11px] border-b border-gray-100 pb-1 mb-1">집중 타겟 비율</div>
                                            {Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).map(([target, count]) => {
                                                if (count === 0) return null;
                                                const colors = { '가슴': 'bg-[#D9C54B]', '등': 'bg-blue-500', '하체': 'bg-red-500', '어깨': 'bg-purple-500', '복근': 'bg-emerald-500', '기타': 'bg-gray-500' };
                                                return (
                                                    <div key={target} className="flex items-center text-[11px] justify-between">
                                                        <div className="flex items-center"><span className={`w-2 h-2 rounded-full mr-1.5 ${colors[target]}`}></span>{target}</div>
                                                        <span className="font-bold">{Math.round((count/totalWorkouts)*100)}%</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                        <div className="font-bold text-[11px] border-b border-gray-100 pb-1 mb-2">운동 컨디션 기록</div>
                                        <div className="space-y-1.5">
                                            {/* 🌟 5단계 컨디션 매핑 리스트 */}
                                            {['최상', '상', '중', '하', '최하'].map(cond => {
                                                const count = conditionCounts[cond];
                                                const percent = totalWorkouts > 0 ? (count / totalWorkouts) * 100 : 0;
                                                
                                                // 등급별 컬러 및 이모지 설정
                                                let color = 'bg-gray-300';
                                                let emoji = '';
                                                if (cond === '최상') { color = 'bg-[#D9C54B]'; emoji = '😍'; }
                                                else if (cond === '상') { color = 'bg-blue-400'; emoji = '😊'; }
                                                else if (cond === '중') { color = 'bg-emerald-400'; emoji = '😐'; }
                                                else if (cond === '하') { color = 'bg-orange-400'; emoji = '🙁'; }
                                                else if (cond === '최하') { color = 'bg-red-500'; emoji = '😫'; }

                                                return (
                                                    <div key={cond} className="flex items-center text-[11px]">
                                                        <div className="w-14 font-bold text-gray-600 flex justify-between items-center pr-2">
                                                            <span className="text-[13px]">{emoji}</span>
                                                            <span>{cond}</span>
                                                        </div>
                                                        <div className="flex-1 bg-gray-100 h-2.5 rounded-full mx-1 overflow-hidden">
                                                            <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${percent}%` }}></div>
                                                        </div>
                                                        <div className="w-6 text-right font-bold text-gray-700">{count}일</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-5 relative">
                                <div className="flex justify-between items-end border-b border-gray-200 pb-1 mb-2">
                                    <h3 className="text-base font-bold flex items-center"><i className="fa-solid fa-robot mr-2 text-[#D9C54B]"></i> 과거 {compareRange}개월 대비 성장 리포트</h3>
                                    <button onClick={generateAISummary} disabled={isGenerating} className="no-print text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-300 font-bold transition flex items-center">
                                        {isGenerating ? <><i className="fa-solid fa-spinner animate-spin mr-1"></i> 분석중...</> : <><i className="fa-solid fa-wand-magic-sparkles mr-1"></i> 비교 분석 생성</>}
                                    </button>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[70px] text-gray-700 leading-relaxed text-[12px] whitespace-pre-line shadow-inner">
                                    {aiSummary || <span className="text-gray-400 italic">우측의 버튼을 눌러 과거 기록과 비교 분석해 보세요.</span>}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-base font-bold mb-2 flex items-center border-b border-gray-200 pb-1"><i className="fa-solid fa-pen-nib mr-2 text-gray-400"></i> 트레이너의 한 마디</h3>
                                <textarea 
                                    value={trainerComment} 
                                    onChange={e => setTrainerComment(e.target.value)} 
                                    className="w-full flex-1 bg-white border border-gray-200 rounded-xl p-3 text-gray-800 leading-relaxed text-[12px] resize-none outline-none focus:border-[#D9C54B] no-print shadow-inner" 
                                    placeholder="출력 시 여기에 작성한 내용이 인쇄됩니다..."
                                ></textarea>
                                <div className="hidden print:block border border-gray-200 rounded-xl p-3 flex-1 text-gray-800 leading-relaxed text-[12px] whitespace-pre-line bg-gray-50">
                                    {trainerComment || ''}
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-0 w-full text-center text-xs text-gray-400 font-bold tracking-widest">
                                BASECAMP PERSONAL TRAINING
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;