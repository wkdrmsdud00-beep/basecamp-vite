import { useState, useEffect, useRef } from 'react';
import { normalizeDateString } from '../utils/helpers';
import { callGeminiAPI } from '../services/geminiService';
import Card from './Card';

// ==========================================
// 🔄 통합 일지 에디터 (5단계 컨디션 적용 버전)
// ==========================================
const MultiLogForm = ({ currentProfile, profiles, onSave, onCancel, initialLog, isBulkMaster }) => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const initDate = new Date(today.getTime() - offset).toISOString().split('T')[0];

    // 기본 컨디션을 '중'으로 세팅
    const emptyLog = { 
        id: Date.now().toString(),
        memberName: currentProfile?.role === 'member' ? currentProfile.name : '',
        memberId: currentProfile?.role === 'member' ? currentProfile.id : '',
        date: initDate, condition: '중', target: '', duration: '', 
        calories: '', minBpm: '', avgBpm: '', maxBpm: '', feedback: '', 
        exercises: [{ name: '', sets: [{ weight: '', reps: '', type: '일반' }] }], cardios: [] 
    };

    const [step, setStep] = useState(initialLog ? 3 : 1); 
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isSavingWithAI, setIsSavingWithAI] = useState(false); 
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [logList, setLogList] = useState(initialLog ? [{...initialLog}] : []);
    const [globalLoadingMsg, setGlobalLoadingMsg] = useState('');

    useEffect(() => { return () => stopCamera(); }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            setIsCameraOpen(true);
        } catch (err) { alert("카메라 권한을 허용해주시거나 지원하는 기기인지 확인해주세요."); }
    };

    useEffect(() => { if (isCameraOpen && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [isCameraOpen]);
    const stopCamera = () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        setIsCameraOpen(false);
    };

    const takePhoto = async () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            stopCamera();
            await processFilesWithAI([{ mimeType: 'image/jpeg', base64: dataUrl.split(',')[1] }]);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve({ mimeType: file.type, base64: event.target.result.split(',')[1] });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        try {
            setGlobalLoadingMsg("파일을 읽는 중입니다...");
            setStep(2);
            const parsedFiles = await Promise.all(files.map(fileToBase64));
            await processFilesWithAI(parsedFiles);
        } catch (error) {
            alert("파일 처리 실패. 수동으로 입력해주세요.");
            setLogList([{...emptyLog}]);
            setStep(3);
        }
    };

    const processFilesWithAI = async (parsedFiles) => {
        setStep(2);
        setGlobalLoadingMsg("BASECAMP AI가 자료를 통합 분석 중입니다...\n(자료가 많을 경우 10~20초 소요)");

        try {
            const imageParts = parsedFiles.map(pf => ({ inlineData: { mimeType: pf.mimeType || "image/jpeg", data: pf.base64 } }));
            const membersContext = profiles.filter(p=>p.role==='member').map(p => `${p.name}(${p.gender||'성별미상'},${p.age||'?'}세,목표:${p.goal||'기본'},특이사항:${p.note||'없음'})`).join(' | ');

            // 🌟 프롬프트 수정: 컨디션을 5단계로 자동 추론하도록 명령
            const promptText = `첨부된 문서(사진/PDF)들을 분석하여 '모든 운동 기록'을 추출해 주세요.
            여러 명의 기록이 섞여있거나 한 명의 여러 날짜 기록이 있어도 모두 개별 객체로 쪼개서 반드시 JSON 배열([]) 형태로 반환해야 합니다.

            [회원 정보 연계 매칭]
            - 시스템 등록 회원: ${membersContext}
            - 파일 내의 이름과 위 회원 목록을 매칭하여 'memberName'에 기입하세요. 모르면 "미지정"으로 작성.
            - ${currentProfile?.role === 'member' ? `현재 접속한 회원은 '${currentProfile.name}'입니다. 이름이 없으면 '${currentProfile.name}'의 기록으로 간주하세요.` : ''}

            [🚨 중요: 워치와 일지 통합 및 컨디션 규칙]
            - 여러 장의 사진이 동일한 날짜/회원의 운동이라면 절대 2개로 쪼개지 말고 1개의 객체로 병합하세요.
            - condition 항목은 반드시 ["최상", "상", "중", "하", "최하"] 이 5가지 중 하나만 선택해야 합니다. 문서에 명시되지 않았다면 운동의 강도, 소화한 세트 수, 또는 메모의 뉘앙스를 종합적으로 분석하여 적절한 컨디션을 추론해 주세요.

            [JSON 배열 반환 필수 구조]
            [
              {
                "memberName": "홍길동", "date": "2026-06-09", "target": "가슴", "condition": "상", "duration": "60분",
                "calories": 300, "minBpm": 80, "avgBpm": 120, "maxBpm": 150,
                "exercises": [{"name": "벤치프레스", "sets": [{"weight": "60kg", "reps": 10, "type": "일반"}]}],
                "cardios": [{"name": "러닝머신", "duration": "30분", "distance": "3km"}]
              }
            ]`;

            const payload = { 
                contents: [{ role: "user", parts: [{ text: promptText }, ...imageParts] }]
            };
            
            const { text: resultText, error: lastErrorMsg } = await callGeminiAPI(payload);

            if (!resultText) throw new Error(lastErrorMsg);

            let cleanJson = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
            let parsedArr;
            try {
                parsedArr = JSON.parse(cleanJson);
            } catch(e) {
                const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    parsedArr = JSON.parse(arrayMatch[0]);
                } else {
                    const objMatch = cleanJson.match(/\{[\s\S]*\}/);
                    if (objMatch) parsedArr = JSON.parse(objMatch[0]);
                    else throw new Error("분석 결과에서 JSON 데이터를 찾을 수 없습니다.");
                }
            }

            if (parsedArr && typeof parsedArr === 'object' && !Array.isArray(parsedArr)) {
                if (parsedArr.logs && Array.isArray(parsedArr.logs)) parsedArr = parsedArr.logs; 
                else parsedArr = [parsedArr];
            }

            if (!Array.isArray(parsedArr)) throw new Error("결과가 배열 형식이 아닙니다.");

            // 컨디션 값이 5단계 중 하나가 아니면 기본값 '중' 처리
            const validConditions = ['최상', '상', '중', '하', '최하'];
            const newLogs = parsedArr.map((item, idx) => ({
                id: Date.now().toString() + '_' + idx,
                memberName: item.memberName && item.memberName !== '미지정' ? item.memberName : (currentProfile?.role === 'member' ? currentProfile.name : ''),
                memberId: '',
                date: item.date ? normalizeDateString(item.date) : initDate,
                condition: validConditions.includes(item.condition) ? item.condition : '중', 
                target: item.target || '', duration: item.duration || '',
                calories: item.calories || '', minBpm: item.minBpm || '', avgBpm: item.avgBpm || '', maxBpm: item.maxBpm || '',
                exercises: item.exercises || [], cardios: item.cardios || [], feedback: ''
            }));

            setLogList(newLogs.length > 0 ? newLogs : [{...emptyLog}]);
            setStep(3);
        } catch(err) {
            alert(`자동 인식에 실패하여 수동 입력 모드로 전환합니다.\n\n[오류 상세 사유]\n${err.message}`);
            setLogList([{...emptyLog}]);
            setStep(3);
        }
    };

    const goManual = () => { setLogList([{...emptyLog}]); setStep(3); };

    const updateSubLog = (idx, field, val) => {
        const arr = [...logList];
        arr[idx][field] = val;
        setLogList(arr);
    };

    const addManualLogToBatch = () => setLogList([ {...emptyLog, id: Date.now().toString()}, ...logList ]);
    const removeSubLog = (idx) => {
        if(logList.length === 1) { alert("최소 1개의 기록이 필요합니다."); return; }
        if(window.confirm('이 기록을 목록에서 삭제할까요?')) setLogList(logList.filter((_, i) => i !== idx));
    };

    const handleSaveAllWithAI = async () => {
        for (let i=0; i<logList.length; i++) {
            const l = logList[i];
            if (!l.date || !l.target) { alert(`${i+1}번째 기록의 필수 항목(날짜/타겟)이 비어있습니다.`); return; }
            let finalMemName = l.memberName;
            if (currentProfile?.role === 'trainer') {
                if (!finalMemName) { alert(`${i+1}번째 기록에 회원이 지정되지 않았습니다.`); return; }
                const match = profiles.find(p => p.role === 'member' && p.name === finalMemName);
                if (!match) { alert(`'${finalMemName}' 회원을 찾을 수 없습니다. 목록에서 정확히 선택해주세요.`); return; }
            }
        }

        setIsSavingWithAI(true);
        setGlobalLoadingMsg("입력해주신 기록을 바탕으로\n전문 퍼스널 트레이너 관점의 4가지 맞춤형 피드백을 작성 중입니다...\n(최대 10~15초 소요)");

        const prompt = `당신은 전문 퍼스널 트레이너입니다. 다음은 회원의 운동 기록 목록입니다. 각 기록을 분석하여 전문적이고 격려하는 관점의 피드백을 작성해주세요. 
        
        [🚨 중요: 반환 형식]
        반드시 입력된 기록의 순서와 동일하게 JSON 배열 형식으로만 반환하세요.
        각 피드백은 반드시 아래의 4가지 키를 포함하는 객체(Object)여야 합니다.
        [
          {
            "kinesiology": "운동학적 관점의 조언 및 칭찬 (2~3문장)",
            "rest": "휴식 및 회복 관점의 조언 (2~3문장)",
            "nutrition": "영양 섭취 관점의 조언 (2~3문장)",
            "cardio": "오늘 소화한 웨이트 볼륨(종목/세트/무게)과 컨디션을 바탕으로 한 맞춤 유산소 추천 (반드시 추천 머신, 구체적인 권장 시간, 속도, 경사도 수치를 명확히 제시할 것) (2~3문장)"
          }
        ]
        
        데이터: 
        ${JSON.stringify(logList.map(l => ({ 
            memberName: l.memberName || currentProfile?.name, 
            target: l.target, condition: l.condition, duration: l.duration, 
            exercises: l.exercises.map(ex => `${ex.name} ${ex.sets.length}세트`).join(', '),
            cardios: l.cardios.map(c => `${c.name} ${c.duration}`).join(', ')
        })))}`;

        const payload = { 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        let feedbackArr = [];
        let aiSuccess = false;

        const { text: aiText } = await callGeminiAPI(payload);
        if (aiText) {
            try {
                const cleanJson = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                if (Array.isArray(parsed) && parsed.length === logList.length) {
                    feedbackArr = parsed;
                    aiSuccess = true;
                }
            } catch (e) { }
        }

        if (!aiSuccess) {
            feedbackArr = logList.map(() => JSON.stringify({ 
                kinesiology: "기록이 안전하게 저장되었습니다.",
                rest: "현재 AI 서버가 일시적으로 혼잡합니다.",
                nutrition: "잠시 후 '기록 수정'을 누르고 다시 저장하시면",
                cardio: "맞춤형 피드백을 다시 받아보실 수 있습니다."
            }));
        }

        const finalLogs = [];
        for (let i=0; i<logList.length; i++) {
            const l = logList[i];
            let finalMemId = l.memberId;
            let finalMemName = l.memberName;

            if (currentProfile?.role === 'member') {
                finalMemId = currentProfile.id; finalMemName = currentProfile.name;
            } else {
                const match = profiles.find(p => p.role === 'member' && p.name === finalMemName);
                finalMemId = match.id;
            }

            const finalFeedbackStr = typeof feedbackArr[i] === 'object' ? JSON.stringify(feedbackArr[i]) : feedbackArr[i];

            finalLogs.push({
                ...l, 
                memberId: finalMemId, 
                memberName: finalMemName,
                feedback: finalFeedbackStr,
                watchData: { calories: l.calories, minBpm: l.minBpm, avgBpm: l.avgBpm, maxBpm: l.maxBpm },
                createdAt: initialLog ? initialLog.createdAt : (Date.now() - i)
            });
        }
        
        setIsSavingWithAI(false);
        onSave(finalLogs, !!initialLog);
    };

    if (isSavingWithAI) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] fade-in px-4">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold text-primary-400 mb-4 text-center">AI 4단 코멘트 생성 및 저장 중...</h2>
                <p className="text-slate-300 text-center max-w-md whitespace-pre-line leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-700">
                    {globalLoadingMsg}
                </p>
            </div>
        );
    }

    if (step === 1) {
        if (isCameraOpen) {
            return (
                <Card className="max-w-3xl mx-auto fade-in text-center border-slate-800">
                    <h2 className="text-2xl font-bold mb-4 text-white">실시간 카메라 촬영</h2>
                    <div className="relative rounded-2xl overflow-hidden bg-black mb-4 flex justify-center border-2 border-slate-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md h-auto max-h-[50vh] object-cover" />
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button onClick={takePhoto} className="px-6 py-3 bg-primary-600 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(217,197,75,0.3)]">촬영하기</button>
                        <button onClick={stopCamera} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl">취소</button>
                    </div>
                </Card>
            );
        }

        return (
            <Card className="max-w-3xl mx-auto fade-in text-center py-16 border-slate-800">
                <h2 className="text-2xl font-bold mb-2 text-white">
                    {isBulkMaster ? "회원 운동일지 업로드" : "스마트 운동 기록 추가"}
                </h2>
                <p className="text-slate-400 mb-8">
                    사진, 수기 일지, 워치 화면은 물론 <strong>PDF 파일</strong>까지 지원합니다.<br/>
                    일지와 워치를 여러 장 함께 선택해도 하나의 기록으로 완벽하게 병합해 냅니다.
                </p>
                
                <div className="flex flex-row gap-3 w-full mb-2 h-32 sm:h-40">
                    <button type="button" onClick={startCamera} className="flex-1 flex flex-col items-center justify-center border-2 border-primary-500 border-dashed rounded-2xl bg-black hover:bg-slate-900 transition">
                        <i className="fa-solid fa-camera text-2xl sm:text-3xl text-primary-500 mb-2"></i>
                        <span className="font-semibold text-primary-400 text-xs sm:text-sm">카메라 촬영</span>
                    </button>
                    <label className="flex-1 cursor-pointer flex flex-col items-center justify-center border-2 border-primary-500 border-dashed rounded-2xl bg-black hover:bg-slate-900 transition group">
                        <i className="fa-solid fa-images text-2xl sm:text-3xl text-primary-500 mb-2 group-hover:scale-110 transition-transform"></i>
                        <span className="font-semibold text-primary-400 text-xs sm:text-sm">앨범 선택</span>
                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                    <button type="button" onClick={goManual} className="flex-1 flex flex-col items-center justify-center border-2 border-primary-500 border-dashed rounded-2xl bg-black hover:bg-slate-900 transition">
                        <i className="fa-solid fa-pen-to-square text-2xl sm:text-3xl text-primary-500 mb-2"></i>
                        <span className="font-semibold text-primary-400 text-xs sm:text-sm">직접입력</span>
                    </button>
                </div>
            </Card>
        );
    }

    if (step === 2) return (
        <div className="flex flex-col items-center justify-center h-96 fade-in px-4">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-primary-400 mb-4 text-center">AI 다중 인식 엔진 가동 중...</h2>
            <p className="text-slate-300 text-center max-w-md whitespace-pre-line leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-700">
                {globalLoadingMsg}
            </p>
        </div>
    );

    // Step 3: Review & Edit Array
    return (
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
            <div className="bg-slate-900 p-6 rounded-2xl border border-primary-500/50 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-16 z-40 shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1"><i className="fa-solid fa-list-check mr-2 text-primary-500"></i>최종 데이터 확인 및 수정</h2>
                    <p className="text-slate-400 text-sm">입력된 기록을 확인하고 저장하세요. 저장 시 AI가 4단 피드백을 작성해 드립니다.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={addManualLogToBatch} className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition text-sm"><i className="fa-solid fa-plus mr-1"></i>빈 양식 추가</button>
                    <button onClick={handleSaveAllWithAI} className="flex-1 sm:flex-none px-8 py-3 bg-primary-600 hover:bg-primary-500 text-black font-bold rounded-xl transition shadow-[0_0_15px_rgba(217,197,75,0.3)]">전체 {initialLog ? '수정' : '저장'} 승인</button>
                    <button onClick={onCancel} className="px-4 py-3 bg-slate-800 text-white rounded-xl">취소</button>
                </div>
            </div>

            <div className="space-y-8">
                {logList.map((log, logIdx) => (
                    <Card key={log.id} className="border-slate-700 relative pt-10 border-t-4 border-t-primary-500">
                        <div className="absolute top-0 left-0 bg-primary-500 text-black font-bold text-xs px-3 py-1 rounded-br-lg">기록 #{logIdx + 1}</div>
                        <button type="button" onClick={() => removeSubLog(logIdx)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500 text-sm px-2 py-1"><i className="fa-solid fa-xmark mr-1"></i>삭제</button>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs text-slate-500 mb-1">회원 지정</label>
                                {currentProfile?.role === 'trainer' ? (
                                    <select value={log.memberName} onChange={e => updateSubLog(logIdx, 'memberName', e.target.value)} className={`w-full bg-black border ${!log.memberName || log.memberName === '미지정' ? 'border-red-500' : 'border-slate-700'} rounded-lg p-2 text-white focus:border-primary-500 outline-none`}>
                                        <option value="">회원 선택 (필수)</option>
                                        {profiles.filter(p=>p.role==='member').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={log.memberName} disabled className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 outline-none cursor-not-allowed" />
                                )}
                            </div>
                            <div><label className="block text-xs text-slate-500 mb-1">운동 날짜</label><input type="date" value={log.date} onChange={e => updateSubLog(logIdx, 'date', e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white focus:border-primary-500 outline-none" required /></div>
                            <div><label className="block text-xs text-slate-500 mb-1">부위</label><input type="text" value={log.target} onChange={e => updateSubLog(logIdx, 'target', e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none" /></div>
                            <div><label className="block text-xs text-slate-500 mb-1">시간</label><input type="text" value={log.duration} onChange={e => updateSubLog(logIdx, 'duration', e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none" /></div>
                        </div>

                        {/* 🌟 새로 추가된 5단계 컨디션 세그먼트 UI */}
                        <div className="mb-6">
                            <label className="block text-xs text-slate-500 mb-1">오늘의 운동 컨디션</label>
                            <div className="flex bg-black border border-slate-700 rounded-lg overflow-hidden h-10 shadow-inner">
                                {['최상', '상', '중', '하', '최하'].map(level => {
                                    const isSelected = log.condition === level;
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => updateSubLog(logIdx, 'condition', level)}
                                            className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 ${
                                                isSelected 
                                                ? 'bg-primary-600 text-black shadow-md' 
                                                : 'text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="text-[14px]">
                                                {level === '최상' && '😍'}
                                                {level === '상' && '😊'}
                                                {level === '중' && '😐'}
                                                {level === '하' && '🙁'}
                                                {level === '최하' && '😫'}
                                            </span>
                                            <span className="hidden sm:inline">{level}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 웨이트 루틴 */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm text-primary-400 font-bold"><i className="fa-solid fa-dumbbell mr-2"></i>웨이트 루틴</label>
                                    <button type="button" onClick={() => updateSubLog(logIdx, 'exercises', [...log.exercises, { name: '', sets: [{ weight: '', reps: '', type: '일반' }] }])} className="text-xs text-slate-300 border border-slate-600 px-2 py-1 rounded">추가</button>
                                </div>
                                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {log.exercises.map((ex, exIdx) => (
                                        <div key={exIdx} className="bg-black p-3 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <input type="text" placeholder="종목명" value={ex.name} onChange={e => { const arr=[...log.exercises]; arr[exIdx].name=e.target.value; updateSubLog(logIdx,'exercises',arr); }} className="w-2/3 bg-transparent text-sm text-white font-bold outline-none border-b border-slate-800 focus:border-primary-500 pb-1" />
                                                <button type="button" onClick={() => { const arr=[...log.exercises]; arr.splice(exIdx,1); updateSubLog(logIdx,'exercises',arr); }} className="text-slate-600 hover:text-red-500 text-xs"><i className="fa-solid fa-xmark"></i></button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {ex.sets.map((set, sIdx) => (
                                                    <div key={sIdx} className="flex items-center gap-1 bg-slate-900 p-1 rounded text-xs">
                                                        <span className="text-slate-500">{sIdx+1}</span>
                                                        <select value={set.type} onChange={e=>{ const arr=[...log.exercises]; arr[exIdx].sets[sIdx].type=e.target.value; updateSubLog(logIdx,'exercises',arr); }} className="bg-slate-800 text-white rounded outline-none appearance-none"><option>일반</option><option>드롭</option><option>컴파운드</option></select>
                                                        <input type="text" placeholder="kg" value={set.weight} onChange={e=>{ const arr=[...log.exercises]; arr[exIdx].sets[sIdx].weight=e.target.value; updateSubLog(logIdx,'exercises',arr); }} className="w-8 bg-transparent text-center text-white outline-none" />
                                                        <input type="number" placeholder="회" value={set.reps} onChange={e=>{ const arr=[...log.exercises]; arr[exIdx].sets[sIdx].reps=e.target.value; updateSubLog(logIdx,'exercises',arr); }} className="w-8 bg-transparent text-center text-white outline-none" />
                                                    </div>
                                                ))}
                                                <button type="button" onClick={()=>{ const arr=[...log.exercises]; arr[exIdx].sets.push({weight:'',reps:'',type:'일반'}); updateSubLog(logIdx,'exercises',arr); }} className="text-xs bg-slate-800 px-2 rounded text-slate-400">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 유산소 & 워치 */}
                            <div className="space-y-4">
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm text-green-400 font-bold"><i className="fa-solid fa-person-running mr-2"></i>유산소</label>
                                        <button type="button" onClick={() => updateSubLog(logIdx, 'cardios', [...log.cardios, { name: '', duration: '', distance: '' }])} className="text-xs text-slate-300 border border-slate-600 px-2 py-1 rounded">추가</button>
                                    </div>
                                    <div className="space-y-2">
                                        {log.cardios.map((c, cIdx) => (
                                            <div key={cIdx} className="flex gap-2 bg-black p-2 rounded border border-slate-700 text-sm">
                                                <input type="text" placeholder="종목" value={c.name} onChange={e=>{ const arr=[...log.cardios]; arr[cIdx].name=e.target.value; updateSubLog(logIdx,'cardios',arr); }} className="flex-1 w-0 bg-transparent text-white outline-none" />
                                                <input type="text" placeholder="시간" value={c.duration} onChange={e=>{ const arr=[...log.cardios]; arr[cIdx].duration=e.target.value; updateSubLog(logIdx,'cardios',arr); }} className="w-16 bg-transparent text-white outline-none border-l border-slate-800 pl-2" />
                                                <input type="text" placeholder="거리" value={c.distance} onChange={e=>{ const arr=[...log.cardios]; arr[cIdx].distance=e.target.value; updateSubLog(logIdx,'cardios',arr); }} className="w-16 bg-transparent text-white outline-none border-l border-slate-800 pl-2" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <label className="block text-sm text-orange-400 font-bold mb-2"><i className="fa-solid fa-heart-pulse mr-2"></i>워치 데이터</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="칼로리 (kcal)" value={log.calories} onChange={e => updateSubLog(logIdx, 'calories', e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none text-xs" />
                                        <input type="number" placeholder="평균 심박수" value={log.avgBpm} onChange={e => updateSubLog(logIdx, 'avgBpm', e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default MultiLogForm;