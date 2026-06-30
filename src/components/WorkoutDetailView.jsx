import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Plus } from 'lucide-react';

/* --- 1. 임시 내부 컴포넌트 및 헬퍼 정의 (로컬 환경에서는 원래 파일들을 사용하세요) --- */
const Card = ({ children, className = '' }) => (
    <div className={`bg-slate-900/50 border border-slate-800 p-4 rounded-xl shadow-lg ${className}`}>
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
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color] || colorClasses.slate}`}>{children}</span>;
};

const normalizeDateString = (dateStr) => dateStr || '';
const parseAIFeedback = (feedback) => { try { return JSON.parse(feedback); } catch { return null; } };

/* --- 2. WorkoutDetailView 통합 --- */
const WorkoutDetailView = ({ log }) => {
    const getConditionColor = (cond) => {
        if (cond === '상') return 'primary';
        if (cond === '중') return 'yellow';
        return 'red';
    };
    
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">운동 기록 상세</h2>
            <Card>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-sm text-slate-400">날짜</div>
                        <div className="text-lg font-bold">{normalizeDateString(log.date)}</div>
                    </div>
                    <Badge color={getConditionColor(log.condition)}>{log.condition}</Badge>
                </div>
                <div className="mt-4 text-slate-300">타겟 부위: {log.target}</div>
            </Card>
        </div>
    );
};

/* --- 3. 메인 MemberDashboard --- */
export default function MemberDashboard({ logs = [], onAddRecord }) {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedRecord, setSelectedRecord] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));

  const monthlyRecords = useMemo(() => {
    return logs.filter(record => {
      if (!record.date) return false;
      const [rYear, rMonth] = record.date.split('-');
      return parseInt(rYear, 10) === year && parseInt(rMonth, 10) === month;
    });
  }, [logs, year, month]);

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const uniqueWorkoutDays = new Set(monthlyRecords.map(r => r.date)).size;

  const bodyPartsList = ['가슴', '등', '하체', '어깨', '팔', '기타'];
  
  const partCounts = useMemo(() => {
    const counts = { 가슴: 0, 등: 0, 하체: 0, 어깨: 0, 팔: 0, 기타: 0 };
    monthlyRecords.forEach(record => {
        const partsToProcess = Array.isArray(record.parts) ? record.parts : 
                              (record.target ? record.target.split(',').map(s => s.trim()) : []);
                              
        partsToProcess.forEach(part => {
            if (['이두', '삼두', '전완'].includes(part)) counts['팔'] += 1;
            else if (counts[part] !== undefined) counts[part] += 1;
            else counts['기타'] += 1;
        });
    });
    return counts;
  }, [monthlyRecords]);

  const maxPartCount = Math.max(...Object.values(partCounts), 1);

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

  const getConditionEmoji = (cond) => {
      if (cond === '상') return '😊';
      if (cond === '중') return '😐';
      if (cond === '하') return '😟';
      return '📝';
  };

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤러 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
        <div className="flex items-center text-[#D9C54B] font-bold">
          <CalendarIcon className="w-5 h-5 mr-2" />
          조회 기간 선택
        </div>
        <div className="flex items-center space-x-4 bg-black border border-slate-700 rounded-lg px-4 py-2">
          <button onClick={prevMonth} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-bold text-white min-w-[100px] text-center">
            {year}년 {String(month).padStart(2, '0')}월
          </span>
          <button onClick={nextMonth} className="text-slate-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 통계 및 캘린더 ... (생략된 디자인은 이전 코드와 동일) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((cell, index) => (
            <div key={index} className="min-h-[80px] bg-black border border-slate-800 rounded-lg p-1 cursor-pointer" onClick={() => cell?.records.length > 0 && setSelectedRecord(cell.records)}>
              {cell && (
                <>
                  <div className="text-xs text-slate-500">{cell.day}</div>
                  <div className="flex flex-col items-center">
                    {cell.records.map(r => <span key={r.id} className="text-lg">{getConditionEmoji(r.condition)}</span>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f0f0f] border border-slate-800 rounded-xl w-full max-w-3xl p-6">
            <button onClick={() => setSelectedRecord(null)} className="mb-4 text-slate-400">닫기</button>
            {selectedRecord.map(r => <WorkoutDetailView key={r.id} log={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}