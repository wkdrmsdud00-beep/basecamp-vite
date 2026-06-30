import React from 'react';
import { normalizeDateString, parseAIFeedback } from '../utils/helpers';
import Card from './Card';
import Badge from './Badge';

const WorkoutDetailView = ({ log, currentProfile, onDelete, onEdit }) => {
    if (!log) return <div className="text-center py-20 text-slate-400">선택된 기록이 없습니다.</div>;
    
    const getConditionColor = (cond) => {
        if (cond === '상') return 'primary';
        if (cond === '중') return 'yellow';
        return 'red';
    };

    // 컨디션에 따른 표정 아이콘 및 색상 변경 함수
    const getConditionIcon = (cond) => {
        if (cond === '상') return 'fa-face-grin-stars text-primary-500';
        if (cond === '중') return 'fa-face-smile text-yellow-500';
        return 'fa-face-frown text-red-500';
    };

    const normalizedExercises = (log.exercises || []).map(ex => {
        if (ex.sets && Array.isArray(ex.sets)) return ex; 
        return { name: ex.name, sets: [{ weight: ex.weight || '', reps: ex.reps || '', type: '일반' }] };
    });
    const maxSets = Math.max(...normalizedExercises.map(ex => ex.sets.length), 1);

    let totalSets = 0;
    let typesUsed = new Set();
    normalizedExercises.forEach(ex => {
        totalSets += ex.sets.length;
        ex.sets.forEach(s => {
            if(s.type && s.type !== '일반') typesUsed.add(s.type);
        });
    });
    
    const durationMatch = (log.duration || '').match(/\d+/);
    const durationNum = durationMatch ? parseFloat(durationMatch[0]) : NaN;
    const timePerSet = (!isNaN(durationNum) && totalSets > 0) ? (durationNum / totalSets).toFixed(1) : '-';
    
    let typeString = '일반 세트 진행';
    if (typesUsed.size > 0) {
        typeString = Array.from(typesUsed).join(', ') + ' 포함 진행';
    }

    const parsedFeedback = parseAIFeedback(log?.feedback);

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-white">{log.memberName || '회원'} 님의 운동 기록</h2>
                    <p className="text-slate-400 text-sm mt-1">기록일: {new Date(log.createdAt).toLocaleString()}</p>
                </div>
                {(currentProfile.role === 'trainer' || currentProfile.id === log.memberId) && (
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(log)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 bg-blue-500/10 rounded-lg transition">
                            <i className="fa-solid fa-pen mr-1"></i>기록 수정
                        </button>
                        <button onClick={() => onDelete(log.id)} className="text-red-400 hover:text-red-300 text-sm px-3 py-1 bg-red-500/10 rounded-lg transition">
                            <i className="fa-solid fa-trash mr-1"></i>삭제
                        </button>
                    </div>
                )}
            </div>

            {/* 🌟 4개였던 카드를 5개로 늘리고 반응형 그리드 적용 (lg:grid-cols-5) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="flex flex-col items-center text-center">
                    <i className="fa-regular fa-calendar text-2xl text-primary-500 mb-2"></i>
                    <div className="text-sm text-slate-400">운동 날짜</div>
                    <div className="text-lg font-bold">{normalizeDateString(log.date)}</div>
                </Card>
                
                {/* 🌟 기존 타겟 부위 카드에서 컨디션 뱃지를 분리 */}
                <Card className="flex flex-col items-center text-center">
                    <i className="fa-solid fa-fire text-2xl text-red-500 mb-2"></i>
                    <div className="text-sm text-slate-400">타겟 부위</div>
                    <div className="text-lg font-bold mt-1">{log.target}</div>
                </Card>

                {/* 🌟 분리되어 새로 추가된 컨디션 전용 카드 */}
                <Card className="flex flex-col items-center text-center">
                    <i className={`fa-solid ${getConditionIcon(log.condition)} text-2xl mb-2`}></i>
                    <div className="text-sm text-slate-400">운동 컨디션</div>
                    <div className="mt-1">
                        <Badge color={getConditionColor(log.condition)}>{log.condition || '미기입'}</Badge>
                    </div>
                </Card>

                <Card className="flex flex-col items-center text-center relative">
                    <i className="fa-solid fa-stopwatch text-2xl text-blue-500 mb-2"></i>
                    <div className="text-sm text-slate-400">총 시간 (효율)</div>
                    <div className="text-lg font-bold">{log.duration}</div>
                    <div className="text-xs font-medium text-blue-300 mt-1">총 {totalSets}세트 ({timePerSet}분/세트)</div>
                </Card>

                <Card className="flex flex-col items-center text-center">
                    <i className="fa-solid fa-heart-pulse text-2xl text-purple-500 mb-2"></i>
                    <div className="text-sm text-slate-400">워치 데이터</div>
                    <div className="text-sm font-bold text-orange-400 mt-1">{log.watchData?.calories || '-'} kcal</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        심박: {log.watchData?.minBpm || '-'}~{log.watchData?.maxBpm || '-'} <br/> (평균 {log.watchData?.avgBpm || '-'})
                    </div>
                </Card>
            </div>

            <Card className="border-l-4 border-l-primary-500 bg-slate-900/60">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-xl text-black shadow-[0_0_10px_rgba(217,197,75,0.5)]">🤖</div>
                    <div className="flex-1 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-primary-300">AI 개인 맞춤 트레이닝 분석</h3>
                            <p className="text-xs text-slate-400">BASECAMP AI 분석 시스템</p>
                        </div>
                        <span className="text-xs bg-slate-800 border border-slate-600 text-slate-300 px-2 py-1 rounded">{typeString}</span>
                    </div>
                </div>
                
                {parsedFeedback ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-primary-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0"><i className="fa-solid fa-dumbbell mr-1"></i>운동학적 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.kinesiology || parsedFeedback.운동학적 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-blue-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0"><i className="fa-solid fa-bed mr-1"></i>휴식 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.rest || parsedFeedback.휴식 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-green-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0"><i className="fa-solid fa-apple-whole mr-1"></i>영양 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.nutrition || parsedFeedback.영양 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-orange-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0"><i className="fa-solid fa-person-running mr-1"></i>권장 유산소</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.cardio || parsedFeedback.유산소 || '내용 없음'}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-200 leading-relaxed whitespace-pre-line bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 text-[15px]">
                        {log.feedback || '저장된 AI 코멘트가 없습니다.'}
                    </div>
                )}
            </Card>

            <Card>
                <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2"><i className="fa-solid fa-dumbbell mr-2 text-slate-400"></i>웨이트 루틴 기록</h3>
                <div className="overflow-x-auto custom-scrollbar pb-2">
                    <table className="w-full text-center border-collapse whitespace-nowrap min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-800 text-slate-300 text-xs">
                                <th className="p-2 border border-slate-700 w-12" rowSpan="2">순</th>
                                <th className="p-2 border border-slate-700 min-w-[120px]" rowSpan="2">운동 종목</th>
                                {Array.from({ length: maxSets }).map((_, i) => (
                                    <th key={i} className="p-2 border border-slate-700" colSpan="2">SET_{i + 1}</th>
                                ))}
                            </tr>
                            <tr className="bg-slate-800/50 text-slate-400 text-[10px]">
                                {Array.from({ length: maxSets }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        <th className="p-1 border border-slate-700 font-normal w-16">무게/종류</th>
                                        <th className="p-1 border border-slate-700 font-normal w-12">횟수</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {normalizedExercises.map((ex, idx) => (
                                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 text-sm">
                                    <td className="p-2 border border-slate-700/50 text-slate-500 font-bold bg-slate-900/30">{idx + 1}</td>
                                    <td className="p-2 border border-slate-700/50 font-medium text-left bg-slate-900/30">{ex.name}</td>
                                    {Array.from({ length: maxSets }).map((_, sIdx) => {
                                        const set = ex.sets[sIdx];
                                        return (
                                            <React.Fragment key={sIdx}>
                                                <td className="p-2 border border-slate-700/50 text-primary-400">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {set && set.type === '드롭' && <span className="text-[9px] border border-red-500 text-red-400 px-1 rounded">드롭</span>}
                                                        {set && set.type === '컴파운드' && <span className="text-[9px] border border-blue-500 text-blue-400 px-1 rounded">컴파</span>}
                                                        <span>{set ? set.weight : ''}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 border border-slate-700/50 text-white">{set ? set.reps : ''}</td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {log.cardios && log.cardios.length > 0 && (
                <Card>
                    <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2"><i className="fa-solid fa-person-running mr-2 text-green-400"></i>유산소 운동 기록</h3>
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-center border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-800 text-slate-300 text-xs">
                                    <th className="p-2 border border-slate-700">종목</th>
                                    <th className="p-2 border border-slate-700">진행 시간</th>
                                    <th className="p-2 border border-slate-700">진행 거리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {log.cardios.map((c, idx) => (
                                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 text-sm">
                                        <td className="p-2 border border-slate-700/50 text-green-400 font-medium">{c.name}</td>
                                        <td className="p-2 border border-slate-700/50 text-white">{c.duration}</td>
                                        <td className="p-2 border border-slate-700/50 text-white">{c.distance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WorkoutDetailView;