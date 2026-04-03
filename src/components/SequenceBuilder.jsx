import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Plus, Trash2, Save, Loader2, ChevronRight, MessageSquare, Zap, Clock, Edit2, Play, Info } from 'lucide-react';

export default function SequenceBuilder() {
    const [sequences, setSequences] = useState([]);
    const [selectedSequence, setSelectedSequence] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState([]);

    useEffect(() => {
        fetchSequences();
    }, []);

    const fetchSequences = async () => {
        setIsLoading(true);
        try {
            const records = await pb.collection('sequences').getFullList({
                sort: '-created',
            });
            setSequences(records);
            if (records.length > 0 && !selectedSequence) {
                loadSequence(records[0]);
            }
        } catch (err) {
            console.error('Failed to fetch sequences:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSequence = (seq) => {
        setSelectedSequence(seq);
        setName(seq.name);
        setDescription(seq.description || '');
        setSteps(seq.steps || []);
    };

    const handleCreateNew = () => {
        setSelectedSequence(null);
        setName('New Sequence');
        setDescription('');
        setSteps([
            { day: 1, mode: 'ai_directive', content: 'Friendly check-in.' },
            { day: 3, mode: 'ai_directive', content: 'Value insight.' }
        ]);
    };

    const handleAddStep = () => {
        const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
        setSteps([...steps, { day: lastDay + 2, mode: 'ai_directive', content: '' }]);
    };

    const handleRemoveStep = (index) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleStepChange = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index][field] = value;
        setSteps(newSteps);
    };

    const handleSave = async () => {
        if (!name.trim()) return alert('Sequence name is required');
        setIsSaving(true);
        try {
            const data = {
                name,
                description,
                steps,
                created_by: pb.authStore.model?.id
            };

            if (selectedSequence) {
                await pb.collection('sequences').update(selectedSequence.id, data);
            } else {
                const newSeq = await pb.collection('sequences').create(data);
                setSelectedSequence(newSeq);
            }
            fetchSequences();
            alert('Sequence saved successfully!');
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSequence) return;
        if (!confirm(`Delete sequence "${selectedSequence.name}"?`)) return;
        
        try {
            await pb.collection('sequences').delete(selectedSequence.id);
            setSelectedSequence(null);
            fetchSequences();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0f172a, #1E5AFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Sequence Builder
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        Create and manage your automated follow-up workflows.
                    </p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                >
                    <Plus size={18} /> New Sequence
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* Left: Sequence List */}
                <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        My Sequences
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                        {isLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={24} className="spin" style={{ color: 'var(--primary-indigo)' }} /></div>
                        ) : (
                            sequences.map(seq => (
                                <button
                                    key={seq.id}
                                    onClick={() => loadSequence(seq)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: 'none', textAlign: 'left', cursor: 'pointer',
                                        background: selectedSequence?.id === seq.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                        color: selectedSequence?.id === seq.id ? 'var(--primary-indigo)' : 'var(--text-muted)',
                                        fontWeight: selectedSequence?.id === seq.id ? 700 : 500,
                                        transition: 'all 0.2s', marginBottom: '4px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.9rem' }}>{seq.name}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{seq.steps?.length || 0} steps</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Editor */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, marginRight: '1rem' }}>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="Sequence Name"
                                style={{ width: '100%', border: 'none', fontSize: '1.25rem', fontWeight: 800, outline: 'none', color: '#0f172a' }}
                            />
                            <input 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="Short description..."
                                style={{ width: '100%', border: 'none', fontSize: '0.85rem', outline: 'none', color: '#64748b', marginTop: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {selectedSequence && (
                                <button onClick={handleDelete} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 1.25rem', height: '40px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Save
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {steps.map((step, index) => (
                                <div key={index} style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                            {index + 1}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' }}>
                                                <Clock size={14} style={{ color: '#64748b' }} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Day</span>
                                                <input 
                                                    type="number" 
                                                    value={step.day} 
                                                    onChange={e => handleStepChange(index, 'day', parseInt(e.target.value))}
                                                    style={{ width: '40px', border: 'none', background: 'transparent', fontWeight: 800, color: '#6366f1', fontSize: '0.85rem', outline: 'none' }}
                                                />
                                            </div>
                                            <select 
                                                value={step.mode} 
                                                onChange={e => handleStepChange(index, 'mode', e.target.value)}
                                                style={{ border: '1px solid #e2e8f0', background: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', outline: 'none' }}
                                            >
                                                <option value="ai_directive">🤖 AI Agent Prompt</option>
                                                <option value="fixed">📝 Static Text</option>
                                            </select>
                                        </div>
                                        <button onClick={() => handleRemoveStep(index)} style={{ padding: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                    
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8', opacity: 0.5 }}><MessageSquare size={16} /></div>
                                        <textarea 
                                            value={step.content}
                                            onChange={e => handleStepChange(index, 'content', e.target.value)}
                                            placeholder={step.mode === 'ai_directive' ? "Tell Aria what to say... (e.g. 'Ask if they need a demo')" : "Enter the exact message to send..."}
                                            style={{ width: '100%', minHeight: '80px', padding: '12px 12px 12px 38px', borderRadius: '12px', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={handleAddStep}
                                style={{ width: '100%', padding: '1.25rem', border: '2px dashed #e2e8f0', borderRadius: '20px', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                            >
                                <Plus size={18} /> Add Next Follow-up Step
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
