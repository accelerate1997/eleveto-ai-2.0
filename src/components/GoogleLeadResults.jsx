import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { ExternalLink, Phone, Star, Users, Plus, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function GoogleLeadResults({ results, searchQuery, industry }) {
    const [addedIds, setAddedIds] = useState(new Set());
    const [loadingIds, setLoadingIds] = useState(new Set());
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    if (!results || results.length === 0) {
        return (
            <div style={{
                background: 'var(--surface-white)', border: '1px solid var(--glass-border)',
                borderRadius: '24px', padding: '4rem 2rem',
                textAlign: 'center', color: 'var(--text-muted)',
                boxShadow: 'var(--shadow-premium)',
            }}>
                <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>No results found</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Try a different keyword or location</p>
            </div>
        );
    }

    const addToPipeline = async (lead) => {
        const id = lead.maps_link || lead.name;
        setLoadingIds(prev => new Set(prev).add(id));
        try {
            // Check for potential duplicates first
            let existing = null;
            if (lead.phone) {
                existing = await pb.collection('leads').getFirstListItem(`whatsapp="${lead.phone}"`).catch(() => null);
            }
            if (!existing && lead.maps_link) {
                existing = await pb.collection('leads').getFirstListItem(`google="${lead.maps_link}"`).catch(() => null);
            }

            if (existing) {
                console.log(`Lead already exists: ${existing.id}`);
                setAddedIds(prev => new Set(prev).add(id));
                return;
            }

            const payload = {
                name: lead.name || 'Unknown Business',
                status: 'Lead',
                country: 'N/A',
                source: 'Google Maps',
                created_by: pb.authStore.model?.id,
            };
            if (lead.phone) payload.whatsapp = lead.phone;
            if (lead.maps_link) payload.google = lead.maps_link;
            if (industry) payload.industry = industry;

            await pb.collection('leads').create(payload);
            setAddedIds(prev => new Set(prev).add(id));
        } catch (err) {
            console.error('Failed to add lead:', err);
            alert('Failed to add lead: ' + (err.message || 'Unknown error'));
        } finally {
            setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const addAllToPipeline = async () => {
        setIsBulkLoading(true);
        const unadded = results.filter(l => !addedIds.has(l.maps_link || l.name));
        for (const lead of unadded) {
            await addToPipeline(lead);
        }
        setIsBulkLoading(false);
    };

    const exportCSV = () => {
        const headers = ['Name', 'Rating', 'Reviews', 'Phone', 'Maps Link'];
        const rows = results.map(r => [
            `"${(r.name || '').replace(/"/g, '""')}"`,
            r.rating || '',
            r.reviews_count || '',
            r.phone || '',
            r.maps_link || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_${searchQuery.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const addedCount = addedIds.size;

    return (
        <div className="glass-card">
            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                        {results.length} Leads Found
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Query: <em>&ldquo;{searchQuery}&rdquo;</em>
                        {addedCount > 0 && <span style={{ marginLeft: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ {addedCount} added to pipeline</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={exportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.6rem 1.2rem', background: 'var(--neural-bg)',
                            border: '1px solid var(--glass-border)', borderRadius: '12px',
                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            color: 'var(--text-primary)', transition: 'all 0.2s',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        <Download size={15} /> Export CSV
                    </button>
                    <button
                        onClick={addAllToPipeline}
                        disabled={isBulkLoading || addedCount === results.length}
                        className="btn"
                        style={{
                            width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.85rem',
                            opacity: addedCount === results.length ? 0.5 : 1,
                        }}
                    >
                        {isBulkLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                        {addedCount === results.length ? 'All Added' : 'Add All to Pipeline'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                            {['Business Name', 'Rating', 'Reviews', 'Phone', 'Maps', 'Action'].map(h => (
                                <th key={h} style={{
                                    padding: '0.75rem 1rem', textAlign: 'left',
                                    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                                    letterSpacing: '0.1em', color: 'var(--primary-indigo)', opacity: 0.8,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((lead, i) => {
                            const uid = lead.maps_link || lead.name;
                            const isAdded = addedIds.has(uid);
                            const isRowLoading = loadingIds.has(uid);
                            return (
                                <tr key={i} style={{
                                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                                    transition: 'background 0.15s',
                                    background: isAdded ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.05)' : '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.03)' : 'transparent'}
                                >
                                    {/* Name */}
                                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px' }}>
                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {lead.name || '—'}
                                        </span>
                                    </td>

                                    {/* Rating */}
                                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                                        {lead.rating ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning-amber)', fontWeight: 700 }}>
                                                <Star size={13} fill="var(--warning-amber)" /> {lead.rating}
                                            </span>
                                        ) : '—'}
                                    </td>

                                    {/* Reviews */}
                                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                                        {lead.reviews_count ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={13} /> {lead.reviews_count}
                                            </span>
                                        ) : '—'}
                                    </td>

                                    {/* Phone */}
                                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {lead.phone ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={13} /> {lead.phone}
                                            </span>
                                        ) : '—'}
                                    </td>

                                    {/* Maps Link */}
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        {lead.maps_link ? (
                                            <a href={lead.maps_link} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--primary-indigo)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, textDecoration: 'none' }}>
                                                <ExternalLink size={13} /> View
                                            </a>
                                        ) : '—'}
                                    </td>

                                    {/* Action */}
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        {isAdded ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                                                <CheckCircle size={15} /> Added
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => addToPipeline(lead)}
                                                disabled={isRowLoading}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    padding: '0.4rem 0.875rem',
                                                    background: 'rgba(79, 70, 229, 0.08)',
                                                    border: '1px solid rgba(79, 70, 229, 0.15)',
                                                    borderRadius: '8px',
                                                    color: 'var(--primary-indigo)',
                                                    fontWeight: 700, fontSize: '0.8rem',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--neural-indigo)'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--neural-indigo)'; }}
                                            >
                                                {isRowLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                                                Add
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
