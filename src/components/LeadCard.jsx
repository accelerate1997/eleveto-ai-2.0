import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MapPin, MessageSquare, Linkedin, Globe, ChevronDown, Loader2, Phone, TrendingUp, Briefcase } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import LeadDetailModal from './LeadDetailModal';

const STATUSES = [
    'Lead',
    'Qualified',
    'Contacted',
    'Meeting Booked',
    'Follow Up',
    'Converted',
    'Non Converted',
];

const STATUS_COLORS = {
    'Lead': { bg: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5', border: 'rgba(79, 70, 229, 0.1)' },
    'Qualified': { bg: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
    'Contacted': { bg: 'rgba(8, 145, 178, 0.05)', color: '#0891b2', border: 'rgba(8, 145, 178, 0.1)' },
    'Meeting Booked': { bg: 'rgba(147, 51, 234, 0.05)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.1)' },
    'Follow Up': { bg: 'rgba(217, 119, 6, 0.05)', color: '#d97706', border: 'rgba(217, 119, 6, 0.1)' },
    'Converted': { bg: 'rgba(5, 150, 105, 0.05)', color: '#059669', border: 'rgba(5, 150, 105, 0.1)' },
    'Non Converted': { bg: 'rgba(225, 29, 72, 0.05)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.1)' },
};

export default function LeadCard({ lead, index, onUpdated, onDeleted }) {
    const [showModal, setShowModal] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(lead.status || 'Lead');
    const [followupDate, setFollowupDate] = useState(lead.followup_date ? lead.followup_date.split(' ')[0] : '');
    const [isSavingDate, setIsSavingDate] = useState(false);

    const handleStatusChange = async (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        setCurrentStatus(newStatus);
        setIsChanging(true);
        try {
            const updated = await pb.collection('leads').update(lead.id, { status: newStatus });
            onUpdated?.(updated);
        } catch (err) {
            setCurrentStatus(lead.status || 'Lead');
            console.error('Status update failed:', err);
        } finally {
            setIsChanging(false);
        }
    };

    const handleDateChange = async (e) => {
        e.stopPropagation();
        const date = e.target.value;
        setFollowupDate(date);
        setIsSavingDate(true);
        try {
            const updated = await pb.collection('leads').update(lead.id, { followup_date: date });
            onUpdated?.(updated);
        } catch (err) {
            console.error('Follow-up date update failed:', err);
        } finally {
            setIsSavingDate(false);
        }
    };

    const colors = STATUS_COLORS[currentStatus] || STATUS_COLORS['Lead'];

    return (
        <Draggable draggableId={lead.id} index={index}>
            {(provided, snapshot) => (
                <>
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => !snapshot.isDragging && setShowModal(true)}
                        style={{
                            ...provided.draggableProps.style,
                            marginBottom: '8px',
                            position: 'relative',
                            zIndex: snapshot.isDragging ? 9999 : 'auto',
                        }}
                    >
                        <div className={`lead-card ${snapshot.isDragging ? 'dragging' : ''}`}>
                            {/* Name */}
                            <div className="lead-name">
                                {lead.name}
                            </div>
 
                            {/* Creator Name */}
                            {lead.expand?.created_by && (
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--primary-indigo)',
                                    fontWeight: 700,
                                    marginBottom: '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-indigo)', opacity: 0.6 }}></div>
                                    {lead.expand.created_by.name || lead.expand.created_by.username || 'System Agent'}
                                </div>
                            )}
 
                            {/* Country & Investment */}
                            {(lead.country || lead.investment) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.75rem' }}>
                                    {lead.country && lead.country !== 'N/A' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{lead.country}</span>
                                        </div>
                                    )}
                                    {lead.industry && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Briefcase size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{lead.industry}</span>
                                        </div>
                                    )}
                                    {lead.investment && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <TrendingUp size={10} style={{ color: 'var(--primary-indigo)', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--primary-indigo)', fontWeight: 700 }}>{lead.investment}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Dropdown */}
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{ position: 'relative', marginBottom: '0.5rem' }}
                            >
                                <select
                                    value={currentStatus}
                                    onChange={handleStatusChange}
                                    disabled={isChanging}
                                    style={{
                                        width: '100%',
                                        padding: '4px 26px 4px 8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        fontFamily: 'Inter, sans-serif',
                                        background: colors.bg,
                                        color: colors.color,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        cursor: isChanging ? 'wait' : 'pointer',
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        outline: 'none',
                                    }}
                                >
                                    {STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    {isChanging
                                        ? <Loader2 size={10} style={{ color: colors.color, animation: 'spin 1s linear infinite' }} />
                                        : <ChevronDown size={10} style={{ color: colors.color }} />
                                    }
                                </div>
                            </div>

                            {/* Follow-up Date & Sequence Progress */}
                            {currentStatus === 'Follow Up' && (
                                <div onClick={e => e.stopPropagation()} style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>
                                            📅 Follow-up Date
                                        </div>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)', padding: '1px 5px', borderRadius: '4px', color: '#d97706' }}>
                                            Sequence: {lead.followup_count || 0}/7
                                        </div>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="date"
                                            value={followupDate}
                                            onChange={handleDateChange}
                                            disabled={isSavingDate}
                                            style={{ width: '100%', height: '28px', padding: '0 8px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: 'rgba(245, 158, 11, 0.05)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', outline: 'none', cursor: isSavingDate ? 'wait' : 'pointer' }}
                                        />
                                        {isSavingDate && <Loader2 size={10} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', animation: 'spin 1s linear infinite' }} />}
                                    </div>
                                </div>
                            )}

                            {/* Quick links */}
                            {(lead.whatsapp || lead.linkedin || lead.google) && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {lead.whatsapp && (
                                        <>
                                            <a href={`tel:+${lead.whatsapp.replace(/\D/g, '')}`}
                                                onClick={e => e.stopPropagation()}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: 'rgba(99, 149, 255, 0.1)', borderRadius: '6px', color: '#6395ff', border: '1px solid rgba(99, 149, 255, 0.2)', textDecoration: 'none', flexShrink: 0 }}
                                                title="Call Lead"
                                            >
                                                <Phone size={11} />
                                            </a>
                                            <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                                target="_blank" rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '6px', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.1)', textDecoration: 'none', flexShrink: 0 }}
                                                title="WhatsApp Message"
                                            >
                                                <MessageSquare size={11} />
                                            </a>
                                        </>
                                    )}
                                    {lead.linkedin && (
                                        <a href={lead.linkedin} target="_blank" rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: 'rgba(99, 149, 255, 0.1)', borderRadius: '6px', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', textDecoration: 'none', flexShrink: 0 }}>
                                            <Linkedin size={11} />
                                        </a>
                                    )}
                                    {lead.google && (
                                        <a href={lead.google} target="_blank" rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)', textDecoration: 'none', flexShrink: 0 }}>
                                            <Globe size={11} />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {showModal && (
                        <LeadDetailModal
                            lead={{ ...lead, status: currentStatus }}
                            onClose={() => setShowModal(false)}
                            onUpdated={(updated) => {
                                setCurrentStatus(updated.status || currentStatus);
                                onUpdated?.(updated);
                                setShowModal(false);
                            }}
                            onDeleted={(id) => { onDeleted?.(id); }}
                        />
                    )}
                </>
            )}
        </Draggable>
    );
}
