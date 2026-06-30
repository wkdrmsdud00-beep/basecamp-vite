import { useState, useMemo } from 'react';
import { normalizeDateString } from '../utils/helpers';
import Card from './Card';

const TrainerDashboard = ({ logs, onSelectMember, goBulkUpload }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // ==========================================
    // 📊 회원 기본 통계 및 실시간 3대 핵심 케어 지표 연산
    // ==========================================
    const dashboardData = useMemo(() => {
        const stats = {};
        const todayStr = normalizeDateString(new Date().toISOString().split('T')[0]); // 2026-06-28 기준

        // 1. 기본 회원별 운동 이력 집계
        logs.forEach(log => {
            const mId = log.memberId || 'unknown';
            const cleanDate = normalizeDateString(log.date);
            if (!stats[mId]) {
                stats[mId] = { 
                    id: mId, 
                    name: log.memberName || '회원', 
                    totalWorkouts: 0, 
                    lastWorkout: cleanDate, 
                    recentTarget: log.target,
                    allLogs: [] // 컨디션 변화 추적용
                };
            }
            stats[mId].totalWorkouts += 1;
            stats[mId].allLogs.push(log);

            if (cleanDate > stats[mId].lastWorkout) {
                stats[mId].lastWorkout = cleanDate;
                stats[mId].recentTarget = log.target;
            }
        });

        const memberStatsArray = Object.values(stats);

        // 2. 실시간 3대 지표 추출 개시
        const todayAttendance = [];
        const conditionAlerts = [];
        const longAbsences = [];

        const conditionScores = { '최상': 5, '상': 4, '중': 3, '하': 2, '최하': 1 };
        const msInDay = 24 * 60 * 60 * 1000;
        const todayTime = new Date(todayStr).getTime();

        memberStatsArray.forEach(member => {
            // 날짜 정렬 (과거 -> 최신)
            const sortedLogs = [...member.allLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
            const todayLog = sortedLogs.find(l => normalizeDateString(l.date) === todayStr);
            
            // 💡 [지표 1] 오늘 출석 회원
            if (todayLog) {
                todayAttendance.push({ id: member.id, name: member.name });
            }

            // 💡 [지표 2] 컨디션 저조 및 급락 회원 탐지
            if (todayLog && todayLog.condition) {
                const currentScore = conditionScores[todayLog.condition] || 0;
                
                // 기본 '하', '최하' 케이스
                if (todayLog.condition === '하' || todayLog.condition === '최하') {
                    conditionAlerts.push({ id: member.id, name: member.name, reason: `컨디션 '${todayLog.condition}'` });
                } else {
                    // 이전 기록 분석 (과거 기록들의 평균 컨디션 구하기)
                    const pastLogs = sortedLogs.filter(l => normalizeDateString(l.date) !== todayStr && l.condition);
                    if (pastLogs.length > 0) {
                        const totalPastScore = pastLogs.reduce((sum, l) => sum + (conditionScores[l.condition] || 0), 0);
                        const avgPastScore = totalPastScore / pastLogs.length;
                        
                        // 평소 평균보다 오늘 점수가 2단계 이상 급감한 경우 탐지
                        if (avgPastScore - currentScore >= 1.8) {
                            conditionAlerts.push({ id: member.id, name: member.name, reason: '컨디션 급락!' });
                        }
                    }
                }
            }

            // 💡 [지표 3] 5일 이상 미방문 회원 (최근 운동일 기준 차이 계산)
            const lastWorkoutTime = new Date(member.lastWorkout).getTime();
            const dayDiff = Math.floor((todayTime - lastWorkoutTime) / msInDay);
            if (dayDiff >= 5) {
                longAbsences.push({ id: member.id, name: member.name, days: dayDiff });
            }
        });

        return {
            memberStats: memberStatsArray,
            todayAttendance,
            conditionAlerts,
            longAbsences
        };
    }, [logs]);

    const { memberStats, todayAttendance, conditionAlerts, longAbsences } = dashboardData;

    // 검색 필터링
    const filteredMemberStats = useMemo(() => {
        if (!searchTerm.trim()) return memberStats;
        return memberStats.filter(stat => stat.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [memberStats, searchTerm]);

    return (
        <div className="space-y-6 fade-in">
            {/* 상단 타이틀 배너 */}
            <div className="bg-gradient-to-r from-[#2a2408] to-black rounded-2xl p-6 sm:p-8 border border-primary-500/30 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">마스터 트레이너 센터</h2>
                        <p className="text-primary-400 text-sm">BASECAMP 실시간 데이터 허브</p>
                    </div>
                    
                    <button onClick={goBulkUpload} className="w-full md:w-auto bg-primary-600 hover:bg-primary-500 text-black font-bold px-6 py-4 rounded-xl shadow-[0_0_15px_rgba(217,197,75,0.4)] transition flex items-center justify-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
                        회원 일지 업로드
                    </button>
                </div>
            </div>

            {/* ==========================================
                🚨 [고도화] 오늘 회원 통계 섹션 (원페이퍼 독립 그룹 컴포넌트)
               ========================================== */}
            <div className="space-y-3">
                <h3 className="text-xl font-bold flex items-center px-1">
                    <i className="fa-solid fa-chart-pie mr-2 text-primary-500"></i>
                    오늘 회원 통계
                </h3>
                
                {/* 하나의 어두운 카드 영역으로 통계 지표를 확실하게 격리 그룹화 */}
                <div className="bg-[#0c0c0e] border border-slate-900 rounded-[28px] p-6 shadow-inner space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. 오늘 출석 회원 카드 */}
                        <Card className="border-emerald-950 bg-emerald-950/10 p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-emerald-400">오늘 출석 회원</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <i className="fa-solid fa-calendar-check"></i>
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-white mt-2 mb-4">
                                    {todayAttendance.length}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-2.5 min-h-[44px] flex flex-wrap items-center gap-1.5 border border-emerald-900/20">
                                {todayAttendance.length === 0 ? (
                                    <span className="text-xs text-slate-500">오늘 출석한 회원이 없습니다.</span>
                                ) : (
                                    todayAttendance.map((m, i) => (
                                        <span key={i} onClick={() => onSelectMember(m.id)} className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-500/30 transition">
                                            {m.name}
                                        </span>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* 2. 컨디션 저조 회원 카드 */}
                        <Card className="border-red-950 bg-red-950/10 p-5 flex flex-col justify-between hover:border-red-500/20 transition-all">
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-red-400">컨디션 케어 대상자</span>
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                                        <i className="fa-solid fa-heart-crack"></i>
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-white mt-2 mb-4">
                                    {conditionAlerts.length}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-2.5 min-h-[44px] flex flex-wrap items-center gap-1.5 border border-red-900/20">
                                {conditionAlerts.length === 0 ? (
                                    <span className="text-xs text-slate-500">오늘 주의가 필요한 회원이 없습니다.</span>
                                ) : (
                                    conditionAlerts.map((m, i) => (
                                        <span key={i} onClick={() => onSelectMember(m.id)} className="text-xs font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500/30 transition" title={m.reason}>
                                            {m.name}⚠️
                                        </span>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* 3. 5일 이상 미방문 회원 카드 */}
                        <Card className="border-amber-950 bg-amber-950/10 p-5 flex flex-col justify-between hover:border-amber-500/20 transition-all">
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-amber-400">5일 이상 미방문</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                                        <i className="fa-solid fa-user-clock"></i>
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-white mt-2 mb-4">
                                    {longAbsences.length}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-2.5 min-h-[44px] flex flex-wrap items-center gap-1.5 border border-amber-900/20">
                                {longAbsences.length === 0 ? (
                                    <span className="text-xs text-slate-500">5일 이상 결석한 회원이 없습니다.</span>
                                ) : (
                                    longAbsences.map((m, i) => (
                                        <span key={i} onClick={() => onSelectMember(m.id)} className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-500/30 transition">
                                            {m.name}({m.days}일)
                                        </span>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* 리스트 헤더 및 검색창 */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 mb-4">
                <h3 className="text-xl font-bold flex items-center"><i className="fa-solid fa-users mr-2 text-primary-500"></i>최근 활동 회원</h3>
                <div className="relative w-full sm:w-64">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"></i>
                    <input 
                        type="text" 
                        placeholder="회원 이름 검색..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-primary-500 outline-none"
                    />
                </div>
            </div>

            {/* 회원 상세 리스트 뷰 */}
            {filteredMemberStats.length === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700">기록을 남긴 회원이 없습니다.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMemberStats.map((stat, idx) => (
                        <Card key={idx} onClick={() => onSelectMember(stat.id)} className="group border-slate-700 hover:border-primary-500/50 cursor-pointer transition-all duration-300 transform hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center text-xl font-bold text-white shadow-lg">{stat.name.substring(0, 1)}</div>
                                <div>
                                    <h4 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">{stat.name}</h4>
                                    <div className="text-xs text-primary-400/80">총 {stat.totalWorkouts}회 출석</div>
                                </div>
                            </div>
                            <div className="bg-slate-900/90 rounded-xl p-4 text-sm border border-slate-800 space-y-2">
                                <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">최근 운동일</span><span className="text-zinc-300 font-mono text-xs">{stat.lastWorkout}</span></div>
                                <hr className="border-slate-800/60" />
                                <div className="flex justify-between items-end pt-1">
                                    <span className="text-slate-500 text-xs pb-1">최근 타겟</span>
                                    <span className="text-[20px] font-black text-white group-hover:text-primary-400 transition-colors tracking-tight leading-none">
                                        {stat.recentTarget || '미지정'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrainerDashboard;