export default function EmptyState({ icon, title, message, children }) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-icon">{icon}</div>}
            <h2>{title}</h2>
            {message && <p>{message}</p>}
            {children}
        </div>
    );
}
