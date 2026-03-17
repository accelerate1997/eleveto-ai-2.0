import React, { useState } from 'react';
import { Search, MapPin, Briefcase, Sliders, Zap, Loader2 } from 'lucide-react';
import GoogleLeadResults from './GoogleLeadResults';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function GoogleLeadGen() {
    const [form, setForm] = useState({
        keyword: '',
        location: '',
        industry: '',
        maxScrolls: 50,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [lastQuery, setLastQuery] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.keyword.trim() || !form.location.trim()) {
            setError('Keyword and location are required.');
            return;
        }

        setIsLoading(true);
        setResults(null);
        setError('');

        const query = [form.keyword, form.industry, 'in', form.location].filter(Boolean).join(' ');
        setLastQuery(query);

        try {
            // Check server health first
            const health = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
            if (!health || !health.ok) {
                throw new Error('Scraper server is not running. Please start the server with: cd server && npm start');
            }

            const res = await fetch(`${SERVER_URL}/api/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: form.keyword.trim(),
                    location: form.location.trim(),
                    industry: form.industry.trim(),
                    maxScrolls: form.maxScrolls,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Scrape failed');
            setResults(data.results);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Search Form Card */}
            <div className="glass-card" style={{
                marginBottom: '2rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'var(--gradient-indigo)',
                        padding: '10px',
                        borderRadius: '14px',
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
                    }}>
                        <Search size={22} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Google Maps Search</h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                            Extract business leads using Google Maps intelligence
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '14px', padding: '1rem 1.25rem',
                        color: '#dc2626', fontSize: '0.87rem', marginBottom: '1.5rem',
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    }}>
                        <span style={{ marginTop: '1px' }}>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Keyword */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label htmlFor="keyword" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Search size={13} /> Keyword
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="keyword"
                                    name="keyword"
                                    type="text"
                                    value={form.keyword}
                                    onChange={handleChange}
                                    placeholder="e.g. Interior Designers"
                                    required
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label htmlFor="location" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={13} /> Location
                            </label>
                            <input
                                id="location"
                                name="location"
                                type="text"
                                value={form.location}
                                onChange={handleChange}
                                placeholder="e.g. Dubai"
                                required
                            />
                        </div>

                        {/* Industry */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label htmlFor="industry" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Briefcase size={13} /> Industry <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', fontSize: '0.7rem' }}>(optional)</span>
                            </label>
                            <input
                                id="industry"
                                name="industry"
                                type="text"
                                value={form.industry}
                                onChange={handleChange}
                                placeholder="e.g. Architecture"
                            />
                        </div>

                        {/* Max Scrolls */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label htmlFor="maxScrolls" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sliders size={13} /> Max Results <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', fontSize: '0.7rem' }}>(scroll depth)</span>
                            </label>
                            <input
                                id="maxScrolls"
                                name="maxScrolls"
                                type="number"
                                min="10"
                                max="200"
                                value={form.maxScrolls}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        disabled={isLoading}
                        style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Scraping Google Maps...</span>
                            </>
                        ) : (
                            <>
                                <Zap size={18} />
                                <span>Start Extraction</span>
                            </>
                        )}
                    </button>

                    {isLoading && (
                        <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🔍</span> Searching for <strong>&ldquo;{lastQuery}&rdquo;</strong> — this may take 1–3 minutes...
                        </p>
                    )}
                </form>
            </div>

            {/* Results Section */}
            {results !== null && (
                <GoogleLeadResults results={results} searchQuery={lastQuery} />
            )}
        </div>
    );
}
