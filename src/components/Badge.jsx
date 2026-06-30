const Badge = ({ children, color = 'primary' }) => {
    const colors = {
        primary: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        red: 'bg-red-500/20 text-red-300 border-red-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[color] || colors.primary}`}>{children}</span>;
};

export default Badge;
