const BackButton = ({ onClick }) => (
    <button onClick={onClick} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2 transition text-sm font-bold bg-slate-800/50 hover:bg-slate-700 px-4 py-2 rounded-xl inline-block border border-slate-700 no-print">
        <i className="fa-solid fa-arrow-left"></i> 이전 화면으로
    </button>
);

export default BackButton;
