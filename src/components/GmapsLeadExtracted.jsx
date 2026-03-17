import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import {
    MapPin, Star, Users, Phone, ExternalLink, RefreshCw,
    Kanban, Download, Trash2, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

export default function GmapsLeadExtracted() {
    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'pipeline' | 'not'

    const fetchLeads = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch leads that were sourced from Google Maps
            const records = await pb.collection('leads').getFullList({
                sort: '-created',
                filter: `source = "Google Maps"`,
                expand: 'created_by',
                '$autoCancel': false,
            });
            setLeads(records);
        } catch (err) {
            // If filter field doesn't exist yet, fall back to all leads
            if (err?.status === 400) {
                try {
                    const records = await pb.collection('leads').getFullList({
                        sort: '-created',
                        '$autoCancel': false,
                    });
                    // Filter client-side for leads with a Google Maps link
                    setLeads(records.filter(l => l.source === 'Google Maps' || l.google?.includes('google.com/maps')));
                } catch (e2) {
                    setError(e2.message);
                }
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Remove this lead from your records?')) return;
        setDeletingId(id);
        try {
            await pb.collection('leads').delete(id);
            setLeads(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const exportCSV = () => {
        const headers = ['Name', 'Phone', 'Rating', 'Reviews', 'Maps Link', 'Status', 'Extracted On'];
        const rows = leads.map(l => [
            `"${(l.name || '').replace(/"/g, '""')}"`,
            l.whatsapp || '',
            l.rating || '',
            l.reviews || '',
            l.google || '',
            l.status || '',
            new Date(l.created).toLocaleDateString(),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gmaps_extracted_leads.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredLeads = leads.filter(l => {
        if (filter === 'pipeline') return l.status && l.status !== 'Lead';
        if (filter === 'not') return !l.status || l.status === 'Lead';
        return true;
    });

    // ── Loading ──
    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--neural-indigo)' }} />
            <span style={{ fontWeight: 600 }}>Loading extracted leads…</span>
        </div>
    );

    return (
        <div>
            <header className="dashboard-header">
                <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Maps Extraction</h1>
                        <p className="subtitle" style={{ textAlign: 'left', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>
                           Found {leads.length} neural entities in your region
                        </p>
                </div>

                <div className="header-actions">
                    {/* Filter pills */}
                    {['all', 'pipeline', 'not'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '12px',
                                border: `1px solid ${filter === f ? 'var(--primary-indigo)' : 'rgba(0,0,0,0.05)'}`,
                                background: filter === f ? 'var(--neural-bg)' : 'white',
                                color: filter === f ? 'var(--primary-indigo)' : 'var(--text-secondary)',
                                fontWeight: 700, fontSize: '0.8rem',
                                cursor: 'pointer', transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                                boxShadow: filter === f ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
                            }}
                        >
                            {f === 'all' ? `All (${leads.length})` : f === 'pipeline' ? 'Active' : 'Archived'}
                        </button>
                    ))}

                    <button
                        onClick={fetchLeads}
                        title="Refresh"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.5rem', background: '#f8fafc',
                            border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
                            cursor: 'pointer', color: 'var(--slate-600)', transition: 'all 0.2s',
                        }}
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        onClick={exportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.5rem 1rem', background: '#f8fafc',
                            border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            color: 'var(--text-dark)', transition: 'all 0.2s',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </header>

            {/* Error */}
            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '1rem 1.25rem', color: '#dc2626', marginBottom: '1.5rem', fontSize: '0.87rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Empty State */}
            {filteredLeads.length === 0 && !error && (
                <div style={{
                    background: 'white', border: '1px solid rgba(0,0,0,0.05)',
                    borderRadius: '24px', padding: '5rem 2rem',
                    textAlign: 'center', color: 'var(--text-muted)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                }}>
                    <MapPin size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: '#10b981' }} />
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Google Maps leads yet</p>
                    <p style={{ fontSize: '0.87rem', opacity: 0.7 }}>
                        Run a scrape in the <strong>Google Maps</strong> tab and click "Add to Pipeline" to see leads here.
                    </p>
                </div>
            )}

            {/* Table */}
            {filteredLeads.length > 0 && (
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(99,102,241,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    {['Business Name', 'Phone', 'Rating', 'Reviews', 'Extracted By', 'Pipeline Status', 'Maps', 'Extracted', 'Action'].map(h => (
                                        <th key={h} style={{
                                            padding: '1rem', textAlign: 'left',
                                            fontSize: '0.68rem', fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '0.1em',
                                            color: 'var(--neural-indigo)', opacity: 0.8,
                                            whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => {
                                    const inPipeline = lead.status && lead.status !== 'Lead';
                                    return (
                                        <tr key={lead.id}
                                            style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Name */}
                                            <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-dark)', maxWidth: '200px' }}>
                                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {lead.name || '—'}
                                                </span>
                                            </td>

                                            {/* Phone */}
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {lead.whatsapp ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={13} /> {lead.whatsapp}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            {/* Rating */}
                                            <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                                                {lead.rating ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 700 }}>
                                                        <Star size={13} fill="#f59e0b" /> {lead.rating}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            {/* Reviews */}
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                                                {lead.reviews ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Users size={13} /> {lead.reviews}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            {/* Extracted By */}
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--neural-indigo)', fontWeight: 700, fontSize: '0.75rem' }}>
                                                {lead.expand?.created_by?.name || lead.expand?.created_by?.username || '—'}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                                    background: inPipeline ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                                                    color: inPipeline ? '#10b981' : 'var(--neural-indigo)',
                                                    border: `1px solid ${inPipeline ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)'}`,
                                                }}>
                                                    {inPipeline ? <CheckCircle size={11} /> : <Kanban size={11} />}
                                                    {lead.status || 'Lead'}
                                                </span>
                                            </td>

                                            {/* Maps Link */}
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                {lead.google ? (
                                                    <a href={lead.google} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: 'var(--neural-indigo)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                        <ExternalLink size={13} /> View
                                                    </a>
                                                ) : '—'}
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {new Date(lead.created).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>

                                            {/* Delete */}
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    disabled={deletingId === lead.id}
                                                    title="Remove lead"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '32px', height: '32px',
                                                        background: 'transparent',
                                                        border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px',
                                                        color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                                                >
                                                    {deletingId === lead.id
                                                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                        : <Trash2 size={14} />
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
            )}
        </div>
    );
}
