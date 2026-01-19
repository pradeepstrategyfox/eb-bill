export default function StatCard({ icon, label, value, change, iconColor }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ color: iconColor }}>
                {icon}
            </div>
            <div className="stat-content">
                <p className="stat-label">{label}</p>
                <h2 className="stat-value">{value}</h2>
                {change && <p className="stat-change">{change}</p>}
            </div>
        </div>
    );
}
