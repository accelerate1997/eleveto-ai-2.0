import React, { useState } from 'react';
import GoogleLeadGen from './GoogleLeadGen';
import GmapsLeadExtracted from './GmapsLeadExtracted';
import { Search, Linkedin, Zap, MapPin } from 'lucide-react';

const TABS = [
    { id: 'scraper', label: 'Google Maps Scraper', icon: Search, component: GoogleLeadGen },
    { id: 'extracted', label: 'GMaps Lead Extracted', icon: MapPin, component: GmapsLeadExtracted },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, soon: true },
];

export default function LeadGeneration({ defaultTab = 'scraper' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Re-sync if parent changes defaultTab
    React.useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    const ActiveComponent = TABS.find(t => t.id === activeTab)?.component;

    return (
        <div className="dashboard-view">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: '20px', border: '1px solid rgba(79, 70, 229, 0.15)', marginBottom: '0.75rem' }}>
                        <Zap size={14} style={{ color: 'var(--primary-indigo)' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-indigo)' }}>
                            Lead Extraction Engine
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, marginBottom: '0.4rem' }}>Lead Generation</h1>
                    <p className="subtitle" style={{ textAlign: 'left', margin: 0, opacity: 0.7 }}>
                        Automated lead extraction • Google Maps Intelligence
                    </p>
                </div>
            </header>

            {/* Sub-nav Tabs */}
            <div className="tab-scroll" style={{
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                paddingBottom: '0',
            }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.soon && setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.7rem 1.25rem',
                                background: 'none', border: 'none',
                                borderBottom: isActive ? '2px solid var(--primary-indigo)' : '2px solid transparent',
                                color: isActive ? 'var(--primary-indigo)' : 'var(--text-muted)',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.875rem',
                                cursor: tab.soon ? 'not-allowed' : 'pointer',
                                opacity: tab.soon ? 0.4 : 1,
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                                marginBottom: '-1px',
                            }}
                        >
                            <Icon size={15} />
                            {tab.label}
                            {tab.soon && (
                                <span style={{
                                    fontSize: '0.6rem', fontWeight: 700, background: '#e2e8f0',
                                    color: '#64748b', padding: '2px 6px', borderRadius: '6px',
                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}>Soon</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active Sub-Component */}
            {ActiveComponent && <ActiveComponent />}
        </div>
    );
}
