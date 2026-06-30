import React, { useMemo } from 'react';
import { normalizeDateString } from '../utils/helpers';
import Card from './Card';

// ==========================================
// 📊 이번 달 부위별 통계 차트 (웨이트 그래프 + 유산소 수치 분리)
// ==========================================
const MonthlyStatsChart = ({ logs, memberId, selectedMonth }) => {
    const myLogs = useMemo(() => {
        return logs.filter(l => l.memberId === memberId && normalizeDateString(l.date).startsWith(selectedMonth));
    }, [logs, memberId, selectedMonth]);

    const sortedStats = useMemo(() => {
        const counts = { '가슴': 0, '등': 0, '하체': 0, '어깨': 0, '팔': 0, '유산소': 0, '기타': 0 };
        
        myLogs.forEach(log => {
            let t = log.target || '';
            let matched = false;
            
            if (t.includes('가슴')) { counts['가슴']++; matched = true; }
            if (t.includes('등')) { counts['등']++; matched = true; }
            if (t.includes('하체') || t.includes('다리')) { counts['하체']++; matched = true; }
            if (t.includes('어깨')) { counts['어깨']++; matched = true; }
            if (t.includes('팔') || t.includes('이두') || t.includes('삼두')) { counts['팔']++; matched = true; }
            
            if ((log.cardios && log.cardios.length > 0) || t.includes('유산소')) { counts['유산소']++; matched = true; }

            if (!matched) counts['기타']++; 
        });

        // 🌟 유산소를 제외한 나머지 웨이트 항목만 먼저 횟수 내림차순으로 정렬
        const weightStats = Object.entries(counts)
            .filter(([part]) => part !== '유산소')
            .sort((a, b) => b[1] - a[1]);
        
        // 🌟 유산소 항목은 무조건 맨 마지막 배열에 추가
        const cardioStat = ['유산소', counts['유산소']];
        
        return [...weightStats, cardioStat];
    }, [myLogs]);

    const avgCondition = useMemo(() => {
        const conditionScores = { '최상': 5, '상': 4, '중': 3, '하': 2, '최하': 1 };
        let totalScore = 0;
        let validCount = 0;
        
        myLogs.forEach(log => {
            if (conditionScores[log.condition]) {
                totalScore += conditionScores[log.condition];
                validCount++;
            }
        });
        
        if (validCount === 0) return null;
        
        const avgScore = Math.round(totalScore / validCount);
        if (avgScore === 5) return { text: '최상', emoji: '😍', color: 'text-[#D9C54B]' };
        if (avgScore === 4) return { text: '상', emoji: '😊', color: 'text-blue-400' };
        if (avgScore === 3) return { text: '중', emoji: '😐', color: 'text-emerald-400' };
        if (avgScore === 2) return { text: '하', emoji: '🙁', color: 'text-orange-400' };
        if (avgScore === 1) return { text: '최하', emoji: '😫', color: 'text-red-500' };
        return null;
    }, [myLogs]);

    // 🌟 막대그래프의 최고 높이 기준을 잡을 때 '유산소' 횟수는 제외하여 비율이 깨지지 않게 방지
    const maxCount = Math.max(...sortedStats.filter(s => s[0] !== '유산소').map(s => s[1]), 5); 
    const [year, month] = selectedMonth.split('-');

    return (
        <Card className="mb-6 border-slate-800 bg-slate-900/40">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <i className="fa-solid fa-chart-column mr-2 text-primary-500"></i>
                    {year}년 {parseInt(month)}월 운동 부위별 집중도
                </h3>
                
                {avgCondition && (
                    <div className="text-xs bg-black border border-slate-700 px-3 py-2 rounded-xl text-slate-300 font-bold flex items-center gap-1.5 shadow-inner">
                        월 평균 컨디션: 
                        <span className={`${avgCondition.color} text-[13px] ml-1`}>{avgCondition.emoji} {avgCondition.text}</span>
                    </div>
                )}
            </div>
            
            {sortedStats.every(s => s[1] === 0) ? (
                <div className="text-center py-6 text-slate-500 text-sm">해당 월의 운동 기록이 없습니다.</div>
            ) : (
                <div className="flex justify-center items-end gap-2 sm:gap-6 h-32 mt-4 px-2">
                    {sortedStats.map(([part, count], idx) => {
                        const isCardio = part === '유산소';
                        const heightPercent = isCardio ? 0 : (count / maxCount) * 100;
                        const isZero = count === 0;

                        return (
                            <div key={idx} className={`flex flex-col items-center flex-shrink-0 ${isCardio ? 'w-16 ml-2 sm:ml-6 border-l border-slate-800 pl-2 sm:pl-6' : 'w-10 sm:w-12'}`}>
                                {isCardio ? (
                                    // 🌟 유산소 전용 UI (막대그래프 없이 숫자와 아이콘만 크게 렌더링)
                                    <div className="flex flex-col items-center justify-end h-full w-full">
                                        <div className={`text-2xl font-black mb-4 ${isZero ? 'text-slate-700' : 'text-orange-400'}`}>
                                            {count}<span className="text-xs font-medium text-slate-500 ml-0.5">회</span>
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-orange-400/80 mt-2 whitespace-nowrap font-bold flex items-center gap-1">
                                            <i className="fa-solid fa-person-running"></i> {part}
                                        </div>
                                    </div>
                                ) : (
                                    // 기존 웨이트 부위용 막대그래프 UI
                                    <>
                                        <div className={`text-xs font-bold mb-1 ${count === maxCount && !isZero ? 'text-[#D9C54B] scale-110 transition-transform' : 'text-slate-400'}`}>{isZero ? '' : `${count}회`}</div>
                                        <div className="w-full bg-black rounded-t flex flex-col justify-end overflow-hidden border border-slate-800 h-24">
                                            <div 
                                                className={`w-full transition-all duration-700 ease-out ${count === maxCount && !isZero ? 'bg-gradient-to-t from-yellow-700 to-[#D9C54B] shadow-[0_0_10px_rgba(217,197,75,0.3)]' : 'bg-gradient-to-t from-slate-800 to-slate-500'}`}
                                                style={{ height: `${heightPercent}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-slate-300 mt-2 whitespace-nowrap font-bold">{part}</div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default MonthlyStatsChart;