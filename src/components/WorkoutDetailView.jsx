import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Plus } from 'lucide-react';

// --- [의존성 해결] 임시 헬퍼 함수 및 컴포넌트 내장 ---
const normalizeDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const parseAIFeedback = (feedbackStr) => {
    if (!feedbackStr) return null;
    try {
        return JSON.parse(feedbackStr);
    } catch (e) {
        return null;
    }
};

const Card = ({ children, className = '' }) => (
    <div className={`bg-slate-800/50 border border-slate-700 p-4 rounded-xl shadow-lg ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, color = 'slate' }) => {
    const colorClasses = {
        primary: 'bg-primary-500/20 text-primary-400 border-primary-500/50',
        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        red: 'bg-red-500/20 text-red-400 border-red-500/50',
        slate: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color] || colorClasses.slate}`}>
            {children}
        </span>
    );
};
// ----------------------------------------------------

// --- [1] 통합 테스트용 가상 데이터 (Firebase 연동 시 교체될 부분) ---
const mockRecords = [
    { 
        id: 1, 
        date: '2026-06-02', 
        createdAt: '2026-06-02T10:00:00Z',
        memberName: '김베이스',
        target: '가슴, 삼두', 
        parts: ['가슴', '삼두'], 
        condition: '상', 
        conditionEmoji: '😊', 
        isCardio: false,
        duration: '60분',
        watchData: { calories: 450, minBpm: 90, maxBpm: 160, avgBpm: 120 },
        exercises: [
            { name: '벤치 프레스', sets: [{ weight: '60kg', reps: 10, type: '일반' }, { weight: '65kg', reps: 8, type: '일반' }] },
            { name: '트라이셉스 익스텐션', sets: [{ weight: '20kg', reps: 15, type: '일반' }] }
        ],
        cardios: [],
        feedback: '가슴 근육의 수축과 이완에 집중하며 훌륭하게 수행했습니다.\n휴식과 영양 보충에 신경 써주세요.'
    },
    { 
        id: 2, 
        date: '2026-06-08', 
        createdAt: '2026-06-08T18:30:00Z',
        memberName: '김베이스',
        target: '하체, 유산소', 
        parts: ['하체', '유산소'], 
        condition: '중', 
        conditionEmoji: '😐', 
        isCardio: true,
        duration: '90분',
        watchData: { calories: 600, minBpm: 80, maxBpm: 175, avgBpm: 135 },
        exercises: [
            { name: '스쿼트', sets: [{ weight: '80kg', reps: 10, type: '일반' }, { weight: '100kg', reps: 5, type: '일반' }, { weight: '60kg', reps: 15, type: '드롭' }] }
        ],
        cardios: [{ name: '트레드밀 (인터벌)', duration: '30분', distance: '4.5km' }],
        feedback: JSON.stringify({
            kinesiology: '스쿼트 시 고관절의 움직임이 매우 부드러웠습니다.',
            rest: '하체 운동 후에는 충분한 수면이 필수적입니다.',
            nutrition: '단백질 섭취량을 평소보다 1.5배 늘려주세요.',
            cardio: '인터벌 트레이닝이 심폐지구력 향상에 큰 도움이 되었습니다.'
        })
    },
    { 
        id: 3, 
        date: '2026-06-15', 
        createdAt: '2026-06-15T07:00:00Z',
        memberName: '김베이스',
        target: '등, 이두', 
        parts: ['등', '이두'], 
        condition: '하', 
        conditionEmoji: '😟', 
        isCardio: false,
        duration: '50분',
        watchData: { calories: 380, minBpm: 85, maxBpm: 150, avgBpm: 115 },
        exercises: [
            { name: '풀업', sets: [{ weight: '맨몸', reps: 8, type: '일반' }, { weight: '맨몸', reps: 6, type: '일반' }] },
            { name: '바벨 로우', sets: [{ weight: '50kg', reps: 12, type: '컴파운드' }] }
        ],
        cardios: [],
        feedback: '컨디션 저하로 인해 평소보다 세트 수를 줄여서 진행했습니다. 무리하지 마세요.'
    }
];

