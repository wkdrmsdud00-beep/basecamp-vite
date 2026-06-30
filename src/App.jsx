import { useState, useEffect, useMemo, useRef } from 'react';

// --- 프리뷰를 위한 임시 헬퍼 및 컴포넌트 (실제 환경에서는 기존 import 사용) ---
const normalizeDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const Card = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-slate-800/50 border border-slate-700 p-4 rounded-xl shadow-lg ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, color = 'slate' }) => {
    const colorClasses = {
        primary: 'bg-primary-500/20 text-primary-400 border-primary-500/50',
        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        red: 'bg-red-500/20 text-red-400 border-red-500/50',
        slate: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        green: 'bg-green-500/20 text-green-400 border-green-500/50',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color] || colorClasses.slate}`}>{children}</span>;
};

// 빈 껍데기 컴포넌트들 (프리뷰 에러 방지용)
const BackButton = ({ onClick }) => <button onClick={onClick} className="text-slate-400 mb-4 px-4 py-2 hover:bg-slate-800 rounded-lg">← 이전 화면으로</button>;
const TopAttendanceChart = () => <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-500">Top Attendance Chart (Preview)</div>;
const MonthlyStatsChart = () => <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-500">Monthly Stats Chart (Preview)</div>;
const TrainerDashboard = ({ onSelectMember }) => <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-500"><p className="mb-4">Trainer Dashboard (Preview)</p><button onClick={() => onSelectMember('member_1')} className="bg-primary-600 text-black px-4 py-2 rounded-lg">임시 회원 선택 (테스트)</button></div>;
// WorkoutDetailView는 MemberDashboard 내부에서 모달로 사용되므로 주석 처리 또는 제거
// const WorkoutDetailView = () => <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-500">Workout Detail View (Preview)</div>;
const MemberDashboard = () => <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-500 flex flex-col items-center"><i className="fa-solid fa-calendar-days text-4xl mb-4 text-primary-500"></i><p className="text-lg text-white mb-2">새로운 캘린더 대시보드가 렌더링되는 영역입니다.</p><p className="text-sm">실제 로컬 환경에 코드를 적용하시면 정상 작동합니다.</p></div>;

// Firebase 빈 껍데기
const onAuthStateChanged = (auth, cb) => { cb({ uid: 'tester' }); return () => {}; };
const collection = () => {};
const onSnapshot = () => () => {};

// ---------------------------------------------------------------------------

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
    // import.meta 에러 방지를 위한 빈 문자열 할당
    const appId = 'basecamp_production';

    const [logs, setLogs] = useState([]);
    const [profiles, setProfiles] = useState([
        { id: 'trainer_master', name: '마스터 트레이너', role: 'trainer' },
        { id: 'member_1', name: '김베이스', role: 'member' } // 테스트용 임시 회원
    ]);
    
    const [currentProfile, setCurrentProfile] = useState(null); 
    const [activeTab, setActiveTab] = useState('home');
    // selectedLogId 상태는 MemberDashboard 내부로 이동하므로 제거 또는 주석 처리
    // const [selectedLogId, setSelectedLogId] = useState(null);
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
        const current = getLocalMonth();
        setReportMonth(current); 
        setHistoryFilterMonth(current); 
    }, []);

    const handleBack = () => {
        if (activeTab === 'memberSelect') setActiveTab('home');
        else if (activeTab === 'masterLogin') { setPwdInput(''); setActiveTab('home'); }
        else if (activeTab === 'master') { setCurrentProfile(null); setActiveTab('home'); setFilteredMemberId(null); }
        else if (activeTab === 'members') { setActiveTab('master'); setFilteredMemberId(null); }
        else if (activeTab === 'history') {
            if (filteredMemberId) { setFilteredMemberId(null); setActiveTab('master'); } 
            else if (currentProfile?.role === 'member') { setCurrentProfile(null); setActiveTab('memberSelect'); }
        }
        // 'detail' 탭 관련 로직 제거
        /*
        else if (activeTab === 'detail') {
            setSelectedLogId(null);
            setActiveTab('history');
        }
        */
        else if (activeTab === 'new' || activeTab === 'bulkUpload') { 
            setIsBulkMaster(false); 
            setActiveTab(currentProfile?.role === 'trainer' ? (filteredMemberId ? 'history' : 'master') : 'history'); 
        }
        // 'edit' 탭에서 뒤로 가기 시 'history'로 이동하도록 수정 (MemberDashboard에서 모달로 띄우므로)
        else if (activeTab === 'edit') { setEditingLog(null); setActiveTab('history'); }
    };

    const displayLogs = useMemo(() => {
        if (!currentProfile) return [];
        let filtered = logs;
        if (currentProfile.role === 'member') {
            filtered = logs.filter(log => log.memberId === currentProfile.id);
        } else if (currentProfile.role === 'trainer' && filteredMemberId) {
            filtered = logs.filter(log => log.memberId === filteredMemberId);
        }
        return filtered;
    }, [logs, currentProfile, filteredMemberId]);

    // activeLog도 이제 MemberDashboard에서 자체적으로 관리하므로 주석 처리
    /*
    const activeLog = useMemo(() => {
        return logs.find(l => l.id === selectedLogId) || displayLogs[0];
    }, [logs, selectedLogId, displayLogs]);
    */

    const filteredMemberProfile = profiles.find(p => p.id === filteredMemberId);

    return (
        <div className="min-h-screen bg-black flex flex-col pb-16 md:pb-0 relative font-sans">
            <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800 no-print flex-none bg-black/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentProfile(null); setFilteredMemberId(null); setActiveTab('home'); }}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-yellow-300 flex items-center justify-center font-black text-black text-xs shadow-[0_0_10px_rgba(217,197,75,0.5)]">BC</div>
                        <span className="text-xl font-bold tracking-tight text-white hidden sm:block">BASECAMP <span className="text-[#D9C54B] font-normal">DATA CENTER</span></span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {currentProfile && (
                            <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-2 border border-slate-800">
                                <div className="text-sm font-bold text-primary-400 flex items-center"><span className="mr-2">👤</span>{currentProfile.name}</div>
                                <button onClick={() => { setCurrentProfile(null); setActiveTab('home'); setPwdInput(''); setFilteredMemberId(null); }} className="text-xs bg-black border border-slate-700 hover:border-primary-500 text-white px-3 py-1.5 rounded-lg transition">로그아웃</button>
                            </div>
                        )}

                        <div className="hidden md:flex gap-2">
                            <button onClick={() => { setCurrentProfile(null); setActiveTab('home'); setPwdInput(''); setFilteredMemberId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'home' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>홈</button>
                            {currentProfile?.role === 'member' && <button onClick={() => { setActiveTab('history'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>기록 목록</button>}
                            {currentProfile?.role === 'trainer' && (
                                <>
                                    <button onClick={() => { setActiveTab('members'); setFilteredMemberId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'members' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>회원 관리</button>
                                    <button onClick={() => { setActiveTab('master'); setFilteredMemberId(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'master' ? 'bg-primary-600 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>마스터 센터</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col no-print text-gray-200">
                {activeTab !== 'home' && <BackButton onClick={handleBack} />}

                {activeTab === 'home' && (
                    <div className="fade-in flex-1 flex flex-col items-center justify-center text-center w-full min-h-[60vh] py-10">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-[#D9C54B] to-yellow-300 flex items-center justify-center font-black text-black text-4xl mb-6 shadow-[0_0_30px_rgba(217,197,75,0.5)]">BC</div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#D9C54B] mb-12 tracking-tighter">BASECAMP</h1>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto">
                            <button onClick={() => setActiveTab('memberSelect')} className="flex-1 px-8 py-5 bg-[#D9C54B] hover:bg-yellow-500 text-black font-bold rounded-2xl transition shadow-[0_0_20px_rgba(217,197,75,0.3)] text-lg">⚡ 운동 기록</button>
                            <button onClick={() => setActiveTab('masterLogin')} className="flex-1 px-8 py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition border border-slate-700 hover:border-[#D9C54B] text-lg">👑 마스터 센터</button>
                        </div>
                    </div>
                )}

                {activeTab === 'memberSelect' && (
                    <div className="fade-in max-w-4xl mx-auto w-full">
                        <TopAttendanceChart />
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
                        <div className="w-16 h-16 bg-black border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🔒</span></div>
                        <h2 className="text-xl font-bold text-white mb-2">마스터 트레이너 센터</h2>
                        <p className="text-xs text-slate-400 mb-8">비밀번호를 입력해주세요. (1111 입력)</p>
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
                            <button type="submit" className="w-full bg-[#D9C54B] hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition">잠금 해제</button>
                        </form>
                    </Card>
                )}

                {activeTab === 'master' && currentProfile?.role === 'trainer' && !filteredMemberId && (
                    <TrainerDashboard onSelectMember={(memberId) => { setFilteredMemberId(memberId); setActiveTab('history'); }} />
                )}
                
                {/* 기존에 WorkoutDetailView를 렌더링하던 부분 제거
                {activeTab === 'detail' && (
                    <WorkoutDetailView />
                )}
                */}

                {/* 🌟 새로 적용된 캘린더 대시보드 영역 🌟 */}
                {activeTab === 'history' && (
                    <div className="fade-in w-full">
                        {/* 마스터 모드 전용 상단 바 */}
                        {currentProfile?.role === 'trainer' && filteredMemberId && (
                            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 border border-primary-500/30 p-4 rounded-xl gap-4">
                                <h3 className="text-lg font-bold text-white flex items-center"><span className="mr-2">📂</span>{filteredMemberProfile?.name} 님의 일지 열람 중</h3>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <button onClick={() => {setFilteredMemberId(null); setActiveTab('master');}} className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition text-sm">닫기 ✕</button>
                                </div>
                            </div>
                        )}
                        
                        {/* 🌟 외부 컴포넌트인 캘린더 대시보드가 들어가는 자리 */}
                        {/* 여기에 필요한 props (예: logs={displayLogs})를 전달하시면 됩니다. */}
                        <MemberDashboard />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;