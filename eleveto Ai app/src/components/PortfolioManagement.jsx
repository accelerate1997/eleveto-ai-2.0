import React, { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { 
    Briefcase, Plus, Search, RefreshCw, AlertCircle, 
    X, Upload, Image as ImageIcon, Trash2, ExternalLink,
    ChevronRight, Loader2, Edit3
} from 'lucide-react';

export default function PortfolioManagement() {
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        project_name: '',
        Desicription_: '',
    });
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [editingProject, setEditingProject] = useState(null);

    const fetchPortfolios = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const records = await pb.collection('Portoflio').getFullList({
                sort: '-created',
                '$autoCancel': false,
            });
            setPortfolios(records);
        } catch (err) {
            if (!err?.isAbort) {
                const msg = err?.data?.message || err?.message || JSON.stringify(err);
                setError('Failed to load portfolio: ' + msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPortfolios();
    }, [fetchPortfolios]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedImages(prev => [...prev, ...files]);
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, reader.result]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedThumbnail(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setFormData({
            project_name: project.project_name || '',
            Desicription_: project.Desicription_ || '',
        });
        
        // Handle previews for existing images
        if (project.project_images_) {
            const images = Array.isArray(project.project_images_) ? project.project_images_ : [project.project_images_];
            setImagePreviews(images.map(img => `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${img}`));
        } else {
            setImagePreviews([]);
        }

        if (project.Project_thumnail) {
            setThumbnailPreview(`${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.Project_thumnail}`);
        } else {
            setThumbnailPreview(null);
        }
        
        setSelectedImages([]);
        setSelectedThumbnail(null);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ project_name: '', Desicription_: '' });
        setSelectedImages([]);
        setImagePreviews([]);
        setSelectedThumbnail(null);
        setThumbnailPreview(null);
        setEditingProject(null);
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const data = new FormData();
            data.append('project_name', formData.project_name);
            data.append('Desicription_', formData.Desicription_);
            
            // For multiple files in PocketBase, append each file to the same key
            selectedImages.forEach(file => {
                data.append('project_images_', file);
            });

            if (selectedThumbnail) {
                data.append('Project_thumnail', selectedThumbnail);
            }

            if (editingProject) {
                await pb.collection('Portoflio').update(editingProject.id, data);
            } else {
                await pb.collection('Portoflio').create(data);
            }
            
            resetForm();
            fetchPortfolios();
        } catch (err) {
            const msg = err?.data?.message || err?.message || 'Failed to save portfolio item';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        
        try {
            await pb.collection('Portoflio').delete(id);
            fetchPortfolios();
        } catch (err) {
            setError('Failed to delete: ' + err.message);
        }
    };

    const filtered = portfolios.filter(p =>
        (p.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.Desicription_ || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="dashboard-view">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Portfolio Management
                    </h1>
                    <p className="subtitle" style={{ textAlign: 'left', margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>
                        Manage agency projects and case studies
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
                            placeholder="Search projects…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                height: '44px', paddingLeft: '40px', paddingRight: '1rem',
                                border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px',
                                fontSize: '0.875rem', width: '240px', fontFamily: 'Inter, sans-serif',
                                background: 'white', outline: 'none', color: 'var(--text-primary)',
                                fontWeight: 500, transition: 'all 0.2s',
                            }}
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: 'var(--primary-indigo)', color: 'white',
                            padding: '0 1.5rem', height: '44px',
                            borderRadius: '12px', fontWeight: 700, border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={18} />
                        Add Project
                    </button>
                    
                    <button
                        onClick={fetchPortfolios}
                        disabled={loading}
                        className="btn-secondary btn-square"
                        style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

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

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-indigo)' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
                    <Briefcase size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                    <h3 style={{ fontWeight: 700, color: '#0f172a' }}>No projects found</h3>
                    <p style={{ color: '#64748b' }}>Start by adding your first portfolio item</p>
                </div>
            ) : (
                <div className="cards-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filtered.map(project => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            onDelete={() => handleDelete(project.id)} 
                            onEdit={() => handleEdit(project)}
                        />
                    ))}
                </div>
            )}

            {/* Add Project Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem', background: 'rgba(2, 6, 23, 0.4)', backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'white', width: '95vw', maxWidth: '1200px', height: '90vh',
                        borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        position: 'relative', padding: '2.5rem', display: 'flex', flexDirection: 'column'
                    }}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                                {editingProject ? 'Edit Project' : 'Add New Project'}
                            </h2>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.project_name}
                                        onChange={e => setFormData({...formData, project_name: e.target.value})}
                                        placeholder="Agency Dashboard Redesign"
                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Thumbnail</label>
                                    <div 
                                        onClick={() => document.getElementById('Project_thumnail').click()}
                                        style={{
                                            border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '0.75rem',
                                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                                            background: thumbnailPreview ? 'none' : '#f8fafc',
                                            position: 'relative', overflow: 'hidden', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        {thumbnailPreview ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <img src={thumbnailPreview} alt="Thumbnail Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600 }}>Thumbnail Set</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <ImageIcon size={18} style={{ color: '#94a3b8' }} />
                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Set Primary Thumbnail</span>
                                            </div>
                                        )}
                                        <input
                                            id="Project_thumnail"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbnailChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gallery Images</label>
                                    <div 
                                        onClick={() => document.getElementById('project_images_').click()}
                                        style={{
                                            border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '1rem',
                                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                                            background: '#f8fafc',
                                            marginBottom: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <Upload size={18} style={{ color: '#94a3b8' }} />
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Upload Project Screenshots (Multi-select enabled)</span>
                                        </div>
                                        <input
                                            id="project_images_"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>

                                    {imagePreviews.length > 0 && (
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                                            gap: '10px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            padding: '10px',
                                            background: '#f1f5f9',
                                            borderRadius: '12px'
                                        }}>
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                    <img src={preview} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                        style={{ 
                                                            position: 'absolute', top: '2px', right: '2px', 
                                                            background: 'rgba(239, 68, 68, 0.9)', color: 'white', 
                                                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                            padding: '2px'
                                                        }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detailed Description</label>
                                <textarea
                                    required
                                    value={formData.Desicription_}
                                    onChange={e => setFormData({...formData, Desicription_: e.target.value})}
                                    placeholder="Write a comprehensive description of the project challenges, solutions, and outcomes..."
                                    style={{ 
                                        width: '100%', flex: 1, padding: '1.25rem', borderRadius: '16px', 
                                        border: '1px solid #e2e8f0', resize: 'none', fontSize: '1.1rem', lineHeight: 1.6,
                                        minHeight: '250px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        padding: '0.75rem 2rem', borderRadius: '12px', border: '1px solid #e2e8f0',
                                        background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    style={{
                                        background: 'var(--primary-indigo)', color: 'white',
                                        padding: '0.75rem 3rem', borderRadius: '12px', border: 'none', fontWeight: 700,
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)'
                                    }}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingProject ? <RefreshCw size={18} /> : <CheckCircle size={18} />)}
                                    {isSubmitting ? 'Saving...' : (editingProject ? 'Update Project' : 'Publish Project')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .btn-secondary { background: white; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; display: flex; alignItems: center; justifyContent: center; }
                .btn-secondary:hover { background: #f8fafc; }
            `}</style>
        </div>
    );
}

function ProjectCard({ project, onDelete, onEdit }) {
    const imageUrl = project.Project_thumnail 
        ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.Project_thumnail}`
        : (project.project_images_ ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.project_images_}` : null);

    return (
        <div style={{
            background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)',
            overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease'
        }} className="portfolio-card">
            <div style={{ height: '200px', background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                {imageUrl ? (
                    <img src={imageUrl} alt={project.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={40} style={{ color: '#cbd5e1' }} />
                    </div>
                )}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={onEdit}
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px', 
                            background: 'white', border: 'none', color: 'var(--primary-indigo)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            padding: 0
                        }}
                    >
                        <Edit3 size={14} />
                    </button>
                    <button 
                        onClick={onDelete}
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px', 
                            background: 'white', border: 'none', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                    {project.project_name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                    {project.Desicription_}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                        {new Date(project.created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <button style={{ 
                        background: 'none', border: 'none', color: 'var(--primary-indigo)', 
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px' 
                    }}>
                        View Details <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// CheckCircle missing in imports above
function CheckCircle({ size }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
