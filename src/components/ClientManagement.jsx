import React, { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import CredentialsModal from './CredentialsModal';
import { Users, Key, Mail, Phone, Globe, Linkedin, CheckCircle2, Clock, Search, RefreshCw, AlertCircle } from 'lucide-react';

export default function ClientManagement() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [search, setSearch] = useState('');

    const fetchClients = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Directly query leads with status=Converted — no separate collection needed
            const records = await pb.collection('leads').getFullList({
                filter: 'status = "Converted"',
                sort: '-created',
                '$autoCancel': false,
            });
            setClients(records);
        } catch (err) {
            if (!err?.isAbort) {
                const msg = err?.data?.message || err?.message || JSON.stringify(err);
                setError('Failed to load clients: ' + msg);
                console.error('ClientManagement fetch error:', err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const filtered = clients.filter(c =>
        [c.name, c.email, c.whatsapp, c.country].some(v =>
            (v || '').toLowerCase().includes(search.toLowerCase())
        )
    );

    return (
        <div className="dashboard-view">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1>Client Management</h1>
                    <p className="subtitle" style={{ textAlign: 'left', margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>
                        Converted leads • Credential vault per client
                    </p>
                </div>
                <div className="header-actions">
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{
                            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', pointerEvents: 'none',
                        }} />
                        <input
                            type="text"
                            placeholder="Search clients…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                height: '44px', paddingLeft: '40px', paddingRight: '1rem',
                                border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px',
                                fontSize: '0.875rem', width: '240px', fontFamily: 'Inter, sans-serif',
                                background: 'white', outline: 'none', color: 'var(--text-primary)',
                                fontWeight: 500, transition: 'all 0.2s',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'var(--primary-indigo)'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.08)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={fetchClients}
                        disabled={loading}
                        className="btn-sync"
                        style={{
                            background: 'white', color: 'var(--text-primary)',
                            padding: '0 1.25rem', height: '44px',
                            borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(0, 0, 0, 0.08)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                            transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        {loading ? 'Syncing…' : 'Sync Clients'}
                    </button>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
                    color: '#ef4444', fontSize: '0.875rem', fontWeight: 500,
                }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    {error}
                </div>
            )}

            {/* Stats bar */}
            <div className="responsive-stats-grid" style={{ marginBottom: '2.5rem', display: 'flex', gap: '1rem' }}>
                {[
                    { label: 'Total Clients', value: clients.length, color: 'var(--primary-indigo)', icon: <Users size={16} /> },
                    {
                        label: 'Added This Month', value: clients.filter(c => {
                            const d = new Date(c.created);
                            const now = new Date();
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }).length, color: 'var(--success-emerald)', icon: <CheckCircle2 size={16} />
                    },
                    { label: 'Verified Contact', value: clients.filter(c => c.email || c.whatsapp).length, color: 'var(--accent-cyan)', icon: <Clock size={16} /> },
                ].map(stat => (
                    <div key={stat.label} style={{
                        flex: 1, background: 'white', borderRadius: '24px', padding: '1.5rem',
                        border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        display: 'flex', alignItems: 'center', gap: '1.25rem',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: `${stat.color}10`, border: `1px solid ${stat.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: stat.color,
                        }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content */}
            {loading ? (
                <LoadingGrid />
            ) : filtered.length === 0 ? (
                <EmptyState search={search} hasError={!!error} />
            ) : (
                <div className="cards-grid">
                    {filtered.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onOpenCredentials={() => setSelectedClient(client)}
                        />
                    ))}
                </div>
            )}

            {/* Credentials Modal */}
            {selectedClient && (
                <CredentialsModal
                    client={selectedClient}
                    onClose={() => setSelectedClient(null)}
                />
            )}
        </div>
    );
}

// ── Client Card ───────────────────────────────────────────────────────────
function ClientCard({ client, onOpenCredentials }) {
    const initials = (client.name || 'C')
        .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

    const avatarColors = [
        ['#6366f1', '#3b82f6'],
        ['#10b981', '#06b6d4'],
        ['#f59e0b', '#ef4444'],
        ['#8b5cf6', '#ec4899'],
    ];
    const colorPair = avatarColors[(client.name || '').charCodeAt(0) % avatarColors.length];

    const metaItems = [
        { icon: <Mail size={13} />, value: client.email },
        { icon: <Phone size={13} />, value: client.whatsapp },
        { icon: <Globe size={13} />, value: client.country },
        { icon: <Linkedin size={13} />, value: client.linkedin ? 'LinkedIn Profile' : null, href: client.linkedin },
    ].filter(m => m.value);

    return (
        <div style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '24px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 16px 32px ${colorPair[0]}18`;
                e.currentTarget.style.borderColor = colorPair[0] + '25';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
            }}
        >
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'white',
                    boxShadow: `0 8px 16px ${colorPair[0]}25`,
                }}>
                    {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-emerald)', boxShadow: '0 0 8px var(--success-emerald)' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--success-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Neural Partner</span>
                    </div>
                </div>
            </div>

            {/* Meta info */}
            {metaItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {metaItems.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                            <span style={{ color: '#94a3b8', flexShrink: 0 }}>{m.icon}</span>
                            {m.href ? (
                                <a href={m.href} target="_blank" rel="noreferrer" style={{ color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</a>
                            ) : (
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.04)' }} />

            {/* Credentials button */}
            <button
                onClick={onOpenCredentials}
                style={{
                    width: '100%', padding: '0.7rem',
                    background: `linear-gradient(135deg, ${colorPair[0]}15, ${colorPair[1]}10)`,
                    border: `1px solid ${colorPair[0]}25`,
                    borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: colorPair[0], fontWeight: 700, fontSize: '0.875rem',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${colorPair[0]}25, ${colorPair[1]}18)`;
                    e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${colorPair[0]}15, ${colorPair[1]}10)`;
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <Key size={16} />
                Manage Credentials
            </button>
        </div>
    );
}

// ── Empty / Loading States ─────────────────────────────────────────────────
function EmptyState({ search }) {
    return (
        <div style={{
            textAlign: 'center', padding: '5rem 2rem',
            background: 'white', borderRadius: '24px',
            border: '1px dashed #e2e8f0',
        }}>
            <div style={{
                width: '72px', height: '72px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f115, #3b82f610)',
                border: '1px solid rgba(99,102,241,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
            }}>
                <Users size={32} style={{ color: '#6366f1', opacity: 0.5 }} />
            </div>
            {search ? (
                <>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>No clients match "{search}"</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Try a different search term</p>
                </>
            ) : (
                <>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>No clients yet</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Move leads to the <strong>Converted</strong> column in your Pipeline — they will appear here automatically.
                    </p>
                </>
            )}
        </div>
    );
}

function LoadingGrid() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    background: 'white', borderRadius: '20px', padding: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.05)',
                }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#f1f5f9' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '8px', width: '60%' }} />
                            <div style={{ height: '10px', background: '#f8fafc', borderRadius: '6px', width: '40%' }} />
                        </div>
                    </div>
                    <div style={{ height: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '6px' }} />
                    <div style={{ height: '10px', background: '#f8fafc', borderRadius: '6px', width: '70%' }} />
                </div>
            ))}
        </div>
    );
}
