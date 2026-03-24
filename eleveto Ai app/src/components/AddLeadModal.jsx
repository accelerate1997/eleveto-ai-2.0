import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { X, UserPlus, Globe, Mail, MessageSquare, Linkedin, ExternalLink, Activity, Boxes, Cpu } from 'lucide-react';

export default function AddLeadModal({ isOpen, onClose, onLeadAdded }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        linkedin: '',
        google: '',
        country: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = {
                ...formData,
                status: 'Lead',
                created_by: pb.authStore.model?.id,
            };
            const record = await pb.collection('leads').create(data, { expand: 'created_by' });
            onLeadAdded(record);
            onClose();
            setFormData({
                name: '', email: '', whatsapp: '', linkedin: '', google: '', country: ''
            });
        } catch (err) {
            alert('ElevetoAi Protocol Error: ' + (err.message || 'Data integration failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <header style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                        <div style={{
                            background: 'rgba(79, 70, 229, 0.08)',
                            padding: '10px',
                            borderRadius: '14px',
                            border: '1px solid rgba(79, 70, 229, 0.15)',
                        }}>
                             <UserPlus size={24} style={{ color: 'var(--primary-indigo)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Initialize Entity</h2>
                    </div>
                    <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Deploy a new neural data node into the agency pipeline matrix.
                    </p>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Agent Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Full Identity Name"
                        />
                    </div>

                    <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="email">Access Identity (Email)</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="identity@neural.agency"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="whatsapp">WhatsApp Signal</label>
                            <input
                                type="text"
                                id="whatsapp"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                placeholder="+1 234 567 890"
                            />
                        </div>
                    </div>

                    <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="linkedin">LinkedIn Node</label>
                            <input
                                type="url"
                                id="linkedin"
                                name="linkedin"
                                value={formData.linkedin}
                                onChange={handleChange}
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="google">Google Graph</label>
                            <input
                                type="url"
                                id="google"
                                name="google"
                                value={formData.google}
                                onChange={handleChange}
                                placeholder="https://google.com/..."
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="country">Geographic Zone</label>
                        <input
                            type="text"
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            required
                            placeholder="United Kingdom"
                        />
                    </div>

                    <button type="submit" className="btn" style={{ marginTop: '2rem', width: '100%' }} disabled={isLoading}>
                        {isLoading ? (
                            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                        ) : (
                            <>
                                <Cpu size={20} />
                                <span>Deploy Protocol</span>
                                <ExternalLink size={18} style={{ marginLeft: 'auto' }} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
