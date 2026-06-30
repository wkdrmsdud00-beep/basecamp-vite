import { useEffect } from 'react';
import { parseAIFeedback } from '../utils/helpers';

// ==========================================
// 🎉 운동 완료 후 AI 피드백 프레젠테이션 (전체화면)
// ==========================================
const FeedbackPresentation = ({ log, onClose }) => {
    const parsedFeedback = parseAIFeedback(log?.feedback);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => document.body.style.overflow = 'auto';
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-4 sm:p-8 overflow-y-auto fade-in custom-scrollbar backdrop-blur-md">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-center">
                <div className="text-center mb-8 mt-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-600 text-4xl sm:text-5xl mb-6 shadow-[0_0_40px_rgba(217,197,75,0.6)] animate-bounce">🎉</div>
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight break-keep">오늘의 운동 완료!</h2>
                    <p className="text-lg sm:text-2xl text-primary-400 font-bold">BASECAMP AI 맞춤형 분석 결과</p>
                </div>

                {parsedFeedback ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12 flex-1 items-stretch">
                        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col transform hover:scale-[1.02] transition-transform">
                            <h3 className="text-2xl sm:text-3xl font-black text-primary-400 mb-4 flex items-center border-b border-slate-700 pb-3"><i className="fa-solid fa-dumbbell mr-3"></i>운동학적 관점</h3>
                            <p className="text-white text-lg sm:text-xl leading-relaxed flex-1 break-keep">{parsedFeedback.kinesiology || parsedFeedback.운동학적}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col transform hover:scale-[1.02] transition-transform">
                            <h3 className="text-2xl sm:text-3xl font-black text-blue-400 mb-4 flex items-center border-b border-slate-700 pb-3"><i className="fa-solid fa-bed mr-3"></i>휴식 관점</h3>
                            <p className="text-white text-lg sm:text-xl leading-relaxed flex-1 break-keep">{parsedFeedback.rest || parsedFeedback.휴식}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col transform hover:scale-[1.02] transition-transform">
                            <h3 className="text-2xl sm:text-3xl font-black text-green-400 mb-4 flex items-center border-b border-slate-700 pb-3"><i className="fa-solid fa-apple-whole mr-3"></i>영양 관점</h3>
                            <p className="text-white text-lg sm:text-xl leading-relaxed flex-1 break-keep">{parsedFeedback.nutrition || parsedFeedback.영양}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col transform hover:scale-[1.02] transition-transform">
                            <h3 className="text-2xl sm:text-3xl font-black text-orange-400 mb-4 flex items-center border-b border-slate-700 pb-3"><i className="fa-solid fa-person-running mr-3"></i>권장 유산소</h3>
                            <p className="text-white text-lg sm:text-xl leading-relaxed flex-1 break-keep">{parsedFeedback.cardio || parsedFeedback.유산소}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl flex-1 mb-12 flex items-center justify-center">
                        <p className="text-white text-xl sm:text-3xl leading-relaxed whitespace-pre-line text-center">{log?.feedback || '피드백 분석을 가져오지 못했습니다.'}</p>
                    </div>
                )}

                <div className="text-center pb-12">
                    <button onClick={onClose} className="px-12 py-6 bg-primary-600 hover:bg-primary-500 text-black text-2xl sm:text-3xl font-black rounded-2xl transition shadow-[0_0_30px_rgba(217,197,75,0.5)] w-full sm:w-auto hover:scale-105 active:scale-95">
                        확인 완료 <i className="fa-solid fa-check ml-2"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackPresentation;
