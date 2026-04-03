import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { X, Mail, Phone, Linkedin, Globe, MapPin, Edit2, Trash2, Loader2, ExternalLink, Save, Calendar, TrendingUp, Briefcase, ArrowLeft } from 'lucide-react';

export default function LeadDetailsPage({ lead, onBack, onUpdated, onDeleted }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'conversation'
    const [messages, setMessages] = useState([]);
    const [sequences, setSequences] = useState([]);
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
        sequence: lead.sequence || '',
    });

    const fetchSequences = async () => {
        try {
            const records = await pb.collection('sequences').getFullList();
            setSequences(records);
        } catch (err) {
            console.error('Failed to fetch sequences:', err);
        }
    };

    React.useEffect(() => {
        fetchSequences();
    }, []);

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
            onBack();
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

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-white)', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface-white)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button 
                        onClick={onBack}
                        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--neural-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                        title="Back to Pipeline"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                            {(lead.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-primary)' }}>{lead.name}</h2>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary-indigo)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                                {lead.status || 'Lead'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.2rem', background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '10px', color: 'var(--primary-indigo)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Edit2 size={14} /> Edit Lead
                        </button>
                    )}
                    <button onClick={handleDelete} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.2rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {isDeleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />} Delete
                    </button>
                </div>
            </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '2rem', padding: '0 2.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'var(--surface-white)' }}>
                    {['details', 'conversation'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '1rem 0.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-indigo)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--primary-indigo)' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-1px'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: '1000px', width: '100%' }}>
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

                                {(lead.status === 'Follow Up' || form.status === 'Follow Up') && (
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label htmlFor="edit-sequence">🤖 Follow-up Sequence</label>
                                        <select 
                                            id="edit-sequence" 
                                            name="sequence" 
                                            value={form.sequence} 
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
                                        >
                                            <option value="">Default AI Logic</option>
                                            {sequences.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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
                                {(lead.status === 'Follow Up') && (
                                    <>
                                        <InfoRow icon={Calendar} label="Follow-up Date" value={lead.followup_date ? new Date(lead.followup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'} />
                                        <InfoRow icon={Zap} label="Assigned Sequence" value={lead.expand?.sequence?.name || 'Default AI Logic'} />
                                    </>
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
                    <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '1rem', justifyContent: 'flex-start', background: 'var(--surface-white)', position: 'sticky', bottom: 0 }}>
                        <button onClick={handleSave} disabled={isSaving} className="btn" style={{ width: 'auto', padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
                            {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                            Save Changes
                        </button>
                        <button onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                            Cancel
                        </button>
                    </div>
                )}
        </div>
    );
}
