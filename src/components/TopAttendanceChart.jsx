import { useState, useEffect, useMemo } from 'react';
import { normalizeDateString } from '../utils/helpers';
import Card from './Card';

        const TopAttendanceChart = ({ logs }) => {
            const getLocalMonth = () => {
                const now = new Date();
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            };
            
            const latestMonthInLogs = useMemo(() => {
                if (!logs || logs.length === 0) return getLocalMonth();
                let maxDate = '';
                logs.forEach(log => {
                    const cleanDate = normalizeDateString(log.date);
                    if (cleanDate > maxDate) maxDate = cleanDate;
                });
                return maxDate ? maxDate.substring(0, 7) : getLocalMonth();
            }, [logs]);

            const [selectedMonth, setSelectedMonth] = useState(getLocalMonth());

            useEffect(() => {
                if (latestMonthInLogs) {
                    setSelectedMonth(latestMonthInLogs);
                }
            }, [latestMonthInLogs]);

            const rankingData = useMemo(() => {
                const stats = {};
                logs.forEach(log => {
                    const cleanDate = normalizeDateString(log.date);
                    const logMonth = cleanDate.substring(0, 7); 
                    
                    if (logMonth === selectedMonth) {
                        const mId = log.memberId || 'unknown';
                        if (!stats[mId]) {
                            stats[mId] = { name: log.memberName || '알 수 없는 회원', count: 0 };
                        }
                        stats[mId].count += 1;
                    }
                });
                return Object.values(stats)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            }, [logs, selectedMonth]);

            const maxCount = rankingData.length > 0 ? Math.max(...rankingData.map(d => d.count), 5) : 5;

            return (
                <Card className="mb-10 border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                        <h3 className="text-2xl font-bold flex items-center text-white">
                            <i className="fa-solid fa-crown mr-3 text-[#D9C54B] drop-shadow-[0_0_10px_rgba(217,197,75,0.8)]"></i>
                            명예의 전당 (TOP 5)
                        </h3>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-primary-500 outline-none"
                        />
                    </div>

                    {rankingData.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            선택한 월({selectedMonth})에 등록된 운동 기록이 없습니다.<br/>
                            <span className="text-xs text-slate-600">달력을 눌러 기록이 있는 달로 변경해보세요.</span>
                        </div>
                    ) : (
                        <div className="flex justify-center items-end gap-4 sm:gap-10 pb-8 pt-4 px-2">
                            {rankingData.map((data, idx) => {
                                const percentage = (data.count / maxCount) * 100;
                                return (
                                    <div key={idx} className="flex flex-col items-center justify-end w-16 sm:w-20 flex-shrink-0 relative">
                                        <div className="text-base font-bold text-primary-400 mb-2">{data.count}회</div>
                                        <div className="w-12 sm:w-16 h-[180px] bg-black border border-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden shadow-inner">
                                            <div 
                                                className="w-full bg-gradient-to-t from-primary-900 to-primary-500 transition-all duration-1000 ease-out"
                                                style={{ height: `${percentage}%`, minHeight: '5%' }}
                                            ></div>
                                        </div>
                                        
                                        <div className="mt-4 mb-2 truncate text-sm font-bold text-white w-full text-center">{data.name}</div>
                                        
                                        <div className="flex items-center justify-center w-full h-10">
                                            {idx === 0 && <i className="fa-solid fa-medal text-4xl text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]"></i>}
                                            {idx === 1 && <i className="fa-solid fa-medal text-3xl text-[#C0C0C0] drop-shadow-[0_0_12px_rgba(192,192,192,0.8)]"></i>}
                                            {idx === 2 && <i className="fa-solid fa-medal text-2xl text-[#CD7F32] drop-shadow-[0_0_10px_rgba(205,127,50,0.8)]"></i>}
                                            {idx > 2 && <span className="text-xs text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{idx + 1}위</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            );
        };


export default TopAttendanceChart;
