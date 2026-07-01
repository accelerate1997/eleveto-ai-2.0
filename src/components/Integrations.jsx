import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Settings, Calendar, Video, Plug, CheckCircle, ExternalLink, RefreshCw, MessageSquare } from 'lucide-react';

export default function Integrations() {
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
        whatsapp: {
            isConnected: false,
            instanceName: null,
            lastSynced: null
        }
    });

    const [googleMeetInput, setGoogleMeetInput] = useState('');
    const [showMeetModal, setShowMeetModal] = useState(false);
    
    // Google OAuth credentials state
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleClientSecret, setGoogleClientSecret] = useState('');
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappQr, setWhatsappQr] = useState(null);
    const [whatsappStatus, setWhatsappStatus] = useState('DISCONNECTED');

    const [isConnecting, setIsConnecting] = useState(null); // stores which provider is currently connecting

    // Load initial user settings
    const fetchUserData = async () => {
        try {
            const userId = pb.authStore.model?.id;
            if (userId) {
                const user = await pb.collection('users').getOne(userId, {
                    '$autoCancel': false
                });
                setCurrentUser(user);
                
                if (user?.google_client_id) {
                    setGoogleClientId(user.google_client_id);
                    setGoogleClientSecret(user.google_client_secret || '••••••••••••••••');
                }

                // If Google Calendar is linked (has a refresh token)
                if (user?.google_refresh_token) {
                    setConnections(prev => ({
                        ...prev,
                        google_calendar: {
                            isConnected: true,
                            email: user.google_meet_link || 'Connected Account',
                            lastSynced: user.google_token_expiry
                        },
                        google_meet: {
                            isConnected: true,
                            email: user.google_meet_link || 'Connected Account'
                        }
                    }));
                } else if (user?.google_meet_link) {
                    // Fallback to static link if present but not fully OAuth'ed
                    setGoogleMeetInput(user.google_meet_link);
                    setConnections(prev => ({
                        ...prev,
                        google_meet: {
                            isConnected: true,
                            email: user.google_meet_link
                        }
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch user integrations:", err);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // Intercept Google OAuth Callback Code
    useEffect(() => {
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
                // Clear code parameter from URL so page refreshes don't re-trigger it
                window.history.replaceState({}, document.title, window.location.pathname);
                
                setIsConnecting('google_calendar');
                try {
                    const redirectUri = window.location.origin + '/';
                    console.log(`[Integrations] Completing Google handshake with redirect: ${redirectUri}`);
                    
                    const response = await fetch('/api/integrations/google/connect', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${pb.authStore.token}`
                        },
                        body: JSON.stringify({ code, redirectUri })
                    });
                    
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setConnections(prev => ({
                            ...prev,
                            google_calendar: {
                                isConnected: true,
                                email: data.email,
                                lastSynced: new Date().toISOString()
                            },
                            google_meet: {
                                isConnected: true,
                                email: data.email
                            }
                        }));
                        alert(`Successfully connected Google Calendar/Meet: ${data.email}`);
                        await fetchUserData(); // reload user
                    } else {
                        throw new Error(data.error || 'Google connection failed');
                    }
                } catch (err) {
                    console.error("Google OAuth handshake failed:", err);
                    alert("Failed to connect Google Calendar: " + err.message);
                } finally {
                    setIsConnecting(null);
                }
            }
        };
        handleOAuthCallback();
    }, []);

    const handleConnect = (provider) => {
        if (provider === 'google_meet') {
            setShowMeetModal(true);
            return;
        }

        if (provider === 'google_calendar') {
            // Check if user has saved credentials
            const hasCredentials = currentUser?.google_client_id || googleClientId;
            if (!hasCredentials) {
                setShowCredentialsModal(true);
            } else {
                // Start OAuth Redirection
                initiateGoogleOAuth();
            }
            return;
        }

        setIsConnecting(provider);
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

    const initiateGoogleOAuth = () => {
        const clientId = currentUser?.google_client_id || googleClientId;
        const redirectUri = window.location.origin + '/';
        const scope = 'https://www.googleapis.com/auth/calendar.events';
        
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
            `client_id=${encodeURIComponent(clientId)}&` + 
            `redirect_uri=${encodeURIComponent(redirectUri)}&` + 
            `response_type=code&` + 
            `scope=${encodeURIComponent(scope)}&` + 
            `access_type=offline&` + 
            `prompt=consent`;

        console.log(`[Google OAuth] Redirecting to: ${oauthUrl}`);
        window.location.href = oauthUrl;
    };

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setIsConnecting('google_calendar');
        try {
            const response = await fetch('/api/integrations/google/save-credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({
                    clientId: googleClientId,
                    clientSecret: googleClientSecret
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                alert("Google Client Credentials saved successfully!");
                setShowCredentialsModal(false);
                await fetchUserData(); // reload user
                
                // Immediately kick-off OAuth flow
                initiateGoogleOAuth();
            } else {
                throw new Error(data.error || 'Failed to save credentials');
            }
        } catch (err) {
            console.error("Save credentials failed:", err);
            alert("Error saving credentials: " + err.message);
        } finally {
            setIsConnecting(null);
        }
    };

    const handleMeetSubmit = async (e) => {
        e.preventDefault();
        setIsConnecting('google_meet');

        console.log("Integrations: Saving Google Meet link...");

        try {
            const userId = pb.authStore.model?.id;
            if (userId) {
                await pb.collection('users').update(userId, {
                    google_meet_link: googleMeetInput.trim()
                });
                console.log("Integrations: Saved Google Meet link successfully");
            }

            setConnections(prev => ({
                ...prev,
                google_meet: {
                    isConnected: !!googleMeetInput.trim(),
                    email: googleMeetInput.trim()
                }
            }));
            setShowMeetModal(false);
            alert("Google Meet link linked successfully!");
        } catch (err) {
            console.error("Integrations: Save failed:", err);
            alert('Failed to connect Google Meet: ' + err.message);
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

            const response = await fetch('/api/whatsapp/connect', {
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
            setIsConnecting(provider);
            try {
                if (provider === 'google_calendar' || provider === 'google_meet') {
                    const response = await fetch('/api/integrations/google/disconnect', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${pb.authStore.token}`
                        }
                    });
                    if (response.ok) {
                        setGoogleMeetInput('');
                        setConnections(prev => ({
                            ...prev,
                            google_calendar: {
                                isConnected: false,
                                email: null,
                                lastSynced: null
                            },
                            google_meet: {
                                isConnected: false,
                                email: null
                            }
                        }));
                        alert("Google account disconnected successfully.");
                        await fetchUserData(); // reload user
                    } else {
                        const err = await response.json();
                        throw new Error(err.error || 'Disconnect failed');
                    }
                }
            } catch (err) {
                console.error(`Failed to clear ${provider} integration:`, err);
                alert(`Failed to disconnect: ${err.message}`);
            } finally {
                setIsConnecting(null);
            }
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

                {showMeetModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '450px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '2rem'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Connect Google Meet</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Enter your personal Google Meet URL to automatically host client meetings in your personal meeting room.
                            </p>
                            <form onSubmit={handleMeetSubmit}>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        Personal Google Meet URL
                                    </label>
                                    <input
                                        required
                                        type="url"
                                        placeholder="https://meet.google.com/abc-defg-hij"
                                        value={googleMeetInput}
                                        onChange={e => setGoogleMeetInput(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.08)', background: 'var(--neural-bg)',
                                            fontSize: '1rem', outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-indigo)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowMeetModal(false)}
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
                                        {isConnecting ? 'Saving...' : 'Save Link'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showCredentialsModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '2rem'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Configure Google OAuth</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                                Enter your Google Cloud Client Credentials. Ensure your App's Authorized Redirect URIs in Google Cloud Console include: <code style={{ background: 'var(--neural-bg)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>{window.location.origin}/</code>
                            </p>
                            <form onSubmit={handleCredentialsSubmit}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        Google Client ID
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="123456789-abc.apps.googleusercontent.com"
                                        value={googleClientId}
                                        onChange={e => setGoogleClientId(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.08)', background: 'var(--neural-bg)',
                                            fontSize: '0.9rem', outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-indigo)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        Google Client Secret
                                    </label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="GOCSPX-..."
                                        value={googleClientSecret}
                                        onChange={e => setGoogleClientSecret(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.875rem', borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.08)', background: 'var(--neural-bg)',
                                            fontSize: '0.9rem', outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-indigo)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCredentialsModal(false)}
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
                                        {isConnecting === 'google_calendar' ? 'Saving...' : 'Save & Link'}
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
