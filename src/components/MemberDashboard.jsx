import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Plus } from 'lucide-react';

const WorkoutDetailView = ({ log, onDelete, onEdit }) => (
  <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-300">
      <h4 className="text-lg font-bold text-[#D9C54B] mb-2">상세 뷰 프리뷰 화면</h4>
      <p className="mt-4 text-xs bg-slate-900 p-2 rounded">선택된 날짜: {log?.date}</p>
  </div>
);

export default function MemberDashboard({ logs = [], onAddRecord, onLogClick }) {
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
      if (cond === '최상') return '🤩';
      if (cond === '최하') return '😫';
      return '';
  };

  return (
    <div className="space-y-6">
      {/* 헤더: 기록 목록 버튼을 삭제했습니다 */}
      <div className="flex justify-between items-center mb-6">
        <button className="flex items-center text-sm text-slate-400 hover:text-white transition-colors border border-slate-800 rounded-lg px-4 py-2 bg-[#141414]">
          <ChevronLeft className="w-4 h-4 mr-2" />
          이전 화면으로
        </button>
      </div>

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

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between relative overflow-hidden">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-[#D9C54B]" />
            {year}년 {month}월 운동 부위별 집중도
          </h2>
          <div className="flex items-end space-x-4 md:space-x-8 h-40 mt-8">
            {bodyPartsList.map(part => {
              const count = partCounts[part];
              const heightPercentage = (count / maxPartCount) * 100;
              return (
                <div key={part} className="flex flex-col items-center flex-1 group">
                  <span className="text-xs text-slate-400 mb-2 font-medium">{count > 0 ? `${count}회` : ''}</span>
                  <div className="w-full max-w-[40px] h-32 bg-slate-800 rounded-t-md relative flex items-end justify-center">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 ${count > 0 ? 'bg-gradient-to-t from-[#8a7d30] to-[#D9C54B]' : 'bg-transparent'}`}
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm mt-3 text-slate-300 font-medium">{part}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 md:mt-0 md:ml-12 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-12 w-full md:w-64">
          <div className="mb-6">
            <div className="text-5xl font-black text-[#D9C54B]">{monthlyRecords.length}</div>
            <div className="text-sm text-slate-400 mt-1">총 운동 횟수 (회)</div>
          </div>
          
          <div>
            <div className="flex items-center text-[#c9b53b] font-semibold mb-1">
              <Activity className="w-4 h-4 mr-1" />
              운동 빈도
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-white">{uniqueWorkoutDays}일</span>
              <span className="text-sm text-slate-500 mb-1">/ 전체 {totalDaysInMonth}일</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2">
              <div 
                className="h-full bg-[#D9C54B] rounded-full" 
                style={{ width: `${(uniqueWorkoutDays / totalDaysInMonth) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {onAddRecord && (
          <button onClick={onAddRecord} className="w-full bg-[#D9C54B] hover:bg-yellow-500 text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-yellow-900/20">
            <Plus className="w-5 h-5 mr-2" />
            기록 추가
          </button>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">운동 캘린더</h2>
        
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div key={day} className={`text-center text-sm font-medium py-2 ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((cell, index) => (
            <div 
              key={index} 
              className={`min-h-[100px] bg-black border border-slate-800 rounded-lg p-2 flex flex-col relative transition-all ${cell && cell.records.length > 0 ? 'hover:border-[#D9C54B] hover:bg-slate-800/50 cursor-pointer shadow-sm' : ''}`}
              onClick={() => {
                  if (cell && cell.records.length > 0) {
                      setSelectedRecord(cell.records);
                  }
              }}
            >
              {cell && (
                <>
                  <span className={`text-sm font-semibold ${new Date(cell.dateStr).getDay() === 0 ? 'text-red-400/70' : new Date(cell.dateStr).getDay() === 6 ? 'text-blue-400/70' : 'text-slate-500'}`}>
                    {cell.day}
                  </span>
                  
                  <div className="mt-1 flex-1 flex flex-col items-center justify-center space-y-1">
                    {cell.records.map(record => (
                      <div key={record.id} className="flex flex-col items-center w-full">
                        <span className="text-2xl drop-shadow-md" title={`컨디션: ${record.condition}`}>
                            {getConditionEmoji(record.condition) || '📝'}
                        </span>
                        <div className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1 py-0.5 rounded mt-1 truncate max-w-[90%] text-center">
                            {record.target || '기록'}
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

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0f0f0f] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-black shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center">
                <CalendarIcon className="w-6 h-6 mr-3 text-[#D9C54B]"/>
                {selectedRecord[0]?.date} 상세 기록
              </h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition px-4 py-2 rounded-lg text-sm font-medium flex items-center"
              >
                ✕ 닫기
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-12">
              {selectedRecord.map((record, index) => (
                <div key={record.id} className={index > 0 ? "pt-12 border-t border-slate-800" : ""}>
                   <WorkoutDetailView 
                      log={record} 
                      currentProfile={{role: 'trainer', id: 'tester'}} 
                      onDelete={(id) => {
                          console.log('삭제 클릭됨:', id);
                      }} 
                      onEdit={(log) => {
                          console.log('수정 클릭됨:', log);
                      }} 
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