import React, { useState, useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';
import { X, Mail, Phone, Linkedin, Globe, MapPin, Edit2, Trash2, Loader2, ExternalLink, Save, Calendar, TrendingUp, Briefcase, ArrowLeft, Send, PauseCircle, PlayCircle, Bot, User, Zap, Paperclip, FileText } from 'lucide-react';

export default function LeadDetailsPage({ lead, onBack, onUpdated, onDeleted }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTogglingAI, setIsTogglingAI] = useState(false);
    const [messages, setMessages] = useState([]);
    const [sequences, setSequences] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchSequences = async () => {
        try {
            const records = await pb.collection('sequences').getFullList();
            setSequences(records);
        } catch (err) {
            console.error('Failed to fetch sequences:', err);
        }
    };

    useEffect(() => {
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

    const toggleAI = async () => {
        setIsTogglingAI(true);
        try {
            const updated = await pb.collection('leads').update(lead.id, { ai_disabled: !lead.ai_disabled });
            onUpdated(updated);
        } catch (err) {
            alert('Toggle AI failed: ' + err.message);
        } finally {
            setIsTogglingAI(false);
        }
    };

    const fetchMessages = async () => {
        setIsLoadingMessages(true);
        try {
            const records = await pb.collection('messages').getFullList({
                filter: `lead = "${lead.id}"`,
                sort: 'created',
            });
            setMessages(records);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 10485760) {
            alert('File must be less than 10MB');
            return;
        }

        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Setup real-time listener for messages
        pb.collection('messages').subscribe('*', function (e) {
            if (e.action === 'create' && e.record.lead === lead.id) {
                setMessages(prev => [...prev, e.record]);
            }
        });

        return () => {
            pb.collection('messages').unsubscribe('*');
        };
    }, [lead.id]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text && !selectedFile) return;
        
        setIsSending(true);
        try {
            // Auto-pause AI if user starts chatting manually
            if (!lead.ai_disabled && lead.status !== 'Draft') {
                const updated = await pb.collection('leads').update(lead.id, { ai_disabled: true });
                onUpdated(updated);
            }

            // Determine backend URL
            const apiUrl = process.env.NODE_ENV === 'production' 
                ? `${window.location.origin}/api/messages/send` 
                : 'http://localhost:3001/api/messages/send';

            let mediaBase64 = null;
            let mimeType = null;
            let fileName = null;
            let skipLog = false;

            if (selectedFile) {
                // Upload to PocketBase first
                const formData = new FormData();
                formData.append('lead', lead.id);
                formData.append('role', 'manual');
                if (text) formData.append('content', text);
                formData.append('attachment', selectedFile);
                
                await pb.collection('messages').create(formData);
                skipLog = true;

                // Read base64 for Evolution API
                mediaBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(selectedFile);
                });
                mimeType = selectedFile.type;
                fileName = selectedFile.name;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id, text, mediaBase64, mimeType, fileName, skipLog })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to send message');
            }

            setChatInput('');
            setSelectedFile(null);
            setFilePreview(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSending(false);
        }
    };

    const InfoRow = ({ icon: Icon, label, value, href }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-white)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-white)', zIndex: 10 }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary-indigo)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                                    {lead.status || 'Lead'}
                                </span>
                                {lead.ai_disabled && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <PauseCircle size={10} /> AI Paused
                                    </span>
                                )}
                            </div>
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

            {/* Split Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* Left Pane - Lead Details */}
                <div style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} /> Lead Information
                    </h3>
                    
                    {isEditing ? (
                        <div style={{ paddingTop: '0' }}>
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
                                    <label htmlFor={`edit-${field.name}`} style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{field.label}</label>
                                    <input id={`edit-${field.name}`} name={field.name} type={field.type} value={form[field.name]} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', background: 'var(--neural-bg)' }} />
                                </div>
                            ))}

                            {(lead.status === 'Follow Up' || form.status === 'Follow Up') && (
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label htmlFor="edit-sequence" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>🤖 Follow-up Sequence</label>
                                    <select 
                                        id="edit-sequence" 
                                        name="sequence" 
                                        value={form.sequence} 
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', background: 'var(--neural-bg)' }}
                                    >
                                        <option value="">Default AI Logic</option>
                                        {sequences.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 2rem', background: 'var(--primary-indigo)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
                                    {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save Changes
                                </button>
                                <button onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.5rem', background: 'var(--neural-bg)', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ paddingTop: '0' }}>
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
                            <div style={{ padding: '1rem 0', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                                Added {new Date(lead.created).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {lead.expand?.created_by && ` • Source: ${lead.expand.created_by.name || lead.expand.created_by.username}`}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Pane - Chat Window */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', position: 'relative' }}>
                    
                    {/* Chat Header */}
                    <div style={{ padding: '1rem 1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <Bot size={18} style={{ color: 'var(--primary-indigo)' }} /> Agent Conversation
                        </div>
                        
                        <button 
                            onClick={toggleAI}
                            disabled={isTogglingAI}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: 'none',
                                background: lead.ai_disabled ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: lead.ai_disabled ? '#d97706' : '#059669',
                            }}
                        >
                            {isTogglingAI ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 
                            lead.ai_disabled ? <><PlayCircle size={14} /> Resume AI</> : <><PauseCircle size={14} /> Pause AI</>}
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {isLoadingMessages ? (
                            <div style={{ margin: 'auto', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                Loading...
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ margin: 'auto', color: '#94a3b8', textAlign: 'center', fontSize: '0.85rem' }}>
                                No conversation history.
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isUser = msg.role === 'user';
                                const isManual = msg.role === 'manual';
                                
                                return (
                                <div 
                                    key={msg.id} 
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: isUser ? 'flex-start' : 'flex-end',
                                        maxWidth: '85%',
                                        alignSelf: isUser ? 'flex-start' : 'flex-end'
                                    }}
                                >
                                    {isManual && <span style={{ fontSize: '0.6rem', color: '#6366f1', marginBottom: '2px', fontWeight: 700, padding: '0 4px' }}>Agent Reply</span>}
                                    {!isUser && !isManual && <span style={{ fontSize: '0.6rem', color: '#10b981', marginBottom: '2px', fontWeight: 700, padding: '0 4px' }}>AI Reply</span>}
                                    
                                    <div style={{ 
                                        padding: '0.75rem 1rem', 
                                        borderRadius: isUser ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                                        background: isUser ? 'white' : (isManual ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'linear-gradient(135deg, #10b981, #059669)'),
                                        color: isUser ? 'var(--text-primary)' : 'white',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                        border: isUser ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        {msg.attachment && (
                                            <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                                                {msg.attachment.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                                                    <a href={pb.files.getURL(msg, msg.attachment)} target="_blank" rel="noreferrer">
                                                        <img 
                                                            src={pb.files.getURL(msg, msg.attachment, { thumb: '400x400' })} 
                                                            style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', display: 'block' }} 
                                                            alt="attachment" 
                                                        />
                                                    </a>
                                                ) : (
                                                    <a 
                                                        href={pb.files.getURL(msg, msg.attachment)} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        style={{ 
                                                            color: isUser ? 'var(--primary-indigo)' : 'white', 
                                                            textDecoration: 'none', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '6px',
                                                            background: isUser ? 'var(--neural-bg)' : 'rgba(255,255,255,0.2)',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <Paperclip size={14} /> Download File
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1', marginTop: '4px', padding: '0 4px' }}>
                                        {new Date(msg.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )})
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
                        {selectedFile && (
                            <div style={{ padding: '0.5rem', marginBottom: '0.5rem', background: 'var(--neural-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {filePreview ? (
                                    <img src={filePreview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                                        <FileText size={20} />
                                    </div>
                                )}
                                <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedFile.name}
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setSelectedFile(null); setFilePreview(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                style={{ display: 'none' }} 
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSending}
                                style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--neural-bg)', color: '#64748b', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                                title="Attach File"
                            >
                                <Paperclip size={18} />
                            </button>

                            <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '25px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', background: 'var(--neural-bg)', fontSize: '0.9rem' }}
                                disabled={isSending}
                            />
                            <button 
                                type="submit" 
                                disabled={isSending || (!chatInput.trim() && !selectedFile)}
                                style={{ 
                                    width: '45px', height: '45px', borderRadius: '50%',
                                    background: (chatInput.trim() || selectedFile) ? 'var(--primary-indigo)' : '#e2e8f0',
                                    color: 'white',
                                    border: 'none', cursor: (chatInput.trim() || selectedFile) ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', flexShrink: 0
                                }}
                            >
                                {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} style={{ marginLeft: '2px' }} />}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
