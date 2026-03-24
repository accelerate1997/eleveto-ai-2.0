import React, { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { X, Plus, Eye, EyeOff, Trash2, Key, Globe, User, Lock, Cpu, Link2 } from 'lucide-react';

const EMPTY_FORM = {
    platform_name: '',
    platform_id: '',
    password: '',
    api_keys: '',
    platform_url: '',
};

export default function CredentialsModal({ client, onClose }) {
    const [credentials, setCredentials] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revealedIds, setRevealedIds] = useState({});
    const [error, setError] = useState('');

    const fetchCredentials = useCallback(async () => {
        try {
            const records = await pb.collection('client_credentials').getFullList({
                filter: `client_id = "${client.id}"`,
                sort: '-created',
            });
            setCredentials(records);
        } catch (err) {
            console.error('Error fetching credentials:', err);
        } finally {
            setLoading(false);
        }
    }, [client.id]);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    // Close on overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.platform_name.trim()) {
            setError('Platform name is required.');
            return;
        }
        setError('');
        setSaving(true);
        try {
            const record = await pb.collection('client_credentials').create({
                client_id: client.id,
                ...form,
            });
            setCredentials([record, ...credentials]);
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (err) {
            setError('Failed to save credentials. Please try again.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await pb.collection('client_credentials').delete(id);
            setCredentials(credentials.filter(c => c.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const toggleReveal = (id) => {
        setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const platformColors = [
        '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444',
    ];
    const getColor = (name) => {
        const idx = name ? name.charCodeAt(0) % platformColors.length : 0;
        return platformColors[idx];
    };

    return (
        <div
            onClick={handleOverlayClick}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000, padding: '1.5rem',
            }}
        >
            <div style={{
                background: 'white',
                borderRadius: '28px',
                width: '100%',
                maxWidth: '660px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 40px 80px -20px rgba(99,102,241,0.25)',
                border: '1px solid rgba(99,102,241,0.08)',
                position: 'relative',
            }}>
                {/* Header */}
                <div style={{
                    padding: '2rem 2rem 1.25rem',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    position: 'sticky', top: 0, background: 'white', zIndex: 10,
                    borderRadius: '28px 28px 0 0',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '1.25rem', right: '1.25rem',
                            background: '#f1f5f9', border: 'none', borderRadius: '50%',
                            width: '36px', height: '36px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#64748b', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                        }}>
                            <Key size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>
                                Credentials Vault
                            </h2>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                                {client.name} — {credentials.length} stored platform{credentials.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    {/* Add Credential Button */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                width: '100%', padding: '0.85rem',
                                background: 'linear-gradient(135deg, #6366f118, #3b82f610)',
                                border: '2px dashed rgba(99,102,241,0.3)',
                                borderRadius: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                color: '#6366f1', fontWeight: 700, fontSize: '0.9rem',
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                marginBottom: '1.5rem',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366f125, #3b82f618)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366f118, #3b82f610)'; }}
                        >
                            <Plus size={18} /> Add New Credentials
                        </button>
                    )}

                    {/* Credential Form */}
                    {showForm && (
                        <form onSubmit={handleSave} style={{
                            background: 'rgba(99,102,241,0.03)',
                            border: '1px solid rgba(99,102,241,0.12)',
                            borderRadius: '18px', padding: '1.5rem',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
                                    New Platform Credentials
                                </h3>
                                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Grid of fields */}
                            <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <CredField icon={<Globe size={14} />} label="Platform Name *" name="platform_name"
                                    value={form.platform_name} onChange={handleChange} placeholder="e.g. Facebook Ads" />
                                <CredField icon={<User size={14} />} label="Login ID / Email" name="platform_id"
                                    value={form.platform_id} onChange={handleChange} placeholder="username or email" />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <CredField icon={<Lock size={14} />} label="Password" name="password" type="password"
                                    value={form.password} onChange={handleChange} placeholder="••••••••" />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>
                                    <Cpu size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                                    API Keys
                                </label>
                                <textarea
                                    name="api_keys"
                                    value={form.api_keys}
                                    onChange={handleChange}
                                    placeholder="Paste API keys, tokens, secrets..."
                                    rows={3}
                                    style={{
                                        width: '100%', background: '#fff', border: '1px solid #e2e8f0',
                                        borderRadius: '12px', padding: '0.75rem 1rem',
                                        fontSize: '0.875rem', fontFamily: 'Inter, sans-serif',
                                        resize: 'vertical', color: '#0f172a', transition: 'all 0.2s',
                                        outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <CredField icon={<Link2 size={14} />} label="Platform URL" name="platform_url"
                                    value={form.platform_url} onChange={handleChange} placeholder="https://..." />
                            </div>

                            {error && (
                                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>{error}</div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}
                                    style={{
                                        flex: 1, padding: '0.75rem', background: '#f1f5f9',
                                        border: 'none', borderRadius: '12px', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '0.875rem', color: '#475569',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        flex: 2, padding: '0.75rem',
                                        background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                        border: 'none', borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer',
                                        fontWeight: 700, fontSize: '0.875rem', color: 'white',
                                        fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px',
                                        boxShadow: saving ? 'none' : '0 8px 16px rgba(99,102,241,0.25)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {saving ? 'Saving…' : <><Plus size={16} /> Save Credentials</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Credentials List */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading…</div>
                    ) : credentials.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '3rem 1rem',
                            background: '#fafafa', borderRadius: '16px',
                            border: '1px dashed #e2e8f0',
                        }}>
                            <Key size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
                            <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>No credentials stored yet</p>
                            <p style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Click "Add New Credentials" above to get started</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {credentials.map(cred => {
                                const color = getColor(cred.platform_name);
                                const revealed = revealedIds[cred.id];
                                return (
                                    <div key={cred.id} style={{
                                        background: 'white', border: '1px solid rgba(0,0,0,0.06)',
                                        borderRadius: '18px', padding: '1.25rem',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'all 0.2s',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${color}18`; e.currentTarget.style.borderColor = color + '30'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                                    >
                                        {/* Platform header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '38px', height: '38px', borderRadius: '12px',
                                                    background: `linear-gradient(135deg, ${color}25, ${color}15)`,
                                                    border: `1px solid ${color}30`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                                                    fontSize: '1rem', color,
                                                }}>
                                                    {cred.platform_name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{cred.platform_name}</div>
                                                    {cred.platform_url && (
                                                        <a href={cred.platform_url} target="_blank" rel="noreferrer"
                                                            style={{ fontSize: '0.72rem', color, textDecoration: 'none', fontWeight: 500 }}>
                                                            {cred.platform_url.length > 40 ? cred.platform_url.slice(0, 40) + '…' : cred.platform_url}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(cred.id)}
                                                style={{
                                                    background: '#fef2f2', border: '1px solid rgba(239,68,68,0.15)',
                                                    borderRadius: '10px', padding: '6px', cursor: 'pointer',
                                                    color: '#ef4444', display: 'flex', alignItems: 'center',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                                                title="Delete credential"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Credential fields */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                            {cred.platform_id && (
                                                <CredPill icon={<User size={12} />} label="Login ID" value={cred.platform_id} color={color} />
                                            )}
                                            {cred.password && (
                                                <div style={{
                                                    background: '#fafafa', borderRadius: '10px', padding: '0.5rem 0.75rem',
                                                    border: '1px solid #f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                        <Lock size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Password</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#0f172a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {revealed ? cred.password : '••••••••'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleReveal(cred.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, padding: '2px' }}
                                                        title={revealed ? 'Hide' : 'Reveal'}
                                                    >
                                                        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {cred.api_keys && (
                                            <div style={{
                                                marginTop: '0.6rem', background: '#0f172a', borderRadius: '10px',
                                                padding: '0.6rem 0.875rem',
                                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                            }}>
                                                <Cpu size={12} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                                                <pre style={{
                                                    margin: 0, fontSize: '0.72rem', color: '#a5b4fc',
                                                    fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                                    flex: 1, lineHeight: 1.6,
                                                }}>
                                                    {cred.api_keys.length > 120 ? cred.api_keys.slice(0, 120) + '…' : cred.api_keys}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Helper sub-components ──────────────────────────────────────────────────
const labelStyle = {
    display: 'block', fontSize: '0.7rem', fontWeight: 700,
    color: '#6366f1', marginBottom: '0.4rem',
    textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85,
};

function CredField({ icon, label, name, value, onChange, placeholder, type = 'text' }) {
    return (
        <div>
            <label style={labelStyle}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
                    {icon} {label}
                </span>
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    width: '100%', height: '44px', background: '#fff',
                    border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '0 1rem', fontSize: '0.875rem', color: '#0f172a',
                    outline: 'none', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
        </div>
    );
}

function CredPill({ icon, label, value }) {
    return (
        <div style={{
            background: '#fafafa', borderRadius: '10px', padding: '0.5rem 0.75rem',
            border: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden',
        }}>
            <span style={{ color: '#94a3b8', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: '0.8rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}
