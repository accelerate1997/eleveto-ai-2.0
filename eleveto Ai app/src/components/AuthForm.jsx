import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { User, Lock, Mail, Loader2, Cpu, ArrowRight, Activity, Boxes, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteToken, setInviteToken] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        passwordConfirm: '',
        name: ''
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite');
        if (token) {
            setInviteToken(token);
            setIsLogin(false); // Force registration mode if invite link is used
        }
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isLogin) {
                const authData = await pb.collection('users').authWithPassword(formData.email, formData.password);

                // Check if user is active
                if (authData.record.active === false) {
                    pb.authStore.clear();
                    throw new Error("Your account has been deactivated. Please contact your administrator.");
                }

                window.location.href = '/'; // Clear URL params on success
            } else {
                if (!inviteToken) {
                    throw new Error("Registration is invite-only. Please use a valid invite link.");
                }

                // Create user
                const data = {
                    email: formData.email,
                    password: formData.password,
                    passwordConfirm: formData.passwordConfirm,
                    name: formData.name,
                    role: 'employee',
                    active: true
                };
                await pb.collection('users').create(data);

                // Login immediately to get auth token
                await pb.collection('users').authWithPassword(formData.email, formData.password);

                // Now authenticated, find and invalidate the invite token
                try {
                    const inviteRecords = await pb.collection('invites').getList(1, 1, {
                        filter: `token = "${inviteToken}" && used = false`
                    });

                    if (inviteRecords.items.length > 0) {
                        const invite = inviteRecords.items[0];
                        await pb.collection('invites').update(invite.id, { used: true });
                        window.location.href = '/';
                    } else {
                        // Token was invalid or already used, but user was created.
                        pb.authStore.clear();
                        throw new Error("This invite link has expired or already been used. Please contact the admin.");
                    }
                } catch (inviteErr) {
                    pb.authStore.clear();
                    throw new Error("Failed to validate invite. Please use a valid link.");
                }
            }
        } catch (err) {
            setError(err.message || 'Access Denied: ElevetoAi Authentication Failure');
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container glass">
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} className="animate-pulse" style={{ color: '#1e5afa' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-indigo)', letterSpacing: '0.05em' }}>
                    Autonomous Link Active
                </span>
            </div>

            <header className="auth-header" style={{ position: 'relative' }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '1rem',
                    borderRadius: '24px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    marginBottom: '1.5rem',
                    boxShadow: '0 20px 40px -10px rgba(30, 90, 250, 0.3)',
                    border: '1px solid rgba(30, 90, 250, 0.2)'
                }}>
                    <img 
                        src="/logo.png" 
                        alt="ElevetoAi Logo" 
                        style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'var(--logo-gradient)',
                        borderRadius: '12px',
                        display: 'none',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Boxes size={32} color="white" />
                    </div>
                </div>
                <h1 className="auth-title" style={{ 
                    fontFamily: 'Outfit, sans-serif',
                    color: '#0f172a',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.04em'
                }}>
                    Eleveto<span style={{ color: '#3b82f6' }}>Ai</span> Hub
                </h1>
                <p className="subtitle">
                    {isLogin
                        ? 'Establish secure agent connection'
                        : 'Initialize new agent profile'}
                </p>

                {!inviteToken && (
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: 'transparent', border: 'none', color: '#64748b',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            marginTop: '1rem', transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    >
                        &larr; Return to Website
                    </button>
                )}
            </header>

            {!isLogin && !inviteToken && (
                <div style={{
                    color: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '14px',
                    fontSize: '0.85rem', marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Invite Required:</strong> You cannot create a new identity without an invite link from an administrator.</span>
                </div>
            )}

            {error && (
                <div style={{
                    color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '14px',
                    fontSize: '0.85rem', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                    <Cpu size={16} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div className="form-group">
                        <label htmlFor="name">Agent Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="FullName"
                                style={{ paddingLeft: '3rem' }}
                                value={formData.name}
                                onChange={handleChange}
                                required={!isLogin}
                                disabled={!inviteToken}
                            />
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Agent Identity {(!isLogin && !inviteToken) && '(Disabled)'}</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="identity@neural.agency"
                            style={{ paddingLeft: '3rem' }}
                            inputMode="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={!isLogin && !inviteToken}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="password">Access Key</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="••••••••"
                            style={{ paddingLeft: '3rem' }}
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={!isLogin && !inviteToken}
                        />
                    </div>
                </div>

                {!isLogin && (
                    <div className="form-group">
                        <label htmlFor="passwordConfirm">Confirm Key</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="password"
                                id="passwordConfirm"
                                name="passwordConfirm"
                                placeholder="••••••••"
                                style={{ paddingLeft: '3rem' }}
                                value={formData.passwordConfirm}
                                onChange={handleChange}
                                required={!isLogin}
                                disabled={!inviteToken}
                            />
                        </div>
                    </div>
                )}

                <button type="submit" className="btn" disabled={isLoading || (!isLogin && !inviteToken)}>
                    {isLoading ? <div className="spinner" /> : (
                        <>
                            <span>{isLogin ? 'Access Hub' : 'Initialize Profile'}</span>
                            <ChevronRight size={18} style={{ marginLeft: 'auto' }} />
                        </>
                    )}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--neural-indigo)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        textDecoration: 'none'
                    }}
                >
                    {isLogin
                        ? 'Have an invite code? Initialize Profile'
                        : 'Existing Identity? Access Hub'}
                </button>
            </div>
        </div>
    );
}

