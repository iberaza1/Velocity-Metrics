import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login() {
    const { signInWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    // Redirect if already logged in (cleanup)
    if (currentUser) {
        navigate('/');
        return null;
    }

    const handleLogin = async () => {
        try {
            setError('');
            await signInWithGoogle();
            navigate('/');
        } catch (err) {
            setError('Failed to sign in. Please try again.');
            console.error(err);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{
                backgroundColor: '#2a2a2a',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%'
            }}>
                <div style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <Activity size={48} color="#00E5FF" />
                </div>

                <h1 style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>Velocity Tracker</h1>
                <p style={{ color: '#aaa', marginBottom: '2rem' }}>Sign in to track your performance</p>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255,82,82,0.1)',
                        color: '#ff5252',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        style={{ width: '20px', marginRight: '10px' }}
                    />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
