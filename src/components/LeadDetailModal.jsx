import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { pb } from '../lib/pocketbase';
import { X, Mail, Phone, Linkedin, Globe, MapPin, Edit2, Trash2, Loader2, ExternalLink, Save, Calendar, TrendingUp, Briefcase } from 'lucide-react';

export default function LeadDetailModal({ lead, onClose, onUpdated, onDeleted }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'conversation'
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [form, setForm] = useState({
        name: lead.name || '',
        email: lead.email || '',
        whatsapp: lead.whatsapp || '',
        linkedin: lead.linkedin || '',
        google: lead.google || '',
        country: lead.country || '',
        industry: lead.industry || '',
        investment: lead.investment || '',
        followup_date: lead.followup_date ? lead.followup_date.split(' ')[0] : '',
    });

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await pb.collection('leads').update(lead.id, form);
            onUpdated(updated);
            setIsEditing(false);
        } catch (err) {
            alert('Update failed: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!confirm(`Delete "${lead.name}"? This cannot be undone.`)) return;
        setIsDeleting(true);
        try {
            await pb.collection('leads').delete(lead.id);
            onDeleted(lead.id);
            onClose();
        } catch (err) {
            alert('Delete failed: ' + err.message);
            setIsDeleting(false);
        }
    };

    const fetchMessages = async () => {
        setIsLoadingMessages(true);
        try {
            const records = await pb.collection('messages').getFullList({
                filter: `lead = "${lead.id}"`,
                sort: 'id',
            });
            setMessages(records);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    React.useEffect(() => {
        if (activeTab === 'conversation') {
            fetchMessages();
        }
    }, [activeTab]);

    const InfoRow = ({ icon: Icon, label, value, href }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(79, 70, 229, 0.15)' }}>
                {Icon && <Icon size={14} style={{ color: 'var(--primary-indigo)' }} />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '2px' }}>{label}</div>
                {href
                    ? <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-indigo)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {value} <ExternalLink size={12} />
                    </a>
                    : <span style={{ fontSize: '0.875rem', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 500 : 400 }}>{value || '—'}</span>
                }
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem' }}
            onClick={onClose}
        >
            <div
                style={{ background: 'var(--surface-white)', borderRadius: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                                {(lead.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-primary)' }}>{lead.name}</h2>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary-indigo)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                                    {lead.status || 'Lead'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.45rem 0.875rem', background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '10px', color: 'var(--primary-indigo)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                <Edit2 size={13} /> Edit
                            </button>
                        )}
                        <button onClick={handleDelete} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.45rem 0.875rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {isDeleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} Delete
                        </button>
                        <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1.5rem', padding: '0 1.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    {['details', 'conversation'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '1rem 0.25rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-indigo)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--primary-indigo)' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.75rem' }}>
                    {activeTab === 'details' ? (
                        isEditing ? (
                            <div style={{ paddingTop: '0.75rem' }}>
                                {[
                                    { name: 'name', label: 'Name', type: 'text' },
                                    { name: 'email', label: 'Email', type: 'email' },
                                    { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
                                    { name: 'country', label: 'Country', type: 'text' },
                                    { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
                                    { name: 'google', label: 'Google Maps URL', type: 'url' },
                                    { name: 'industry', label: 'Industry', type: 'text' },
                                    { name: 'investment', label: 'Investment', type: 'text' },
                                    ...(lead.status === 'Follow Up' || (form && form.status === 'Follow Up')
                                        ? [{ name: 'followup_date', label: '📅 Follow-up Date', type: 'date' }]
                                        : []),
                                ].map(field => (
                                    <div key={field.name} className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label htmlFor={`edit-${field.name}`}>{field.label}</label>
                                        <input id={`edit-${field.name}`} name={field.name} type={field.type} value={form[field.name]} onChange={handleChange} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ paddingTop: '0.25rem' }}>
                                <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : null} />
                                <InfoRow icon={Phone} label="WhatsApp" value={lead.whatsapp} href={lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}` : null} />
                                <InfoRow icon={MapPin} label="Country" value={lead.country} />
                                <InfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedin ? 'View Profile' : null} href={lead.linkedin || null} />
                                <InfoRow icon={Globe} label="Google Maps" value={lead.google ? 'View on Maps' : null} href={lead.google || null} />
                                <InfoRow icon={Briefcase} label="Industry" value={lead.industry} />
                                <InfoRow icon={TrendingUp} label="Investment" value={lead.investment} />
                                {lead.status === 'Follow Up' && (
                                    <InfoRow icon={Calendar} label="Follow-up Date" value={lead.followup_date ? new Date(lead.followup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'} />
                                )}
                                <div style={{ padding: '0.75rem 0', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '0.5rem' }}>
                                    <div style={{ marginBottom: '4px' }}>
                                        Added {new Date(lead.created).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    {lead.expand?.created_by && (
                                        <div style={{ color: 'var(--primary-indigo)', fontWeight: 700 }}>
                                            Source Agent: {lead.expand.created_by.name || lead.expand.created_by.username}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        /* Conversation Tab */
                        <div style={{ padding: '1rem 0' }}>
                            {isLoadingMessages ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '2rem 0', color: '#64748b' }}>
                                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: '0.85rem' }}>Loading conversation...</span>
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '10px' }}>💬</div>
                                    <p style={{ fontSize: '0.875rem' }}>No messages found for this lead.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {messages.map((msg, i) => (
                                        <div 
                                            key={msg.id} 
                                            style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end',
                                                maxWidth: '85%',
                                                alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end'
                                            }}
                                        >
                                            <div style={{ 
                                                padding: '0.75rem 1rem', 
                                                borderRadius: msg.role === 'user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                                                background: msg.role === 'user' ? 'rgba(79, 70, 229, 0.08)' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                                color: msg.role === 'user' ? 'var(--text-primary)' : 'white',
                                                fontSize: '0.875rem',
                                                lineHeight: 1.5,
                                                border: msg.role === 'user' ? '1px solid rgba(79, 70, 229, 0.15)' : 'none'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                                                {new Date(msg.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - Edit mode only */}
                {isEditing && (
                    <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsEditing(false)} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="btn" style={{ width: 'auto', padding: '0.6rem 1.5rem', fontSize: '0.875rem' }}>
                            {isSaving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
        , document.body);
}
