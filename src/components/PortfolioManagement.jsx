import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { pb } from '../lib/pocketbase';
import { 
    Briefcase, Plus, Search, RefreshCw, AlertCircle, 
    X, Upload, Image as ImageIcon, Trash2, ExternalLink,
    ChevronRight, Loader2, Edit3, CheckCircle, CheckCircle2, Calendar,
    Layout, Grid, List, Eye, Sparkles, Layers,
    Check, Copy, ArrowLeft, ArrowRight, Maximize2,
    FileText, Zap, ShieldCheck, FolderKanban, Globe, Link as LinkIcon,
    TrendingUp, Target, Award, ArrowUpRight
} from 'lucide-react';

export default function PortfolioManagement() {
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'with-gallery' | 'with-link'
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'alphabetical'
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewProject, setPreviewProject] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        project_name: '',
        Desicription_: '',
        project_url: ''
    });
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [editingProject, setEditingProject] = useState(null);
    const [dragActiveThumb, setDragActiveThumb] = useState(false);
    const [dragActiveGallery, setDragActiveGallery] = useState(false);

    // Lightbox state for showcase preview
    const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type, id: Date.now() });
        setTimeout(() => {
            setToastMessage(null);
        }, 3500);
    };

    const getImageUrl = useCallback((project, filename) => {
        if (!filename) return null;
        if (typeof filename !== 'string') return null;
        if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
            return filename;
        }
        if (filename.startsWith('/uploads') || filename.startsWith('/api')) {
            return `${pb.baseUrl}${filename}`;
        }
        if (project?.collectionId && project?.id) {
            return `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${filename}`;
        }
        return `${pb.baseUrl}/uploads/${filename}`;
    }, []);

    const fetchPortfolios = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const records = await pb.collection('Portoflio').getFullList({
                sort: '-created',
                '$autoCancel': false,
            });
            setPortfolios(records || []);
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

    // Handle drag & drop files
    const handleThumbnailDrop = (e) => {
        e.preventDefault();
        setDragActiveThumb(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setSelectedThumbnail(file);
                const reader = new FileReader();
                reader.onloadend = () => setThumbnailPreview(reader.result);
                reader.readAsDataURL(file);
            }
        }
    };

    const handleGalleryDrop = (e) => {
        e.preventDefault();
        setDragActiveGallery(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
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
        }
    };

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
            project_url: project.project_url || project.project_link || ''
        });
        
        // Handle previews for existing images
        if (project.project_images_) {
            const images = Array.isArray(project.project_images_) ? project.project_images_ : [project.project_images_];
            setImagePreviews(images.map(img => getImageUrl(project, img)));
        } else {
            setImagePreviews([]);
        }

        if (project.Project_thumnail) {
            setThumbnailPreview(getImageUrl(project, project.Project_thumnail));
        } else {
            setThumbnailPreview(null);
        }
        
        setSelectedImages([]);
        setSelectedThumbnail(null);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ project_name: '', Desicription_: '', project_url: '' });
        setSelectedImages([]);
        setImagePreviews([]);
        setSelectedThumbnail(null);
        setThumbnailPreview(null);
        setEditingProject(null);
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.project_name.trim()) {
            setError('Project name is required');
            return;
        }
        setIsSubmitting(true);
        setError('');

        try {
            const data = new FormData();
            data.append('project_name', formData.project_name.trim());
            data.append('Desicription_', formData.Desicription_.trim());
            data.append('project_url', formData.project_url.trim());
            
            selectedImages.forEach(file => {
                data.append('project_images_', file);
            });

            if (selectedThumbnail) {
                data.append('Project_thumnail', selectedThumbnail);
            }

            if (editingProject) {
                await pb.collection('Portoflio').update(editingProject.id, data);
                showToast(`"${formData.project_name}" updated successfully!`);
            } else {
                await pb.collection('Portoflio').create(data);
                showToast(`"${formData.project_name}" added to portfolio!`);
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

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await pb.collection('Portoflio').delete(deleteTarget.id);
            showToast(`Deleted "${deleteTarget.project_name}"`, 'info');
            setDeleteTarget(null);
            fetchPortfolios();
        } catch (err) {
            setError('Failed to delete: ' + (err?.message || 'Unknown error'));
        }
    };

    const insertTemplate = (type) => {
        if (type === 'casestudy') {
            const template = `**Client & Overview:**\nBrief summary of the client and project scope.\n\n**The Challenge:**\nWhat problem did the client face before working with us?\n\n**Our Solution:**\nHow did we design and build the solution?\n\n**Impact & Key Results:**\n• +150% Conversion rate increase\n• Scalable architecture\n• Delivered on time & within budget`;
            setFormData(prev => ({
                ...prev,
                Desicription_: prev.Desicription_ ? `${prev.Desicription_}\n\n${template}` : template
            }));
        } else if (type === 'quick') {
            const template = `A high-performance modern web platform tailored with custom animations, responsive layouts, and seamless backend integrations. Designed to maximize conversions and user retention.`;
            setFormData(prev => ({
                ...prev,
                Desicription_: prev.Desicription_ ? `${prev.Desicription_} ${template}` : template
            }));
        }
    };

    // Calculate metrics
    const stats = useMemo(() => {
        const total = portfolios.length;
        let totalMedia = 0;
        let totalWithLinks = 0;
        let latestDate = null;

        portfolios.forEach(p => {
            if (p.Project_thumnail) totalMedia += 1;
            if (p.project_images_) {
                totalMedia += Array.isArray(p.project_images_) ? p.project_images_.length : 1;
            }
            if (p.project_url || p.project_link) {
                totalWithLinks += 1;
            }
            const d = new Date(p.created);
            if (!latestDate || d > latestDate) {
                latestDate = d;
            }
        });

        return {
            total,
            totalMedia,
            totalWithLinks,
            latest: latestDate ? latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'
        };
    }, [portfolios]);

    // Filtering & Sorting
    const filteredAndSorted = useMemo(() => {
        let list = portfolios.filter(p => {
            const nameMatch = (p.project_name || '').toLowerCase().includes(search.toLowerCase());
            const descMatch = (p.Desicription_ || '').toLowerCase().includes(search.toLowerCase());
            const linkMatch = (p.project_url || p.project_link || '').toLowerCase().includes(search.toLowerCase());
            const matchesSearch = nameMatch || descMatch || linkMatch;

            if (!matchesSearch) return false;

            if (filterCategory === 'with-gallery') {
                const hasGallery = p.project_images_ && (Array.isArray(p.project_images_) ? p.project_images_.length > 0 : true);
                return hasGallery;
            }
            if (filterCategory === 'with-link') {
                return Boolean(p.project_url || p.project_link);
            }
            return true;
        });

        list.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.created || 0) - new Date(a.created || 0);
            }
            if (sortBy === 'oldest') {
                return new Date(a.created || 0) - new Date(b.created || 0);
            }
            if (sortBy === 'alphabetical') {
                return (a.project_name || '').localeCompare(b.project_name || '');
            }
            return 0;
        });

        return list;
    }, [portfolios, search, filterCategory, sortBy]);

    // Open showcase preview
    const openShowcase = (project) => {
        setPreviewProject(project);
        setActiveGalleryIndex(0);
    };

    const getProjectGallery = (project) => {
        if (!project) return [];
        const list = [];
        if (project.Project_thumnail) {
            list.push({ url: getImageUrl(project, project.Project_thumnail), isCover: true, name: 'Cover Thumbnail' });
        }
        if (project.project_images_) {
            const extra = Array.isArray(project.project_images_) ? project.project_images_ : [project.project_images_];
            extra.forEach((img, idx) => {
                list.push({ url: getImageUrl(project, img), isCover: false, name: `Gallery Asset #${idx + 1}` });
            });
        }
        return list;
    };

    const formatUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `https://${url}`;
    };

    return (
        <div className="portfolio-studio-wrapper" style={{ padding: 'var(--container-px)', minHeight: '100%' }}>
            {/* Custom Styles */}
            <style>{`
                .portfolio-studio-wrapper {
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hero-stat-card {
                    background: var(--surface-white);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 4px 20px -2px rgba(59, 130, 246, 0.06);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                .hero-stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 28px -4px rgba(59, 130, 246, 0.12);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .portfolio-card-premium {
                    background: var(--surface-white);
                    border: 1px solid var(--glass-border);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.08);
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .portfolio-card-premium:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.18);
                    border-color: rgba(59, 130, 246, 0.35);
                }
                .portfolio-card-premium:hover .card-img-zoom {
                    transform: scale(1.06);
                }
                .card-img-zoom {
                    transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
                }
                .card-hover-actions {
                    opacity: 0;
                    transform: translateY(8px);
                    transition: all 0.25s ease;
                }
                .portfolio-card-premium:hover .card-hover-actions {
                    opacity: 1;
                    transform: translateY(0);
                }
                .pill-btn {
                    padding: 8px 16px;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    border: 1px solid var(--glass-border);
                    background: white;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .pill-btn:hover, .pill-btn.active {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
                }
                .interactive-dropzone {
                    border: 2px dashed rgba(99, 102, 241, 0.25);
                    border-radius: 18px;
                    transition: all 0.2s ease;
                    background: rgba(248, 250, 252, 0.8);
                }
                .interactive-dropzone.drag-active {
                    border-color: #3b82f6;
                    background: rgba(59, 130, 246, 0.05);
                    transform: scale(1.01);
                }
                .animate-spin { animation: spin 0.8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                /* Custom Scrollbar for Lightbox */
                .custom-dark-scroll::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-dark-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .custom-dark-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                }
                .custom-dark-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed', bottom: '32px', right: '32px', zIndex: 100000,
                    background: toastMessage.type === 'info' ? '#0f172a' : '#10b981',
                    color: 'white', padding: '12px 24px', borderRadius: '16px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontWeight: 600, fontSize: '0.92rem',
                    animation: 'fadeIn 0.25s ease'
                }}>
                    <CheckCircle size={18} />
                    {toastMessage.text}
                </div>
            )}

            {/* Top Studio Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            <Sparkles size={14} />
                            <span>CASE STUDIES & VISUAL PORTFOLIO</span>
                        </div>
                        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
                            Portfolio Studio
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.4rem', maxWidth: '650px' }}>
                            Manage high-converting project showcases, live project URLs, case study narratives, and visual asset galleries.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                resetForm();
                                setIsModalOpen(true);
                            }}
                            className="btn"
                            style={{
                                height: '48px', padding: '0 1.75rem', borderRadius: '14px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.4)',
                                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700,
                                border: 'none', color: 'white', cursor: 'pointer'
                            }}
                        >
                            <Plus size={20} />
                            <span>Add New Project</span>
                        </button>

                        <button
                            onClick={fetchPortfolios}
                            disabled={loading}
                            title="Refresh portfolio items"
                            style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: 'white', border: '1px solid var(--glass-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Metrics & Analytics Bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem'
                }}>
                    <div className="hero-stat-card">
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <FolderKanban size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Projects
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
                                {stats.total}
                            </div>
                        </div>
                    </div>

                    <div className="hero-stat-card">
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Globe size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Live URLs Linked
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
                                {stats.totalWithLinks} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>sites</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-stat-card">
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Media Assets
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
                                {stats.totalMedia} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>files</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-stat-card">
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Landing Status
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live & Synced</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner with Re-Login CTA if session expired */}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
                    background: '#fef2f2', border: '1px solid #fee2e2',
                    borderRadius: '16px', padding: '1rem 1.5rem', marginBottom: '2rem',
                    color: '#ef4444', fontSize: '0.95rem', fontWeight: 500,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                        <AlertCircle size={20} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid token') || error.toLowerCase().includes('token required')) && (
                            <button
                                onClick={() => {
                                    pb.authStore.clear();
                                    window.location.href = '/?login=true';
                                }}
                                style={{
                                    background: '#ef4444', color: 'white', border: 'none',
                                    padding: '6px 14px', borderRadius: '10px', fontSize: '0.85rem',
                                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                Sign In Again ↗
                            </button>
                        )}
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Control Filters & Search Bar */}
            <div style={{
                background: 'white', borderRadius: '20px', padding: '1rem 1.25rem',
                border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
                marginBottom: '2rem', display: 'flex', flexWrap: 'wrap',
                alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
            }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
                    <Search size={18} style={{
                        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)', pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder="Search by name, description, or live URL..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', height: '44px', paddingLeft: '46px', paddingRight: search ? '38px' : '16px',
                            borderRadius: '12px', border: '1px solid var(--glass-border)',
                            fontSize: '0.9rem', outline: 'none', background: 'var(--neural-bg)',
                            color: 'var(--text-primary)', transition: 'all 0.2s'
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center'
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setFilterCategory('all')}
                        className={`pill-btn ${filterCategory === 'all' ? 'active' : ''}`}
                    >
                        All ({portfolios.length})
                    </button>
                    <button
                        onClick={() => setFilterCategory('with-link')}
                        className={`pill-btn ${filterCategory === 'with-link' ? 'active' : ''}`}
                    >
                        <Globe size={14} /> With Live URL ({stats.totalWithLinks})
                    </button>
                    <button
                        onClick={() => setFilterCategory('with-gallery')}
                        className={`pill-btn ${filterCategory === 'with-gallery' ? 'active' : ''}`}
                    >
                        <Layers size={14} /> Multi-Asset Gallery
                    </button>
                </div>

                {/* Sort & View Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{
                            height: '40px', padding: '0 1rem', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'var(--neural-bg)',
                            fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)',
                            cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                        <option value="alphabetical">Sort: Title (A-Z)</option>
                    </select>

                    <div style={{ display: 'flex', background: 'var(--neural-bg)', borderRadius: '12px', padding: '3px', border: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent',
                                color: viewMode === 'grid' ? '#3b82f6' : 'var(--text-muted)',
                                padding: '6px 10px', borderRadius: '9px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', boxShadow: viewMode === 'grid' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s'
                            }}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                border: 'none', background: viewMode === 'list' ? 'white' : 'transparent',
                                color: viewMode === 'list' ? '#3b82f6' : 'var(--text-muted)',
                                padding: '6px 10px', borderRadius: '9px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s'
                            }}
                            title="List / Table View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects Presentation Body */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '420px', background: 'white' }}>
                            <div className="animate-pulse" style={{ height: '220px', background: '#e2e8f0' }} />
                            <div style={{ padding: '1.5rem' }}>
                                <div className="animate-pulse" style={{ height: '20px', background: '#e2e8f0', borderRadius: '6px', width: '40%', marginBottom: '1rem' }} />
                                <div className="animate-pulse" style={{ height: '24px', background: '#e2e8f0', borderRadius: '6px', width: '75%', marginBottom: '1rem' }} />
                                <div className="animate-pulse" style={{ height: '14px', background: '#e2e8f0', borderRadius: '4px', width: '100%', marginBottom: '0.5rem' }} />
                                <div className="animate-pulse" style={{ height: '14px', background: '#e2e8f0', borderRadius: '4px', width: '80%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredAndSorted.length === 0 ? (
                <div style={{
                    background: 'white', borderRadius: '28px', border: '1px solid var(--glass-border)',
                    padding: '5rem 2rem', textAlign: 'center', boxShadow: '0 10px 40px -10px rgba(59,130,246,0.06)',
                    maxWidth: '800px', margin: '0 auto'
                }}>
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '28px',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.18) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                        color: '#3b82f6'
                    }}>
                        <Briefcase size={44} />
                    </div>

                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        {search ? "No matching projects found" : "Your Portfolio is Waiting to Shine"}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                        {search 
                            ? `We couldn't find any showcase matching "${search}". Try searching with different keywords.`
                            : "Publish your best client case studies, live project URLs, and visual designs to impress your prospective customers."}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {search ? (
                            <button
                                onClick={() => setSearch('')}
                                className="btn glass"
                                style={{ padding: '0 1.75rem', height: '46px' }}
                            >
                                Clear Search Filter
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }}
                                className="btn"
                                style={{
                                    height: '50px', padding: '0 2.25rem', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white', display: 'flex', alignItems: 'center', gap: '8px',
                                    fontWeight: 700, border: 'none', cursor: 'pointer',
                                    boxShadow: '0 8px 24px -4px rgba(59,130,246,0.4)'
                                }}
                            >
                                <Plus size={20} />
                                <span>Create Your First Showcase</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '2rem'
                }}>
                    {filteredAndSorted.map(project => {
                        const gallery = getProjectGallery(project);
                        const coverUrl = gallery.length > 0 ? gallery[0].url : null;
                        const dateFormatted = project.created 
                            ? new Date(project.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Recent';
                        const projectUrl = project.project_url || project.project_link;

                        return (
                            <div key={project.id} className="portfolio-card-premium">
                                {/* Card Cover Image */}
                                <div style={{ height: '220px', position: 'relative', background: '#0f172a', overflow: 'hidden' }}>
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={project.project_name}
                                            className="card-img-zoom"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                            <ImageIcon size={44} style={{ opacity: 0.4, marginBottom: '8px' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No cover image set</span>
                                        </div>
                                    )}

                                    {/* Overlay Gradient */}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, transparent 60%)' }} />

                                    {/* Top Badges */}
                                    <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '8px', zIndex: 2, flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '100px', background: 'rgba(15, 23, 42, 0.75)',
                                            backdropFilter: 'blur(8px)', color: 'white', fontSize: '0.72rem', fontWeight: 700,
                                            letterSpacing: '0.05em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.15)'
                                        }}>
                                            Case Study
                                        </span>
                                        {projectUrl && (
                                            <a
                                                href={formatUrl(projectUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    padding: '4px 10px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.9)',
                                                    backdropFilter: 'blur(8px)', color: 'white', fontSize: '0.72rem', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none'
                                                }}
                                            >
                                                <Globe size={11} /> Live Demo ↗
                                            </a>
                                        )}
                                        {gallery.length > 1 && (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.85)',
                                                backdropFilter: 'blur(8px)', color: 'white', fontSize: '0.72rem', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                <Layers size={12} /> {gallery.length} Media
                                            </span>
                                        )}
                                    </div>

                                    {/* Hover Action Controls */}
                                    <div className="card-hover-actions" style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        display: 'flex', gap: '6px', zIndex: 3
                                    }}>
                                        <button
                                            onClick={() => openShowcase(project)}
                                            title="Quick Preview"
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.95)', border: 'none',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#0f172a', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(project)}
                                            title="Edit Project"
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.95)', border: 'none',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#3b82f6', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(project)}
                                            title="Delete Project"
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.95)', border: 'none',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#ef4444', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Bottom Image title subtitle overlay */}
                                    <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px', color: 'white', zIndex: 2 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Calendar size={12} /> {dateFormatted}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                            {project.project_name}
                                        </h3>
                                    </div>

                                    {projectUrl && (
                                        <a
                                            href={formatUrl(projectUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#3b82f6', fontSize: '0.82rem', fontWeight: 600,
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                textDecoration: 'none', marginBottom: '0.75rem',
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            <LinkIcon size={12} /> {projectUrl.replace(/^https?:\/\//, '')}
                                        </a>
                                    )}

                                    <div className="line-clamp-3" style={{
                                        color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6,
                                        marginBottom: '1.5rem', flex: 1
                                    }}>
                                        <CleanSnippet text={project.Desicription_} />
                                    </div>

                                    {/* Card Action Footer */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        paddingTop: '1rem', borderTop: '1px solid #f1f5f9', marginTop: 'auto'
                                    }}>
                                        <button
                                            onClick={() => openShowcase(project)}
                                            style={{
                                                background: 'none', border: 'none', color: '#3b82f6',
                                                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px', padding: 0
                                            }}
                                        >
                                            <span>View Showcase</span>
                                            <ChevronRight size={16} />
                                        </button>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {projectUrl && (
                                                <a
                                                    href={formatUrl(projectUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        background: '#eff6ff', border: '1px solid #dbeafe',
                                                        padding: '6px 12px', borderRadius: '10px',
                                                        fontSize: '0.82rem', fontWeight: 700, color: '#2563eb',
                                                        display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none'
                                                    }}
                                                >
                                                    <ExternalLink size={12} /> Live Site
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleEdit(project)}
                                                style={{
                                                    background: '#f8fafc', border: '1px solid #e2e8f0',
                                                    padding: '6px 12px', borderRadius: '10px',
                                                    fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <Edit3 size={13} />
                                                <span>Edit</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List / Table View */
                <div style={{
                    background: 'white', borderRadius: '24px', border: '1px solid var(--glass-border)',
                    overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Showcase / Project</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live URL</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description Snippet</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Media</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSorted.map(project => {
                                const gallery = getProjectGallery(project);
                                const coverUrl = gallery.length > 0 ? gallery[0].url : null;
                                const projectUrl = project.project_url || project.project_link;

                                return (
                                    <tr key={project.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '64px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
                                                    {coverUrl ? (
                                                        <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                            <ImageIcon size={18} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                        {project.project_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginTop: '2px' }}>
                                                        Case Study
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            {projectUrl ? (
                                                <a
                                                    href={formatUrl(projectUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#2563eb', fontWeight: 600, fontSize: '0.85rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <Globe size={13} />
                                                    <span>Open Link ↗</span>
                                                </a>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', maxWidth: '300px' }}>
                                            <div className="line-clamp-2" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <CleanSnippet text={project.Desicription_} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.08)',
                                                color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700
                                            }}>
                                                {gallery.length} files
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    onClick={() => openShowcase(project)}
                                                    title="Preview Showcase"
                                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(project)}
                                                    title="Edit"
                                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(project)}
                                                    title="Delete"
                                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Redesigned Project Studio Modal (Add / Edit) */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(8px)'
                    }} onClick={resetForm} />

                    <div style={{
                        position: 'relative', maxWidth: '980px', width: '100%',
                        borderRadius: '28px', background: 'white',
                        boxShadow: '0 30px 70px -10px rgba(0,0,0,0.3)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        maxHeight: '92vh', zIndex: 10, animation: 'fadeIn 0.25s ease'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.5rem 2rem', background: 'linear-gradient(to right, #f8fafc, white)',
                            borderBottom: '1px solid var(--glass-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '46px', height: '46px', borderRadius: '14px',
                                    background: editingProject ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)'
                                }}>
                                    {editingProject ? <Edit3 size={22} /> : <Plus size={22} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {editingProject ? 'Edit Portfolio Showcase' : 'Create New Portfolio Showcase'}
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {editingProject ? 'Update case study details, direct URL link, or replace visual assets' : 'Publish a new project case study with direct project link & gallery assets'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={resetForm}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: '#f1f5f9', border: 'none', color: '#64748b',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSubmit} style={{
                            flex: 1, overflowY: 'auto', padding: '2rem',
                            display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 1fr)', gap: '2rem'
                        }} className="project-form-grid">
                            <style>{`
                                @media (max-width: 860px) {
                                    .project-form-grid { grid-template-columns: 1fr !important; }
                                    .project-sidebar { order: -1; }
                                }
                            `}</style>

                            {/* Left Column: Project Narrative */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Project Title *</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 500 }}>
                                            {formData.project_name.length} / 80 chars
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={80}
                                        value={formData.project_name}
                                        onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                                        placeholder="e.g. Acme FinTech - NextGen AI Dashboard"
                                        style={{
                                            width: '100%', height: '48px', padding: '0 1rem',
                                            borderRadius: '12px', border: '1px solid #cbd5e1',
                                            fontSize: '0.95rem', outline: 'none', fontWeight: 600
                                        }}
                                    />
                                </div>

                                {/* Live Project URL Field */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Globe size={14} /> Direct Project Link / Live URL
                                        </label>
                                        {formData.project_url && (
                                            <a
                                                href={formatUrl(formData.project_url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none'
                                                }}
                                            >
                                                Test Link <ExternalLink size={11} />
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="url"
                                            value={formData.project_url}
                                            onChange={e => setFormData({ ...formData, project_url: e.target.value })}
                                            placeholder="https://client-project.com (or leave empty if internal)"
                                            style={{
                                                width: '100%', height: '48px', padding: '0 1rem 0 2.5rem',
                                                borderRadius: '12px', border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem', outline: 'none'
                                            }}
                                        />
                                        <LinkIcon size={16} style={{
                                            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                            color: '#94a3b8'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <label style={{ margin: 0 }}>Case Study & Description *</label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => insertTemplate('casestudy')}
                                                style={{
                                                    background: '#eff6ff', border: '1px solid #dbeafe',
                                                    color: '#2563eb', padding: '3px 8px', borderRadius: '6px',
                                                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                + Case Study Template
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertTemplate('quick')}
                                                style={{
                                                    background: '#f8fafc', border: '1px solid #e2e8f0',
                                                    color: '#64748b', padding: '3px 8px', borderRadius: '6px',
                                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                + Quick Summary
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        required
                                        value={formData.Desicription_}
                                        onChange={e => setFormData({ ...formData, Desicription_: e.target.value })}
                                        placeholder="Detail the project story, business challenge, our tailored solution, and the metrics achieved..."
                                        style={{
                                            width: '100%', flex: 1, minHeight: '220px', padding: '1rem',
                                            borderRadius: '12px', border: '1px solid #cbd5e1',
                                            fontSize: '0.92rem', lineHeight: 1.6, outline: 'none', resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Visual Media Studio */}
                            <div className="project-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Primary Cover Upload */}
                                <div>
                                    <label>Thumbnail Cover Image</label>
                                    <div
                                        onDragOver={e => { e.preventDefault(); setDragActiveThumb(true); }}
                                        onDragLeave={() => setDragActiveThumb(false)}
                                        onDrop={handleThumbnailDrop}
                                        onClick={() => document.getElementById('project_thumbnail_input').click()}
                                        className={`interactive-dropzone ${dragActiveThumb ? 'drag-active' : ''}`}
                                        style={{
                                            height: '180px', cursor: 'pointer', overflow: 'hidden',
                                            position: 'relative', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', textAlign: 'center'
                                        }}
                                    >
                                        {thumbnailPreview ? (
                                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                <img src={thumbnailPreview} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{
                                                    position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', gap: '8px', fontSize: '0.85rem', fontWeight: 600,
                                                    opacity: 0, transition: 'opacity 0.2s'
                                                }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                                    <RefreshCw size={18} /> Click to replace cover
                                                </div>
                                                <div style={{
                                                    position: 'absolute', top: '8px', left: '8px',
                                                    background: 'rgba(16, 185, 129, 0.95)', color: 'white',
                                                    fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                                                }}>
                                                    Cover Active
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1.5rem' }}>
                                                <div style={{
                                                    width: '44px', height: '44px', borderRadius: '12px',
                                                    background: '#eff6ff', color: '#3b82f6',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    margin: '0 auto 10px'
                                                }}>
                                                    <ImageIcon size={22} />
                                                </div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    Upload Cover Thumbnail
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    Drag & drop or click to browse (PNG, JPG, WebP)
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            id="project_thumbnail_input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbnailChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Gallery Images Upload */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <label style={{ margin: 0 }}>Gallery Showcase ({imagePreviews.length})</label>
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('project_gallery_input').click()}
                                            style={{
                                                background: '#eff6ff', border: '1px solid #dbeafe',
                                                color: '#2563eb', padding: '4px 10px', borderRadius: '8px',
                                                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '5px'
                                            }}
                                        >
                                            <Upload size={13} /> Add Photos
                                        </button>
                                    </div>

                                    <div
                                        onDragOver={e => { e.preventDefault(); setDragActiveGallery(true); }}
                                        onDragLeave={() => setDragActiveGallery(false)}
                                        onDrop={handleGalleryDrop}
                                        onClick={() => imagePreviews.length === 0 && document.getElementById('project_gallery_input').click()}
                                        className={`interactive-dropzone ${dragActiveGallery ? 'drag-active' : ''}`}
                                        style={{
                                            minHeight: '130px', padding: '12px',
                                            display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                        }}
                                    >
                                        {imagePreviews.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                                <Upload size={24} style={{ color: '#94a3b8', marginBottom: '6px' }} />
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    Drop multiple gallery screenshots here
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    Before/after previews, wireframes, and UI captures
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                                gap: '8px', maxHeight: '180px', overflowY: 'auto'
                                            }}>
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={index} style={{
                                                        position: 'relative', aspectRatio: '1', borderRadius: '10px',
                                                        overflow: 'hidden', border: '1px solid #cbd5e1', background: '#0f172a'
                                                    }}>
                                                        <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeImage(index);
                                                            }}
                                                            style={{
                                                                position: 'absolute', top: '4px', right: '4px',
                                                                background: 'rgba(239, 68, 68, 0.95)', color: 'white',
                                                                border: 'none', borderRadius: '6px', cursor: 'pointer',
                                                                width: '22px', height: '22px', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Remove image"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            id="project_gallery_input"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1.25rem 2rem', background: '#f8fafc',
                            borderTop: '1px solid var(--glass-border)',
                            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem'
                        }}>
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{
                                    padding: '0 1.5rem', height: '46px', borderRadius: '12px',
                                    background: 'transparent', border: '1px solid #cbd5e1',
                                    color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '0 2.5rem', height: '46px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                                    opacity: isSubmitting ? 0.7 : 1
                                }}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                <span>{isSubmitting ? 'Saving...' : (editingProject ? 'Save Changes' : 'Publish Showcase')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Redesigned Showcase Presentation / Case Study Display Modal */}
            {previewProject && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 'clamp(1rem, 3vw, 2.5rem)', animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div
                        onClick={() => setPreviewProject(null)}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(5, 8, 22, 0.85)', backdropFilter: 'blur(16px)'
                        }}
                    />

                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '1200px', maxHeight: '90vh',
                        borderRadius: '28px', background: '#0b0f19',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.2)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        color: 'white'
                    }}>
                        {/* Top Ambient Highlight */}
                        <div style={{
                            position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.8) 50%, transparent 100%)',
                            zIndex: 10
                        }} />

                        {/* Showcase Header Bar */}
                        <div style={{
                            padding: '1.25rem 2rem', background: 'rgba(17, 24, 39, 0.85)',
                            backdropFilter: 'blur(12px)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                            zIndex: 5
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '100px',
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.25) 100%)',
                                        color: '#93c5fd', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                                        border: '1px solid rgba(99,102,241,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                    }}>
                                        <Sparkles size={12} /> CASE STUDY SHOWCASE
                                    </span>
                                    {(previewProject.project_url || previewProject.project_link) && (
                                        <a
                                            href={formatUrl(previewProject.project_url || previewProject.project_link)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '4px 12px', borderRadius: '100px',
                                                background: 'rgba(16,185,129,0.15)',
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                color: '#34d399', fontSize: '0.72rem', fontWeight: 700,
                                                display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <Globe size={12} /> Live Site ↗
                                        </a>
                                    )}
                                </div>
                                <h2 style={{ margin: '6px 0 0', fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                                    {previewProject.project_name}
                                </h2>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(previewProject.project_url || previewProject.project_link) && (
                                    <a
                                        href={formatUrl(previewProject.project_url || previewProject.project_link)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            color: 'white', padding: '8px 18px', borderRadius: '12px',
                                            fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            boxShadow: '0 4px 16px rgba(59,130,246,0.4)'
                                        }}
                                    >
                                        <Globe size={14} /> Open Live Project <ArrowUpRight size={14} />
                                    </a>
                                )}
                                <button
                                    onClick={() => {
                                        const p = previewProject;
                                        setPreviewProject(null);
                                        handleEdit(p);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#e2e8f0', padding: '8px 16px', borderRadius: '12px',
                                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Edit3 size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => setPreviewProject(null)}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Showcase Content Body (Split Layout: Media Stage + Narrative Studio) */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)',
                            flex: 1, overflowY: 'auto'
                        }} className="showcase-modal-body">
                            <style>{`
                                @media (max-width: 960px) {
                                    .showcase-modal-body { grid-template-columns: 1fr !important; }
                                }
                            `}</style>

                            {/* Left: Interactive Visual Media Stage */}
                            {(() => {
                                const gallery = getProjectGallery(previewProject);
                                const currentAsset = gallery[activeGalleryIndex] || gallery[0];

                                return (
                                    <div style={{
                                        background: '#070b14', display: 'flex', flexDirection: 'column',
                                        position: 'relative', minHeight: '440px',
                                        padding: '1.75rem', borderRight: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                        {/* Top Image Stage Status */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                                                background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.08)'
                                            }}>
                                                {gallery.length > 0 ? `Asset ${activeGalleryIndex + 1} of ${gallery.length} • ${currentAsset?.name || 'Image'}` : 'No Media'}
                                            </span>
                                            {currentAsset && (
                                                <a
                                                    href={currentAsset.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#94a3b8', fontSize: '0.78rem', display: 'flex',
                                                        alignItems: 'center', gap: '4px', textDecoration: 'none'
                                                    }}
                                                >
                                                    <Maximize2 size={13} /> High-Res
                                                </a>
                                            )}
                                        </div>

                                        {/* Main Spotlight Asset View */}
                                        <div style={{
                                            position: 'relative', width: '100%', flex: 1, minHeight: '340px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#040711', borderRadius: '20px', overflow: 'hidden',
                                            border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)'
                                        }}>
                                            {currentAsset ? (
                                                <>
                                                    <img
                                                        src={currentAsset.url}
                                                        alt=""
                                                        style={{
                                                            maxWidth: '100%', maxHeight: '460px', width: 'auto', height: 'auto',
                                                            objectFit: 'contain', transition: 'all 0.3s ease'
                                                        }}
                                                    />

                                                    {/* Navigation Arrows */}
                                                    {gallery.length > 1 && (
                                                        <>
                                                            <button
                                                                onClick={() => setActiveGalleryIndex(prev => (prev === 0 ? gallery.length - 1 : prev - 1))}
                                                                style={{
                                                                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                                    background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(10px)',
                                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <ArrowLeft size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveGalleryIndex(prev => (prev === gallery.length - 1 ? 0 : prev + 1))}
                                                                style={{
                                                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                                    background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(10px)',
                                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <ArrowRight size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                                                    <ImageIcon size={52} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No visual assets attached to this showcase.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Gallery Thumbnails Strip */}
                                        {gallery.length > 1 && (
                                            <div className="custom-dark-scroll" style={{
                                                display: 'flex', gap: '10px', overflowX: 'auto',
                                                paddingTop: '1.25rem', marginTop: 'auto'
                                            }}>
                                                {gallery.map((asset, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveGalleryIndex(idx)}
                                                        style={{
                                                            width: '74px', height: '56px', borderRadius: '12px',
                                                            overflow: 'hidden', flexShrink: 0, padding: 0,
                                                            border: idx === activeGalleryIndex ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                                            boxShadow: idx === activeGalleryIndex ? '0 0 14px rgba(59,130,246,0.5)' : 'none',
                                                            opacity: idx === activeGalleryIndex ? 1 : 0.5,
                                                            cursor: 'pointer', background: '#070b14',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Right: Rich Formatted Case Study Narrative */}
                            <div className="custom-dark-scroll" style={{
                                padding: '2rem', display: 'flex', flexDirection: 'column',
                                background: '#0b0f19', overflowY: 'auto'
                            }}>
                                {/* Project Quick Meta Bar */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '10px', marginBottom: '1.75rem', paddingBottom: '1.5rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Published</div>
                                        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>
                                            {previewProject.created ? new Date(previewProject.created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'}
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Showcase Assets</div>
                                        <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>
                                            {getProjectGallery(previewProject).length} Visuals
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Deliverable</div>
                                        <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>
                                            Live & Verified
                                        </div>
                                    </div>
                                </div>

                                {/* Formatted Case Study Blocks */}
                                <div style={{ flex: 1 }}>
                                    <CaseStudyRenderer text={previewProject.Desicription_} />
                                </div>

                                {/* Action Buttons Footer */}
                                <div style={{
                                    paddingTop: '1.5rem', marginTop: '2rem',
                                    borderTop: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                                }}>
                                    <button
                                        onClick={() => {
                                            if (navigator.clipboard) {
                                                const linkToCopy = previewProject.project_url || previewProject.project_link || (window.location.origin + '#portfolio');
                                                navigator.clipboard.writeText(linkToCopy);
                                                showToast('Showcase link copied to clipboard!');
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                                            color: '#cbd5e1', padding: '10px 18px', borderRadius: '12px',
                                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Copy size={15} /> Copy Case Study Link
                                    </button>

                                    {(previewProject.project_url || previewProject.project_link) && (
                                        <a
                                            href={formatUrl(previewProject.project_url || previewProject.project_link)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none'
                                            }}
                                        >
                                            Visit Web Project <ArrowUpRight size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }} />
                    <div style={{
                        position: 'relative', maxWidth: '440px', width: '100%',
                        background: 'white', borderRadius: '24px', padding: '2rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center',
                        zIndex: 10, animation: 'fadeIn 0.2s ease'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '18px',
                            background: '#fef2f2', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem'
                        }}>
                            <Trash2 size={26} />
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Delete Showcase?
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                            Are you sure you want to delete <strong>"{deleteTarget.project_name}"</strong>? This will permanently remove its case study and associated images.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                style={{
                                    flex: 1, height: '44px', borderRadius: '12px',
                                    border: '1px solid #cbd5e1', background: 'transparent',
                                    color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    flex: 1, height: '44px', borderRadius: '12px',
                                    border: 'none', background: '#ef4444',
                                    color: 'white', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(239,68,68,0.3)'
                                }}
                            >
                                Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Intelligent Case Study Section Renderer
 * Parses structured markdown & sections (Overview, Challenge, Solution, Impact) into styled cards
 */
function CaseStudyRenderer({ text }) {
    if (!text || !text.trim()) {
        return <div style={{ color: '#64748b', fontStyle: 'italic' }}>No project narrative provided.</div>;
    }

    // Split text into section blocks based on double asterisks headers like **Heading:**
    const raw = text.trim();
    const sectionPattern = /\*\*([^*]+)\*\*:\s*([\s\S]*?)(?=(\*\*[^*]+\*\*:\s*|$))/g;
    const sections = [];
    let match;

    while ((match = sectionPattern.exec(raw)) !== null) {
        sections.push({
            title: match[1].trim(),
            content: match[2].trim()
        });
    }

    // If structured sections were found, render them as gorgeous stylized cards
    if (sections.length > 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {sections.map((sec, idx) => {
                    const titleLower = sec.title.toLowerCase();
                    
                    let icon = <Briefcase size={18} />;
                    let badgeBg = 'rgba(59, 130, 246, 0.15)';
                    let badgeColor = '#60a5fa';
                    let cardBorder = 'rgba(59, 130, 246, 0.2)';
                    let cardBg = 'rgba(59, 130, 246, 0.03)';

                    if (titleLower.includes('challenge') || titleLower.includes('problem')) {
                        icon = <Target size={18} />;
                        badgeBg = 'rgba(245, 158, 11, 0.15)';
                        badgeColor = '#fbbf24';
                        cardBorder = 'rgba(245, 158, 11, 0.25)';
                        cardBg = 'rgba(245, 158, 11, 0.03)';
                    } else if (titleLower.includes('solution') || titleLower.includes('approach')) {
                        icon = <Sparkles size={18} />;
                        badgeBg = 'rgba(139, 92, 246, 0.15)';
                        badgeColor = '#a78bfa';
                        cardBorder = 'rgba(139, 92, 246, 0.25)';
                        cardBg = 'rgba(139, 92, 246, 0.03)';
                    } else if (titleLower.includes('impact') || titleLower.includes('result') || titleLower.includes('metric')) {
                        icon = <TrendingUp size={18} />;
                        badgeBg = 'rgba(16, 185, 129, 0.15)';
                        badgeColor = '#34d399';
                        cardBorder = 'rgba(16, 185, 129, 0.3)';
                        cardBg = 'rgba(16, 185, 129, 0.04)';
                    }

                    // Check if content contains bullet points
                    const isBulletList = sec.content.includes('•') || sec.content.includes('\n-') || sec.content.startsWith('-');
                    const bullets = isBulletList 
                        ? sec.content.split(/\n[•\-\*]\s*|^[•\-\*]\s*/).map(s => s.trim()).filter(Boolean)
                        : [];

                    return (
                        <div
                            key={idx}
                            style={{
                                background: cardBg,
                                border: `1px solid ${cardBorder}`,
                                borderRadius: '18px',
                                padding: '1.25rem 1.5rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '10px',
                                    background: badgeBg, color: badgeColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {icon}
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
                                    {sec.title}
                                </h4>
                            </div>

                            {isBulletList && bullets.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                                    {bullets.map((b, bIdx) => (
                                        <div
                                            key={bIdx}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                                background: 'rgba(255,255,255,0.03)', padding: '8px 12px',
                                                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)'
                                            }}
                                        >
                                            <CheckCircle2 size={16} style={{ color: badgeColor, flexShrink: 0, marginTop: '2px' }} />
                                            <span style={{ color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.5, fontWeight: 500 }}>
                                                {b}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                                    {sec.content}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Fallback parser for standard markdown or unstructured text
    const paragraphs = raw.split(/\n\n+/);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paragraphs.map((p, pIdx) => {
                // Parse inline **bold**
                const parts = p.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={pIdx} style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.75, margin: 0 }}>
                        {parts.map((part, partIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIdx} style={{ color: 'white', fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
}

/**
 * Clean snippet helper for card view preview (strips raw markdown symbols)
 */
function CleanSnippet({ text }) {
    if (!text) return 'No description provided.';
    const cleaned = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^[•\-\*]\s*/gm, '• ')
        .trim();
    return cleaned;
}
