const Card = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`glass-panel rounded-2xl p-6 ${onClick ? 'cursor-pointer hover:border-primary-500/50 transition-colors' : ''} ${className}`}>
        {children}
    </div>
);

export default Card;
