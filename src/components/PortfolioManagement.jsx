import React, { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { 
    Briefcase, Plus, Search, RefreshCw, AlertCircle, 
    X, Upload, Image as ImageIcon, Trash2, ExternalLink,
    ChevronRight, Loader2, Edit3, CheckCircle, Calendar,
    FileText, Layout
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
        <div className="dashboard-view" style={{ padding: 'var(--container-px)' }}>
            {/* Header */}
            <header className="dashboard-header" style={{ marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Portfolio</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        Showcase your best work and manage project case studies
                    </p>
                </div>
                <div className="header-actions" style={{ gap: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={18} style={{
                            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', pointerEvents: 'none',
                        }} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="glass"
                            style={{
                                height: '52px', paddingLeft: '48px',
                                borderRadius: '16px', fontSize: '0.95rem',
                                border: '1px solid var(--glass-border)',
                            }}
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn"
                        style={{ height: '52px', padding: '0 2rem', width: 'auto' }}
                    >
                        <Plus size={20} />
                        <span>Add Project</span>
                    </button>
                    
                    <button
                        onClick={fetchPortfolios}
                        disabled={loading}
                        className="btn glass"
                        style={{ width: '52px', height: '52px', padding: 0, background: 'white', color: 'var(--text-primary)' }}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#fef2f2', border: '1px solid #fee2e2',
                    borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem',
                    color: '#ef4444', fontSize: '0.95rem', fontWeight: 500,
                }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card" style={{ flex: '1 1 350px', height: '400px', opacity: 0.5, background: '#f8fafc' }}>
                            <div className="animate-pulse" style={{ height: '200px', background: '#e2e8f0', borderRadius: '12px', marginBottom: '1.5rem' }} />
                            <div className="animate-pulse" style={{ height: '24px', background: '#e2e8f0', borderRadius: '4px', width: '60%', marginBottom: '1rem' }} />
                            <div className="animate-pulse" style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', width: '90%' }} />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                    <div style={{ 
                        width: '80px', height: '80px', borderRadius: '24px', 
                        background: 'var(--neural-bg)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
                    }}>
                        <Briefcase size={40} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <h3>No projects found</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {search ? "Try a different search term" : "Begin by creating your first portfolio showcase"}
                    </p>
                </div>
            ) : (
                <div className="cards-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '2rem'
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

            {/* Redesigned Project Modal */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="modal-content glass-card" style={{
                        maxWidth: '900px', width: '100%', padding: 0,
                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        maxHeight: 'calc(100vh - 40px)', border: 'none'
                    }}>
                        {/* Modal Header */}
                        <div style={{ 
                            padding: '1.5rem 2rem', background: 'white', 
                            borderBottom: '1px solid var(--glass-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    width: '40px', height: '40px', borderRadius: '12px', 
                                    background: 'var(--primary-indigo)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {editingProject ? <Edit3 size={20} /> : <Plus size={20} />}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingProject ? 'Edit Project' : 'New Project'}</h3>
                            </div>
                            <button onClick={resetForm} className="modal-close" style={{ position: 'relative', top: 0, right: 0 }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ 
                            flex: 1, overflowY: 'auto', padding: '2rem',
                            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem'
                        }} className="project-form-grid">
                            <style>{`
                                @media (max-width: 850px) {
                                    .project-form-grid { grid-template-columns: 1fr !important; }
                                    .project-sidebar { order: -1; }
                                }
                                .dropzone:hover { border-color: var(--primary-indigo) !important; background: rgba(59, 130, 246, 0.02) !important; }
                            `}</style>
                            
                            <div className="project-main" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Project Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.project_name}
                                        onChange={e => setFormData({...formData, project_name: e.target.value})}
                                        placeholder="Enter project name..."
                                        className="glass"
                                    />
                                </div>

                                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label>Case Study Description</label>
                                    <textarea
                                        required
                                        value={formData.Desicription_}
                                        onChange={e => setFormData({...formData, Desicription_: e.target.value})}
                                        placeholder="Detail the challenges, solution, and impact..."
                                        className="glass"
                                        style={{ 
                                            flex: 1, minHeight: '300px', height: 'auto',
                                            padding: '1.25rem', lineHeight: 1.6, resize: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="project-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Thumbnail Section */}
                                <div className="form-group">
                                    <label>Thumbnail Cover</label>
                                    <div 
                                        onClick={() => document.getElementById('Project_thumnail_modal').click()}
                                        className="dropzone"
                                        style={{
                                            border: '2px dashed var(--glass-border)', borderRadius: '16px',
                                            height: '180px', cursor: 'pointer', transition: 'all 0.2s',
                                            background: '#f8fafc', overflow: 'hidden', position: 'relative',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        {thumbnailPreview ? (
                                            <div style={{ width: '100%', height: '100%' }}>
                                                <img src={thumbnailPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ 
                                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0,
                                                    transition: 'opacity 0.2s'
                                                }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                                    <RefreshCw size={24} style={{ color: 'white' }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                                <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Set Cover</div>
                                            </div>
                                        )}
                                        <input
                                            id="Project_thumnail_modal"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbnailChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Gallery Section */}
                                <div className="form-group">
                                    <label>Gallery Images</label>
                                    <button 
                                        type="button"
                                        onClick={() => document.getElementById('project_images_modal').click()}
                                        className="btn glass"
                                        style={{ 
                                            background: 'white', color: 'var(--primary-indigo)', 
                                            border: '1px solid var(--primary-indigo)',
                                            height: '44px', fontSize: '0.85rem'
                                        }}
                                    >
                                        <Upload size={16} /> Add Images
                                    </button>
                                    <input
                                        id="project_images_modal"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                    
                                    <div style={{ 
                                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', 
                                        gap: '8px', marginTop: '1rem', maxHeight: '200px', overflowY: 'auto'
                                    }}>
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                                <img src={preview} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    style={{ 
                                                        position: 'absolute', top: '2px', right: '2px', 
                                                        background: 'rgba(239, 68, 68, 0.9)', color: 'white', 
                                                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                        width: '20px', height: '20px', padding: 0, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div style={{ 
                            padding: '1.50rem 2rem', background: '#f8fafc',
                            borderTop: '1px solid var(--glass-border)',
                            display: 'flex', justifyContent: 'flex-end', gap: '1rem'
                        }}>
                            <button 
                                type="button"
                                onClick={resetForm}
                                className="btn glass"
                                style={{ width: 'auto', padding: '0 2rem', background: 'transparent' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn"
                                style={{ width: 'auto', padding: '0 3rem' }}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                {isSubmitting ? 'Saving...' : (editingProject ? 'Update Project' : 'Publish Project')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin { animation: spin 0.8s linear infinite; }
                .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </div>
    );
}

function ProjectCard({ project, onDelete, onEdit }) {
    const imageUrl = project.Project_thumnail 
        ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.Project_thumnail}`
        : (project.project_images_ && project.project_images_.length > 0 
           ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${Array.isArray(project.project_images_) ? project.project_images_[0] : project.project_images_}` 
           : null);

    return (
        <div className="glass-card" style={{
            padding: 0, display: 'flex', flexDirection: 'column', 
            overflow: 'hidden', border: '1px solid var(--glass-border)'
        }}>
            <div style={{ height: '200px', position: 'relative', background: 'var(--neural-bg)' }}>
                {imageUrl ? (
                    <img src={imageUrl} alt={project.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layout size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                    </div>
                )}
                <div style={{ 
                    position: 'absolute', top: '12px', right: '12px', 
                    display: 'flex', gap: '8px', opacity: 0, transform: 'translateY(-10px)',
                    transition: 'all 0.3s'
                }} className="card-controls">
                    <button onClick={onEdit} className="btn glass" style={{ width: '36px', height: '36px', padding: 0, background: 'white' }}>
                        <Edit3 size={16} />
                    </button>
                    <button onClick={onDelete} className="btn glass" style={{ width: '36px', height: '36px', padding: 0, background: 'white', color: '#ef4444' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
                <style>{`
                    .glass-card:hover .card-controls { opacity: 1; transform: translateY(0); }
                `}</style>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                    <div style={{ 
                        padding: '4px 10px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary-indigo)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase'
                    }}>
                        Case Study
                    </div>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{project.project_name}</h3>
                <p style={{ 
                    color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, 
                    marginBottom: '1.5rem', flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                    {project.Desicription_}
                </p>
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: '1rem', borderTop: '1px solid var(--neural-bg)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Calendar size={14} />
                        {new Date(project.created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <button style={{ 
                        background: 'none', border: 'none', color: 'var(--primary-indigo)', 
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px' 
                    }}>
                        Manage <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
