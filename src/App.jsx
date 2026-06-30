import { useState, useEffect, useMemo, useRef } from 'react';
import {
  auth,
  db,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from './firebase';
import { normalizeDateString, parseAIFeedback } from './utils/helpers';
import Card from './components/Card';
import Badge from './components/Badge';
import BackButton from './components/BackButton';
import FeedbackPresentation from './components/FeedbackPresentation';
import MonthlyStatsChart from './components/MonthlyStatsChart';
import ReportModal from './components/ReportModal';
import TopAttendanceChart from './components/TopAttendanceChart';
import WorkoutDetailView from './components/WorkoutDetailView';
import TrainerDashboard from './components/TrainerDashboard';
import MemberManagement from './components/MemberManagement';
import MultiLogForm from './components/MultiLogForm';

// 🌟 컨디션 단계별 색상 매핑 함수
const getConditionColor = (cond) => {
    if (cond === '최상') return 'primary';
    if (cond === '상') return 'blue';
    if (cond === '중') return 'green';
    if (cond === '하') return 'yellow';
    if (cond === '최하') return 'red';
    return 'slate';
};

// 🌟 컨디션 단계별 이모지 매핑 함수
const getConditionEmoji = (cond) => {
    if (cond === '최상') return '😍';
    if (cond === '상') return '😊';
    if (cond === '중') return '😐';
    if (cond === '하') return '🙁';
    if (cond === '최하') return '😫';
    return '';
};

const App = () => {
    const appId = import.meta.env.VITE_APP_ID || 'basecamp_production';

    const [logs, setLogs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('basecamp_logs_local') || '[]'); } catch { return []; }
    });
    const [profiles, setProfiles] = useState(() => {
        try {
            const localMembers = JSON.parse(localStorage.getItem('basecamp_members_local') || '[]');
            return [{ id: 'trainer_master', name: '마스터 트레이너', role: 'trainer' }, ...localMembers];
        } catch { return [{ id: 'trainer_master', name: '마스터 트레이너', role: 'trainer' }]; }
    });
    
    const [currentProfile, setCurrentProfile] = useState(null); 
    const [activeTab, setActiveTab] = useState('home');
    const [selectedLogId, setSelectedLogId] = useState(null);
    const [filteredMemberId, setFilteredMemberId] = useState(null); 
    const [editingLog, setEditingLog] = useState(null);
    const [presentationLog, setPresentationLog] = useState(null);
    const [isBulkMaster, setIsBulkMaster] = useState(false);

    const [pwdInput, setPwdInput] = useState('');
    const [pwdError, setPwdError] = useState('');

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportMonth, setReportMonth] = useState('');
    const [historyFilterMonth, setHistoryFilterMonth] = useState('');
    const [user, setUser] = useState(null);

    const getLocalMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error('Auth initialization error:', error);
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
        const unsubProfiles = onSnapshot(profilesRef, (snapshot) => {
            const fetchedProfiles = snapshot.docs.map(document => document.data());
            const hasMaster = fetchedProfiles.some(p => p.role === 'trainer');
            const finalProfiles = hasMaster ? fetchedProfiles : [{ id: 'trainer_master', name: '마스터 트레이너', role: 'trainer' }, ...fetchedProfiles];
            
            setProfiles(finalProfiles);
            localStorage.setItem('basecamp_members_local', JSON.stringify(finalProfiles.filter(p => p.role === 'member')));
        }, (error) => console.error("Profiles sync error", error));

        const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
        const unsubLogs = onSnapshot(logsRef, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(document => document.data()).sort((a,b) => {
                const dateA = a.date || ''; const dateB = b.date || '';
                if (dateA > dateB) return -1;
                if (dateA < dateB) return 1;
                return b.createdAt - a.createdAt;
            });
            setLogs(fetchedLogs);
            localStorage.setItem('basecamp_logs_local', JSON.stringify(fetchedLogs));
        }, (error) => console.error("Logs sync error", error));

        return () => { unsubProfiles(); unsubLogs(); };
    }, [user, db, appId]);

    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setCurrentProfile(null); setFilteredMemberId(null); setSelectedLogId(null); setEditingLog(null); setPresentationLog(null); setShowReportModal(false); setActiveTab('home'); setPwdInput(''); setIsBulkMaster(false);
            }, 5 * 60 * 1000); 
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => document.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            events.forEach(e => document.removeEventListener(e, resetTimer));
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => { 
        const current = getLocalMonth();
        setReportMonth(current); 
        setHistoryFilterMonth(current); 
    }, []);

    // 🌟 뒤로가기 핸들러 고도화 (각 스텝별 네비게이션 예외 처리 완벽 반영)
    const handleBack = () => {
        if (activeTab === 'memberSelect') setActiveTab('home');
        else if (activeTab === 'masterLogin') { setPwdInput(''); setActiveTab('home'); }
        else if (activeTab === 'master') { setCurrentProfile(null); setActiveTab('home'); setFilteredMemberId(null); }
        else if (activeTab === 'members') { setActiveTab('master'); setFilteredMemberId(null); }
        else if (activeTab === 'history') {
            if (filteredMemberId) { setFilteredMemberId(null); setActiveTab('master'); } 
            else if (currentProfile?.role === 'member') { setCurrentProfile(null); setActiveTab('memberSelect'); }
        }
        else if (activeTab === 'detail') {
            setSelectedLogId(null); // 캐싱 방지 클리어
            setActiveTab('history');
        }
        else if (activeTab === 'new' || activeTab === 'bulkUpload') { 
            setIsBulkMaster(false); 
            setActiveTab(currentProfile?.role === 'trainer' ? (filteredMemberId ? 'history' : 'master') : 'history'); 
        }
        else if (activeTab === 'edit') { setEditingLog(null); setActiveTab('detail'); }
    };

    const handleAddMember = async (newMember) => {
        const newId = 'member_' + Date.now();
        newMember.id = newId;
        const updatedProfiles = [...profiles, newMember];
        setProfiles(updatedProfiles);
        localStorage.setItem('basecamp_members_local', JSON.stringify(updatedProfiles.filter(p => p.role === 'member')));
        if (user) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', newId), newMember).catch(console.error);
    };

    const handleUpdateMember = async (updatedMember) => {
        const updatedProfiles = profiles.map(p => p.id === updatedMember.id ? updatedMember : p);
        setProfiles(updatedProfiles);
        localStorage.setItem('basecamp_members_local', JSON.stringify(updatedProfiles.filter(p => p.role === 'member')));
        if (user) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', updatedMember.id), updatedMember).catch(console.error);
    };

    const handleDeleteMember = async (memberId) => {
        const updatedProfiles = profiles.filter(p => p.id !== memberId);
        setProfiles(updatedProfiles);
        localStorage.setItem('basecamp_members_local', JSON.stringify(updatedProfiles.filter(p => p.role === 'member')));
        if (user) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', memberId)).catch(console.error);
    };

    const handleSaveLogBatch = async (newLogsArray, isEdit) => {
        let updatedLogs = [...logs];
        newLogsArray.forEach(newLog => {
            if (isEdit) {
                updatedLogs = updatedLogs.map(l => l.id === newLog.id ? newLog : l);
            } else {
                updatedLogs.unshift(newLog);
            }
        });
        
        updatedLogs.sort((a,b) => {
            const dateA = a.date || ''; const dateB = b.date || '';
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return b.createdAt - a.createdAt;
        });

        setLogs(updatedLogs);
        localStorage.setItem('basecamp_logs_local', JSON.stringify(updatedLogs));
        setEditingLog(null);
        
        if (user) {
            newLogsArray.forEach(newLog => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', newLog.id), newLog).catch(console.error));
        } else {
            alert("네트워크 지연으로 인해 임시 저장소에만 저장되었습니다.");
        }

        if (!isBulkMaster && newLogsArray.length === 1 && !isEdit) {
            setPresentationLog(newLogsArray[0]);
            setActiveTab('history');
        } else {
            if (isBulkMaster) { setIsBulkMaster(false); setActiveTab('master'); } 
            else { setActiveTab('history'); }
        }
    };

    const handleDeleteLog = async (logId) => {
        if(!window.confirm('기록을 완전히 삭제하시겠습니까?')) return;
        const updatedLogs = logs.filter(l => l.id !== logId);
        setLogs(updatedLogs);
        localStorage.setItem('basecamp_logs_local', JSON.stringify(updatedLogs));
        setSelectedLogId(null); // 클리어
        setActiveTab('history');
        if (user) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', logId)).catch(console.error);
    };

    const displayLogs = useMemo(() => {
        if (!currentProfile) return [];
        
        let filtered = logs;
        if (currentProfile.role === 'member') {
            filtered = logs.filter(log => log.memberId === currentProfile.id);
        } else if (currentProfile.role === 'trainer' && filteredMemberId) {
            filtered = logs.filter(log => log.memberId === filteredMemberId);
        }

        if (historyFilterMonth) {
            filtered = filtered.filter(log => normalizeDateString(log.date).startsWith(historyFilterMonth));
        }
        
        return filtered;
    }, [logs, currentProfile, filteredMemberId, historyFilterMonth]);

    // 🌟 안전하게 선택된 로그 정보 매칭
    const activeLog = useMemo(() => {
        return logs.find(l => l.id === selectedLogId) || displayLogs[0];
    }, [logs, selectedLogId, displayLogs]);

    const filteredMemberProfile = profiles.find(p => p.id === filteredMemberId);

    return (
        <div className="min-h-screen bg-black flex flex-col pb-16 md:pb-0 relative">
            {presentationLog && (
                <FeedbackPresentation log={presentationLog} onClose={() => setPresentationLog(null)} />
            )}

            {showReportModal && (
                <ReportModal 
                    logs={displayLogs} memberProfile={filteredMemberProfile} reportMonth={reportMonth} onClose={() => setShowReportModal(false)} allLogs={logs}
                />
            )}

            <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800 no-print flex-none">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentProfile(null); setFilteredMemberId(null); setSelectedLogId(null); setActiveTab('home'); }}>
                        <img src="logo2.jpg" alt="BC Logo" className="w-10 h-10 object-contain mix-blend-screen" onError={(e) => e.target.style.display='none'} />
                        <span className="text-xl font-bold tracking-tight text-white hidden sm:block">BASECAMP <span className="text-[#D9C54B] font-normal">DATA CENTER</span></span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {currentProfile && (
                            <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-2 border border-slate-800">
                                <div className="text-sm font-bold text-primary-400 flex items-center"><i className="fa-solid fa-user-circle mr-2 text-lg"></i>{currentProfile.name}</div>
                                <button onClick={() => { setCurrentProfile(null); setActiveTab('home'); setPwdInput(''); setFilteredMemberId(null); setSelectedLogId(null); }} className="text-xs bg-black border border-slate-700 hover:border-primary-500 text-white px-3 py-1.5 rounded-lg transition">로그아웃</button>
                            </div>
                        )}

                        <div className="hidden md:flex gap-2">
                            <button onClick={() => { setCurrentProfile(null); setActiveTab('home'); setPwdInput(''); setFilteredMemberId(null); setSelectedLogId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'home' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>홈</button>
                            {currentProfile?.role === 'member' && <button onClick={() => { setSelectedLogId(null); setActiveTab('history'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>기록 목록</button>}
                            {currentProfile?.role === 'trainer' && (
                                <>
                                    <button onClick={() => { setActiveTab('members'); setFilteredMemberId(null); setSelectedLogId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'members' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>회원 관리</button>
                                    <button onClick={() => { setActiveTab('master'); setFilteredMemberId(null); setSelectedLogId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'master' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>마스터 센터</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col no-print">
                {activeTab !== 'home' && <BackButton onClick={handleBack} />}

                {activeTab === 'home' && (
                    <div className="fade-in flex-1 flex flex-col items-center justify-center text-center w-full min-h-[60vh] py-10">
                        <img src="logo.jpg" alt="BASECAMP LOGO" className="w-full max-w-[450px] object-contain mix-blend-screen mb-12" onError={(e) => { e.target.outerHTML = `<div class="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-primary-600 to-yellow-300 flex items-center justify-center font-black text-black text-4xl mb-6 shadow-[0_0_30px_rgba(217,197,75,0.5)]">BC</div><h1 class="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-400 mb-2 tracking-tighter">BASECAMP</h1>`; }} />
                        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto">
                            <button onClick={() => setActiveTab('memberSelect')} className="flex-1 px-8 py-5 bg-primary-600 hover:bg-primary-500 text-black font-bold rounded-2xl transition shadow-[0_0_20px_rgba(217,197,75,0.3)] text-lg"><i className="fa-solid fa-bolt mr-2"></i>운동 기록</button>
                            <button onClick={() => setActiveTab('masterLogin')} className="flex-1 px-8 py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition border border-slate-700 hover:border-primary-500 text-lg"><i className="fa-solid fa-crown mr-2"></i>마스터 센터</button>
                        </div>
                    </div>
                )}

                {activeTab === 'memberSelect' && (
                    <div className="fade-in max-w-4xl mx-auto w-full">
                        <TopAttendanceChart logs={logs} />
                        <div className="text-center mb-6 mt-12"><h2 className="text-3xl font-bold text-white mb-2">회원명단</h2><p className="text-slate-400 text-sm">본인의 이름을 선택하여 접속하세요.</p></div>
                        <div className="bg-slate-900/30 rounded-2xl border border-slate-800 p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {profiles.filter(p => p.role === 'member').length === 0 ? (
                                <div className="text-center py-10 text-slate-500">등록된 회원이 없습니다. 마스터 센터에서 추가해주세요.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {profiles.filter(p => p.role === 'member').sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                        <button key={p.id} onClick={() => { setCurrentProfile(p); setActiveTab('history'); }} className="w-full bg-black hover:bg-slate-800 border border-slate-800 hover:border-primary-500/50 py-4 px-2 rounded-xl cursor-pointer transition-colors text-center group">
                                            <span className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'masterLogin' && (
                    <Card className="max-w-sm mx-auto mt-16 border-slate-800 fade-in text-center shadow-2xl bg-slate-900/50 w-full">
                        <div className="w-16 h-16 bg-black border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fa-solid fa-lock text-2xl text-primary-500"></i></div>
                        <h2 className="text-xl font-bold text-white mb-2">마스터 트레이너 센터</h2>
                        <p className="text-xs text-slate-400 mb-8">비밀번호를 입력해주세요.</p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (pwdInput === '1111') {
                                setPwdError(''); setPwdInput(''); 
                                const masterProfile = profiles.find(p => p.role === 'trainer') || { id: 'trainer_master', name: '마스터 트레이너', role: 'trainer' };
                                setCurrentProfile(masterProfile); setActiveTab('master'); setFilteredMemberId(null);
                            } else setPwdError('비밀번호가 일치하지 않습니다.');
                        }}>
                            <input type="password" value={pwdInput} onChange={e => setPwdInput(e.target.value)} placeholder="관리자전용" className="w-full bg-black border border-slate-700 rounded-lg p-3 text-center text-white focus:border-primary-500 outline-none mb-2 tracking-[0.5em]" />
                            <div className="h-4 mb-4">{pwdError && <p className="text-red-500 text-xs">{pwdError}</p>}</div>
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-black font-bold py-3 rounded-lg transition">잠금 해제</button>
                        </form>
                    </Card>
                )}

                {activeTab === 'members' && currentProfile?.role === 'trainer' && <MemberManagement profiles={profiles} onAdd={handleAddMember} onDelete={handleDeleteMember} onUpdate={handleUpdateMember} />}
                
                {/* 🌟 마스터 대시보드에서 카드 누르면 filteredMemberId 세팅 후 정상 라우팅 */}
                {activeTab === 'master' && currentProfile?.role === 'trainer' && !filteredMemberId && (
                    <TrainerDashboard logs={logs} onSelectMember={(memberId) => { setFilteredMemberId(memberId); setActiveTab('history'); }} goBulkUpload={() => { setIsBulkMaster(true); setActiveTab('new'); }} />
                )}
                
                {activeTab === 'detail' && (
                    <WorkoutDetailView log={activeLog} currentProfile={currentProfile} onDelete={handleDeleteLog} onEdit={(log) => { setEditingLog(log); setActiveTab('edit'); }} />
                )}
                
                {activeTab === 'new' && <MultiLogForm currentProfile={currentProfile} profiles={profiles} isBulkMaster={isBulkMaster} onSave={handleSaveLogBatch} onCancel={() => { setIsBulkMaster(false); setActiveTab(currentProfile?.role === 'trainer' ? (filteredMemberId ? 'history' : 'master') : 'history'); }} />}
                {activeTab === 'edit' && <MultiLogForm currentProfile={currentProfile} profiles={profiles} initialLog={editingLog} onSave={handleSaveLogBatch} onCancel={() => { setEditingLog(null); setActiveTab('detail'); }} />}

                {activeTab === 'history' && (
                    <div className="fade-in w-full">
                        <div className="flex justify-between items-center mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                            <h3 className="text-white font-bold"><i className="fa-regular fa-calendar-check mr-2 text-primary-500"></i>조회 기간 선택</h3>
                            <input 
                                type="month" 
                                value={historyFilterMonth} 
                                onChange={(e) => setHistoryFilterMonth(e.target.value)} 
                                className="bg-black border border-slate-700 text-white rounded-lg p-2 focus:border-primary-500 outline-none"
                            />
                        </div>

                        <MonthlyStatsChart logs={logs} memberId={filteredMemberId || currentProfile?.id} selectedMonth={historyFilterMonth || getLocalMonth()} />

                        {currentProfile?.role === 'trainer' && filteredMemberId && (
                            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 border border-primary-500/30 p-4 rounded-xl gap-4">
                                <h3 className="text-lg font-bold text-white flex items-center"><i className="fa-solid fa-folder-open mr-2 text-primary-500"></i>{filteredMemberProfile?.name} 님의 일지 열람 중</h3>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <button onClick={() => setShowReportModal(true)} className="w-full sm:w-auto flex-1 px-4 py-2 bg-[#D9C54B] hover:bg-[#c9b53b] text-black font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(217,197,75,0.2)] whitespace-nowrap"><i className="fa-regular fa-file-lines text-lg"></i> 월간 리포트</button>
                                    <button onClick={() => {setFilteredMemberId(null); setActiveTab('master');}} className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition text-sm">닫기 ✕</button>
                                </div>
                            </div>
                        )}
                        
                        {currentProfile?.role === 'member' && (
                            <div className="mb-6 bg-black border border-slate-800 p-4 rounded-xl">
                                <button onClick={() => setActiveTab('new')} className="w-full px-5 py-3 bg-primary-600 hover:bg-primary-500 text-black font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,197,75,0.2)]">
                                    <i className="fa-solid fa-plus"></i> 기록 추가
                                </button>
                            </div>
                        )}
                        
                        {displayLogs.length === 0 ? (
                            <div className="text-center py-20 text-slate-600 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed"><i className="fa-solid fa-cloud-arrow-down text-4xl mb-4 opacity-50"></i><p>저장된 기록이 없습니다.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {displayLogs.map(log => {
                                    const routineSummary = (log.exercises || []).filter(ex => ex.name && ex.sets?.length > 0).map(ex => `${ex.name} ${ex.sets.length}세트`).join(' / ');
                                    const parsedPreview = parseAIFeedback(log.feedback);
                                    const previewText = parsedPreview ? (parsedPreview.kinesiology || parsedPreview.운동학적) : log.feedback;

                                    return (
                                        <Card key={log.id} onClick={() => { setSelectedLogId(log.id); setActiveTab('detail'); }} className="group border-slate-800 hover:border-primary-500/50 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
                                            <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                                                <div><div className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{log.target}</div><div className="text-sm text-slate-500 mt-1">{normalizeDateString(log.date)}</div></div>
                                                <Badge color={getConditionColor(log.condition)}>
                                                    <span className="mr-1">{getConditionEmoji(log.condition)}</span>
                                                    {log.condition}
                                                </Badge>
                                            </div>
                                            {currentProfile?.role === 'trainer' && filteredMemberId ? (
                                                <div className="text-sm text-primary-300 font-medium line-clamp-3 mb-4 bg-slate-900 p-3 rounded-lg leading-relaxed border border-slate-800/50 flex-1"><i className="fa-solid fa-dumbbell text-xs mr-2 text-primary-500"></i>{routineSummary || '웨이트 기록 없음'}</div>
                                            ) : (
                                                <div className="text-sm text-slate-300 line-clamp-3 mb-4 bg-slate-900 p-3 rounded-lg leading-relaxed border border-slate-800/50 flex-1">
                                                    {previewText || '저장된 분석이 없습니다.'}
                                                </div>
                                            )}
                                            <div className="flex gap-4 text-xs text-slate-400 font-medium mt-auto"><span className="flex items-center"><i className="fa-solid fa-stopwatch mr-1 text-blue-400"></i>{log.duration}</span></div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 글로벌 푸터 (Copyright & Powered by Gemini) */}
            <footer className="mt-auto w-full py-6 text-center text-xs text-slate-500 no-print border-t border-slate-900/80 bg-black relative z-40">
                <p>© 2026 BASECAMP DATA CENTER. All rights reserved.</p>
                <p className="mt-1.5 font-bold tracking-wider text-slate-400">
                    Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-primary-500">Gemini</span> ✨
                </p>
            </footer>
            
            {/* 모바일 하단 바 네비게이션 동기화 */}
            <div className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 md:hidden flex justify-around py-3 z-50 no-print">
                <button onClick={() => { setCurrentProfile(null); setActiveTab('home'); setPwdInput(''); setFilteredMemberId(null); setIsBulkMaster(false); }} className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-primary-500' : 'text-slate-500'}`}><i className="fa-solid fa-house text-xl mb-1"></i><span className="text-[10px]">홈</span></button>
                {currentProfile?.role === 'member' && <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 ${activeTab === 'history' ? 'text-primary-500' : 'text-slate-500'}`}><i className="fa-solid fa-list text-xl mb-1"></i><span className="text-[10px]">기록</span></button>}
                {currentProfile?.role === 'trainer' && <button onClick={() => { setActiveTab('master'); setFilteredMemberId(null); setIsBulkMaster(false); }} className={`flex flex-col items-center p-2 ${activeTab === 'master' ? 'text-primary-500' : 'text-slate-500'}`}><i className="fa-solid fa-crown text-xl mb-1"></i><span className="text-[10px]">마스터</span></button>}
                {currentProfile?.role === 'member' && <button onClick={() => setActiveTab('new')} className={`flex flex-col items-center p-2 ${activeTab === 'new' ? 'text-primary-500' : 'text-slate-500'}`}><i className="fa-solid fa-plus text-xl mb-1"></i><span className="text-[10px]">기록추가</span></button>}
            </div>
        </div>
    );
};

export default App;