export default function LoadingSpinner({ size = '48px', fullPage = false }) {
    const spinner = (
        <div className="spinner" style={{ width: size, height: size }}></div>
    );

    if (fullPage) {
        return (
            <div style={{ 
                height: '100%', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '4rem'
            }}>
                {spinner}
            </div>
        );
    }

    return spinner;
}