const bodyPartsList = ['가슴', '등', '하체', '어깨', '팔', '기타'];

// --- [2] 운동 상세 뷰 컴포넌트 (WorkoutDetailView) ---
const WorkoutDetailView = ({ log, currentProfile, onDelete, onEdit }) => {
    if (!log) return <div className="text-center py-20 text-slate-400">선택된 기록이 없습니다.</div>;
    
    const getConditionColor = (cond) => {
        if (cond === '상') return 'primary';
        if (cond === '중') return 'yellow';
        if (cond === '하') return 'red';
        return 'slate'; 
    };

    const getConditionIcon = (cond) => {
        if (cond === '상') return 'fa-face-smile text-yellow-400'; // 외부 아이콘 폰트 대신 인라인 스타일링 사용 (임시)
        if (cond === '중') return 'fa-face-meh text-orange-400';    
        if (cond === '하') return 'fa-face-frown text-red-500';      
        return 'fa-circle-question text-slate-500'; 
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
        <div className="space-y-6 fade-in text-left">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-white">{log.memberName || '회원'} 님의 운동 기록</h2>
                    <p className="text-slate-400 text-sm mt-1">기록일: {new Date(log.createdAt).toLocaleString()}</p>
                </div>
                {(currentProfile?.role === 'trainer' || currentProfile?.id === log.memberId) && (
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(log)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 bg-blue-500/10 rounded-lg transition">
                            기록 수정
                        </button>
                        <button onClick={() => onDelete(log.id)} className="text-red-400 hover:text-red-300 text-sm px-3 py-1 bg-red-500/10 rounded-lg transition">
                            삭제
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="flex flex-col items-center text-center">
                    <span className="text-2xl mb-2">📅</span>
                    <div className="text-sm text-slate-400">운동 날짜</div>
                    <div className="text-lg font-bold text-white">{normalizeDateString(log.date)}</div>
                </Card>
                
                <Card className="flex flex-col items-center text-center">
                    <span className="text-2xl mb-2">🔥</span>
                    <div className="text-sm text-slate-400">타겟 부위</div>
                    <div className="text-lg font-bold mt-1 text-white">{log.target}</div>
                </Card>

                <Card className="flex flex-col items-center text-center">
                    <span className="text-3xl mb-1">{log.conditionEmoji}</span>
                    <div className="text-sm text-slate-400 mb-1">운동 컨디션</div>
                    <div>
                        <Badge color={getConditionColor(log.condition)}>{log.condition || '미기입'}</Badge>
                    </div>
                </Card>

                <Card className="flex flex-col items-center text-center relative">
                    <span className="text-2xl mb-2">⏱️</span>
                    <div className="text-sm text-slate-400">총 시간 (효율)</div>
                    <div className="text-lg font-bold text-white">{log.duration}</div>
                    <div className="text-xs font-medium text-blue-300 mt-1">총 {totalSets}세트 ({timePerSet}분/세트)</div>
                </Card>

                <Card className="flex flex-col items-center text-center">
                    <span className="text-2xl mb-2">💓</span>
                    <div className="text-sm text-slate-400">워치 데이터</div>
                    <div className="text-sm font-bold text-orange-400 mt-1">{log.watchData?.calories || '-'} kcal</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        심박: {log.watchData?.minBpm || '-'}~{log.watchData?.maxBpm || '-'} <br/> (평균 {log.watchData?.avgBpm || '-'})
                    </div>
                </Card>
            </div>

            <Card className="border-l-4 border-l-yellow-500 bg-slate-900/60">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-xl text-black shadow-[0_0_10px_rgba(217,197,75,0.5)]">🤖</div>
                    <div className="flex-1 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-yellow-400">AI 개인 맞춤 트레이닝 분석</h3>
                            <p className="text-xs text-slate-400">BASECAMP AI 분석 시스템</p>
                        </div>
                        <span className="text-xs bg-slate-800 border border-slate-600 text-slate-300 px-2 py-1 rounded">{typeString}</span>
                    </div>
                </div>
                
                {parsedFeedback ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-yellow-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0">💪 운동학적 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.kinesiology || parsedFeedback.운동학적 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-blue-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0">🛌 휴식 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.rest || parsedFeedback.휴식 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-green-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0">🍎 영양 관점</div>
                            <div className="text-slate-300 text-xs leading-relaxed flex-1">{parsedFeedback.nutrition || parsedFeedback.영양 || '내용 없음'}</div>
                        </div>
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col">
                            <div className="text-orange-400 font-bold text-sm mb-2 pb-1 border-b border-slate-700 flex-shrink-0">🏃 권장 유산소</div>
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
                <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 text-white">🏋️ 웨이트 루틴 기록</h3>
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
                                    <td className="p-2 border border-slate-700/50 font-medium text-left bg-slate-900/30 text-slate-200">{ex.name}</td>
                                    {Array.from({ length: maxSets }).map((_, sIdx) => {
                                        const set = ex.sets[sIdx];
                                        return (
                                            <React.Fragment key={sIdx}>
                                                <td className="p-2 border border-slate-700/50 text-yellow-400">
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
                    <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 text-white">🏃 유산소 운동 기록</h3>
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


// --- [3] 메인 회원 캘린더 대시보드 컴포넌트 ---
export default function MemberDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // 2026년 6월
  const [selectedRecord, setSelectedRecord] = useState(null); // 모달 제어용 상태

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));

  // 현재 월 데이터 필터링
  const monthlyRecords = useMemo(() => {
    return mockRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month;
    });
  }, [year, month]);

  // 통계 계산
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const uniqueWorkoutDays = new Set(monthlyRecords.map(r => r.date)).size;

  const partCounts = useMemo(() => {
    const counts = { 가슴: 0, 등: 0, 하체: 0, 어깨: 0, 팔: 0, 기타: 0 };
    monthlyRecords.forEach(record => {
      record.parts.forEach(part => {
        if (['이두', '삼두', '전완'].includes(part)) counts['팔'] += 1;
        else if (counts[part] !== undefined) counts[part] += 1;
        else counts['기타'] += 1;
      });
    });
    return counts;
  }, [monthlyRecords]);

  const maxPartCount = Math.max(...Object.values(partCounts), 1);

  // 캘린더 일자 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayRecords = monthlyRecords.filter(r => r.date === dateStr);
      days.push({ day: i, dateStr, records: dayRecords });
    }
    return days;
  }, [year, month, monthlyRecords, totalDaysInMonth]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <button className="flex items-center text-sm text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg px-4 py-2 bg-[#141414]">
          <ChevronLeft className="w-4 h-4 mr-2" />
          이전 화면으로
        </button>

        {/* 상단 컨트롤러 */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 flex justify-between items-center">
          <div className="flex items-center text-yellow-500 font-semibold">
            <CalendarIcon className="w-5 h-5 mr-2" />
            조회 기간 선택
          </div>
          <div className="flex items-center space-x-4 bg-black border border-gray-800 rounded-lg px-4 py-2">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-bold text-white min-w-[100px] text-center">
              {year}년 {String(month).padStart(2, '0')}월
            </span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 통계 영역 */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row justify-between relative overflow-hidden">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-yellow-500" />
              {year}년 {month}월 운동 부위별 집중도
            </h2>
            <div className="flex items-end space-x-4 md:space-x-8 h-40 mt-8">
              {bodyPartsList.map(part => {
                const count = partCounts[part];
                const heightPercentage = (count / maxPartCount) * 100;
                return (
                  <div key={part} className="flex flex-col items-center flex-1 group">
                    <span className="text-xs text-gray-400 mb-2 font-medium">{count > 0 ? `${count}회` : ''}</span>
                    <div className="w-full max-w-[40px] h-32 bg-gray-900 rounded-t-md relative flex items-end justify-center">
                      <div 
                        className={`w-full rounded-t-md transition-all duration-500 ${count > 0 ? 'bg-gradient-to-t from-yellow-700 to-yellow-500' : 'bg-transparent'}`}
                        style={{ height: `${heightPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm mt-3 text-gray-300 font-medium">{part}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 md:mt-0 md:ml-12 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-800 pt-6 md:pt-0 md:pl-12 w-full md:w-64">
            <div className="absolute top-6 right-6 bg-black border border-gray-800 px-3 py-1.5 rounded-full flex items-center text-sm">
              <span className="text-gray-400 mr-2">월 평균 컨디션:</span>
              <span>😊 상</span>
            </div>
            
            <div className="mb-6">
              <div className="text-5xl font-black text-yellow-500">{monthlyRecords.length}</div>
              <div className="text-sm text-gray-400 mt-1">총 운동 횟수 (회)</div>
            </div>
            
            <div>
              <div className="flex items-center text-yellow-600 font-semibold mb-1">
                <Activity className="w-4 h-4 mr-1" />
                운동 빈도
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-white">{uniqueWorkoutDays}일</span>
                <span className="text-sm text-gray-500 mb-1">/ 전체 {totalDaysInMonth}일</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full mt-2">
                <div 
                  className="h-full bg-yellow-600 rounded-full" 
                  style={{ width: `${(uniqueWorkoutDays / totalDaysInMonth) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-yellow-900/20">
          <Plus className="w-5 h-5 mr-2" />
          기록 추가
        </button>

        {/* 캘린더 영역 */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">운동 캘린더</h2>
          
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={day} className={`text-center text-sm font-medium py-2 ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, index) => (
              <div 
                key={index} 
                className={`min-h-[100px] bg-black border border-gray-800 rounded-lg p-2 flex flex-col relative transition-all ${cell && cell.records.length > 0 ? 'hover:border-yellow-600 hover:bg-gray-900/50 cursor-pointer shadow-sm' : ''}`}
                onClick={() => cell && cell.records.length > 0 && setSelectedRecord(cell.records)}
              >
                {cell && (
                  <>
                    <span className={`text-sm font-semibold ${new Date(cell.dateStr).getDay() === 0 ? 'text-red-400/70' : new Date(cell.dateStr).getDay() === 6 ? 'text-blue-400/70' : 'text-gray-500'}`}>
                      {cell.day}
                    </span>
                    
                    <div className="mt-1 flex-1 flex flex-col items-center justify-center space-y-1">
                      {cell.records.map(record => (
                        <div key={record.id} className="flex flex-col items-center">
                          <span className="text-2xl drop-shadow-md" title={`컨디션: ${record.condition}`}>{record.conditionEmoji}</span>
                          <div className="flex flex-wrap justify-center gap-1 mt-1">
                            {record.parts.map((part, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                                {part}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 캘린더 셀 클릭 시 렌더링되는 모달 창 (내부에 WorkoutDetailView 포함) */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* 모달 상단 헤더 */}
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-black shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center">
                <CalendarIcon className="w-6 h-6 mr-3 text-yellow-500"/>
                {selectedRecord[0].date} 상세 기록
              </h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 transition px-4 py-2 rounded-lg text-sm font-medium flex items-center"
              >
                ✕ 닫기
              </button>
            </div>
            
            {/* 모달 스크롤 영역 (WorkoutDetailView 렌더링) */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-12">
              {selectedRecord.map((record, index) => (
                <div key={record.id} className={index > 0 ? "pt-12 border-t border-gray-800" : ""}>
                   <WorkoutDetailView 
                      log={record} 
                      currentProfile={{role: 'trainer', id: 'tester'}} 
                      onDelete={(id) => console.log('삭제 클릭됨:', id)} 
                      onEdit={(log) => console.log('수정 클릭됨:', log)} 
                   />
                </div>
              ))}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}