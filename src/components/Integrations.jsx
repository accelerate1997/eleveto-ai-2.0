import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Settings, Calendar, Video, Plug, CheckCircle, ExternalLink, RefreshCw, MessageSquare } from 'lucide-react';

export default function Integrations() {
    // Mock state for connection statuses until backend is ready
    const [connections, setConnections] = useState({
        google_calendar: {
            isConnected: false,
            email: null,
            lastSynced: null
        },
        google_meet: {
            isConnected: false,
            email: null
        },
        cal_com: {
            isConnected: false,
            username: null
        },
        whatsapp: {
            isConnected: false,
            instanceName: null,
            lastSynced: null
        }
    });

    const [calApiKeyInput, setCalApiKeyInput] = useState('');
    const [showCalModal, setShowCalModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappQr, setWhatsappQr] = useState(null);
    const [whatsappStatus, setWhatsappStatus] = useState('DISCONNECTED');

    const [isConnecting, setIsConnecting] = useState(null); // stores which provider is currently connecting

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = pb.authStore.model?.id;
                if (userId) {
                    const user = await pb.collection('users').getOne(userId, {
                        '$autoCancel': false
                    });
                    if (user?.cal_api_key) {
                        setConnections(prev => ({
                            ...prev,
                            cal_com: {
                                isConnected: true,
                                username: 'Linked'
                            }
                        }));
                        setCalApiKeyInput(user.cal_api_key);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch user integrations:", err);
            }
        };
        fetchUserData();
    }, []);

    const handleConnect = (provider) => {
        if (provider === 'cal_com') {
            setShowCalModal(true);
            return;
        }
        setIsConnecting(provider);

        // Simulate OAuth flow delay
        setTimeout(() => {
            setConnections(prev => ({
                ...prev,
                [provider]: {
                    isConnected: true,
                    email: 'user@example.com',
                    lastSynced: new Date().toISOString()
                }
            }));
            setIsConnecting(null);
        }, 1500);
    };

    const handleCalSubmit = async (e) => {
        e.preventDefault();
        setIsConnecting('cal_com');

        console.log("Integrations: Saving Cal.com API Key...");

        try {
            const userId = pb.authStore.model?.id;
            if (userId) {
                await pb.collection('users').update(userId, {
                    cal_api_key: calApiKeyInput.trim()
                });
                console.log("Integrations: Saved API Key successfully");
            }

            setConnections(prev => ({
                ...prev,
                cal_com: {
                    isConnected: true,
                    username: 'Linked with API Key'
                }
            }));
            setShowCalModal(false);
            alert("Cal.com API Key linked successfully!");
        } catch (err) {
            console.error("Integrations: Save failed:", err);
            alert('Failed to connect Cal.com: ' + err.message);
        } finally {
            setIsConnecting(null);
        }
    };

    const handleWhatsAppConnect = async () => {
        setIsConnecting('whatsapp');
        setShowWhatsAppModal(true);
        setWhatsappQr(null);

        try {
            const userId = pb.authStore.model?.id;
            const instanceName = `Eleveto_${userId || 'Global'}`;

            const response = await fetch('http://localhost:3001/api/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName })
            });

            const data = await response.json();

            if (data.success) {
                if (data.qr) {
                    setWhatsappQr(data.qr);
                    setWhatsappStatus('AWAITING_SCAN');
                } else if (data.connected) {
                    setConnections(prev => ({
                        ...prev,
                        whatsapp: {
                            isConnected: true,
                            instanceName: data.instanceName,
                            lastSynced: new Date().toISOString()
                        }
                    }));
                    setWhatsappStatus('CONNECTED');
                } else if (data.mock) {
                    alert("Evolution API not configured. Showing mock connection.");
                    setConnections(prev => ({
                        ...prev,
                        whatsapp: {
                            isConnected: true,
                            instanceName: 'Mock_Instance',
                            lastSynced: new Date().toISOString()
                        }
                    }));
                    setShowWhatsAppModal(false);
                }
            } else {
                alert('Failed to connect WhatsApp: ' + (data.error || 'Unknown error'));
                setShowWhatsAppModal(false);
            }
        } catch (err) {
            console.error("WhatsApp Connection failed:", err);
            alert('Failed to connect to WhatsApp service.');
            setShowWhatsAppModal(false);
        } finally {
            setIsConnecting(null);
        }
    };

    const handleDisconnect = async (provider) => {
        if (window.confirm('Are you sure you want to disconnect this integration?')) {
            if (provider === 'cal_com') {
                try {
                    const userId = pb.authStore.model?.id;
                    if (userId) {
                        await pb.collection('users').update(userId, {
                            cal_username: ''
                        });
                    }
                } catch (err) {
                    console.error('Failed to clear cal_username:', err);
                }
            }
            setConnections(prev => ({
                ...prev,
                [provider]: {
                    isConnected: false,
                    email: null,
                    lastSynced: null,
                    username: null
                }
            }));
        }
    };

    return (
        <div className="dashboard-view" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header className="dashboard-header">
                <div>
                    <h1>Integrations</h1>
                    <p className="subtitle" style={{ textAlign: 'left', margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>
                        Connect your favorite tools and automate your workflow.
                    </p>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* ── Google Workspace Section ── */}
                <section>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '18px', background: 'var(--primary-indigo)', borderRadius: '4px' }}></div>
                        Google Workspace
                    </h2>

                    <div className="integrations-grid">

                        {/* Google Calendar Card */}
                        <IntegrationCard
                            title="Google Calendar"
                            description="Two-way sync for your meetings, calls, and events directly with your ElevetoAi bookings."
                            icon={<Calendar size={24} color="#ea4335" />}
                            connected={connections.google_calendar.isConnected}
                            email={connections.google_calendar.email}
                            lastSynced={connections.google_calendar.lastSynced}
                            isConnecting={isConnecting === 'google_calendar'}
                            onConnect={() => handleConnect('google_calendar')}
                            onDisconnect={() => handleDisconnect('google_calendar')}
                            color="#ea4335"
                        />

                        {/* Google Meet Card */}
                        <IntegrationCard
                            title="Google Meet"
                            description="Automatically generate video conferencing links for all scheduled bookings."
                            icon={<Video size={24} color="#0f9d58" />}
                            connected={connections.google_meet.isConnected}
                            email={connections.google_meet.email}
                            lastSynced={null}
                            isConnecting={isConnecting === 'google_meet'}
                            onConnect={() => handleConnect('google_meet')}
                            onDisconnect={() => handleDisconnect('google_meet')}
                            color="#0f9d58"
                        />

                        {/* Cal.com Card */}
                        <IntegrationCard
                            title="Cal.com"
                            description="Embed your Cal.com scheduling page directly and sync bookings."
                            icon={<Calendar size={24} color="#111827" />}
                            connected={connections.cal_com.isConnected}
                            email={connections.cal_com.username}
                            lastSynced={null}
                            isConnecting={isConnecting === 'cal_com'}
                            onConnect={() => handleConnect('cal_com')}
                            onDisconnect={() => handleDisconnect('cal_com')}
                            color="#111827"
                        />

                        {/* WhatsApp Card */}
                        <IntegrationCard
                            title="WhatsApp Business"
                            description="Connect your WhatsApp via Evolution API to automate client communication and follow-ups."
                            icon={<MessageSquare size={24} color="#25D366" />}
                            connected={connections.whatsapp.isConnected}
                            email={connections.whatsapp.instanceName}
                            lastSynced={connections.whatsapp.lastSynced}
                            isConnecting={isConnecting === 'whatsapp'}
                            onConnect={handleWhatsAppConnect}
                            onDisconnect={() => handleDisconnect('whatsapp')}
                            color="#25D366"
                        />

                    </div>
                </section>

                {/* Placeholder for future sections (e.g., Zoom, Slack) */}
                <section style={{ opacity: 0.8, marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '18px', background: 'var(--slate-300)', borderRadius: '4px' }}></div>
                        Coming Soon
                    </h2>
                    <div className="integrations-grid">
                        <div style={{ border: '2px dashed var(--slate-200)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', background: 'var(--neural-bg)', color: 'var(--text-muted)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Zoom Integration</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>Video Conferencing</div>
                        </div>
                        <div style={{ border: '2px dashed var(--slate-200)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', background: 'var(--neural-bg)', color: 'var(--text-muted)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Slack Integration</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>Notifications & Alerts</div>
                        </div>
                    </div>
                </section>

                {showCalModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '2rem'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Connect Cal.com</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Enter your Cal.com API Key to sync your real bookings and schedule meetings.
                            </p>
                            <form onSubmit={handleCalSubmit}>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        Cal.com API Key
                                    </label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="cal_live_..."
                                        value={calApiKeyInput}
                                        onChange={e => setCalApiKeyInput(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.08)', background: 'var(--neural-bg)',
                                            fontSize: '1rem', outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-indigo)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Find this in Cal.com &rarr; Settings &rarr; API Keys
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCalModal(false)}
                                        style={{
                                            flex: 1, padding: '0.875rem', borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.08)', background: 'white',
                                            fontWeight: 700, cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1, padding: '0.875rem', borderRadius: '12px',
                                            border: 'none', background: 'var(--gradient-indigo)',
                                            color: 'white', fontWeight: 700, cursor: 'pointer',
                                            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)'
                                        }}
                                    >
                                        {isConnecting ? 'Linking...' : 'Link API Key'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showWhatsAppModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '450px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '2rem',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Connect WhatsApp</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Scan the QR code below with your WhatsApp mobile app to link your account.
                            </p>

                            <div style={{ 
                                background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '16px', 
                                padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                minHeight: '250px', marginBottom: '1.5rem', position: 'relative'
                            }}>
                                {whatsappQr ? (
                                    <img src={whatsappQr} alt="WhatsApp QR Code" style={{ width: '100%', maxWidth: '200px' }} />
                                ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        {isConnecting === 'whatsapp' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }} />
                                                <span>Generating QR...</span>
                                            </div>
                                        ) : (
                                            "No QR code available."
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: whatsappQr ? '#fbbf24' : '#94a3b8' }}></div>
                                    {whatsappQr ? "Awaiting scan..." : "Initializing..."}
                                </div>
                                <button
                                    onClick={() => setShowWhatsAppModal(false)}
                                    style={{
                                        width: '100%', padding: '0.875rem', borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.08)', background: 'white',
                                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--neural-bg)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ── Integration Card Subcomponent ──────────────────────────────────────────
function IntegrationCard({ title, description, icon, connected, email, lastSynced, isConnecting, onConnect, onDisconnect, color }) {
    return (
        <div style={{
            background: 'white',
            border: `1px solid ${connected ? color + '40' : 'rgba(0, 0, 0, 0.05)'}`,
            borderRadius: '24px',
            padding: '1.75rem',
            boxShadow: connected ? `0 12px 24px ${color}10` : '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            color: 'var(--text-primary)'
        }}>
            {/* Top color bar if connected */}
            {connected && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }} />
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: `1px solid ${color}20`
                }}>
                    {icon}
                </div>
                <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {title}
                        {connected && <CheckCircle size={18} color={color} fill={`${color}20`} />}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {description}
                    </p>
                </div>
            </div>

            {connected && email && (
                <div style={{ background: 'var(--neural-bg)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600 }}>Connected Account:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{email}</span>
                    </div>
                    {lastSynced && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Last Synced:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(lastSynced).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {connected ? (
                    <>
                        <button
                            onClick={onDisconnect}
                            style={{
                                flex: 1, padding: '0.75rem', border: '1px solid var(--slate-200)', background: 'white',
                                borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.875rem',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-rose)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--danger-rose)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--slate-200)'; }}
                        >
                            Disconnect
                        </button>
                        <button
                            style={{
                                flex: 1, padding: '0.75rem', border: 'none', background: 'var(--neural-bg)',
                                borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}
                        >
                            Manage <ExternalLink size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onConnect}
                        disabled={isConnecting}
                        style={{
                            width: '100%', padding: '0.875rem', border: 'none', background: color,
                            borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '0.9rem',
                            cursor: isConnecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: isConnecting ? 0.8 : 1, transition: 'all 0.3s',
                            boxShadow: `0 10px 20px ${color}30`
                        }}
                    >
                        {isConnecting ? (
                            <><RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Connecting...</>
                        ) : (
                            `Connect ${title}`
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
