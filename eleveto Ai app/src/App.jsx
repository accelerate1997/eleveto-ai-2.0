import React, { useState, useEffect } from 'react';
import { pb } from './lib/pocketbase';
import AuthForm from './components/AuthForm';
import LandingPage from './components/LandingPage';
import KanbanBoard from './components/KanbanBoard';
import LeadGeneration from './components/LeadGeneration';
import ClientManagement from './components/ClientManagement';
import BookingManagement from './components/BookingManagement';
import Integrations from './components/Integrations';
import EmployeesManager from './components/EmployeesManager';
import PortfolioManagement from './components/PortfolioManagement';
import { Kanban, Zap, Users, LogOut, ChevronRight, Boxes, Activity, Menu, X, Calendar, Plug, ShieldCheck, Briefcase } from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'pipeline',
    view: 'kanban',
    label: 'Pipeline',
    icon: Kanban,
    description: 'Lead management',
    color: '#6366f1',
  },
  {
    id: 'leadgen',
    view: 'leadgen',
    label: 'Lead Generation',
    icon: Zap,
    description: 'Extract leads',
    color: '#06b6d4',
    children: [
      { id: 'scraper', label: 'Google Maps', color: '#10b981' },
      { id: 'extracted', label: 'GMaps Lead Extracted', color: '#6366f1' },
      { id: 'linkedin', label: 'LinkedIn', color: '#0ea5e9', soon: true },
    ],
  },
  {
    id: 'clients',
    view: 'clients',
    label: 'Client Management',
    icon: Users,
    description: 'Converted leads & credentials',
    color: '#10b981',
  },
  {
    id: 'bookings',
    view: 'bookings',
    label: 'Booking Mgt',
    icon: Calendar,
    description: 'Meetings & Calls',
    color: '#f59e0b',
  },
  {
    id: 'integrations',
    view: 'integrations',
    label: 'Integrations',
    icon: Plug,
    description: 'Connect external apps',
    color: '#ec4899', // Pink
  },
  {
    id: 'employees',
    view: 'employees',
    label: 'Team Manager',
    icon: ShieldCheck,
    description: 'Agency staff & invites',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'portfolio',
    view: 'portfolio',
    label: 'Portfolio Mgt',
    icon: Briefcase,
    description: 'Manage agency projects',
    color: '#3b82f6',
  },
];

function App() {
  const [user, setUser] = useState(pb.authStore.model);
  const [view, setView] = useState('kanban');
  const [leadGenTab, setLeadGenTab] = useState('scraper');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
      setUser(model);
    });
  }, []);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    window.location.reload();
  };

  const handleNavClick = (item) => {
    setView(item.view);
    setSidebarOpen(false); // close drawer on mobile after nav
  };

  if (!user) {
    return <AuthForm />;
  }

  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: '1.75rem 1.5rem 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="ElevetoAi Logo" 
            style={{ 
              width: '32px', 
              height: '32px', 
              objectFit: 'contain',
              flexShrink: 0 
            }} 
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ 
            width: '32px', height: '32px', 
            background: 'var(--logo-gradient)', 
            borderRadius: '8px', 
            display: 'none', // Hidden if image loads
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(30, 90, 250, 0.2)',
            flexShrink: 0 
          }}>
            <Boxes size={16} color="white" />
          </div>
          <div>
            <div style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '1.25rem', letterSpacing: '-0.03em',
              color: '#0f172a', 
              display: 'flex',
              alignItems: 'baseline'
            }}>
              Eleveto<span style={{ color: '#3b82f6' }}>Ai</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '-2px' }}>
              Autonomous OS
            </div>
          </div>
        </div>
        {/* Close button — visible on mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            background: '#f1f5f9', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center', color: '#64748b',
          }}
          className="sidebar-close-btn"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Badge */}
      <div style={{
        margin: '1rem 1rem 0.25rem',
        padding: '0.75rem 1rem',
        background: '#f1f5f9',
        borderRadius: '14px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || 'Agent'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.6rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span>
        </div>
      </div>

      {/* Nav Section Label */}
      <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--primary-indigo)', opacity: 0.8 }}>
          Workspace
        </span>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0 0.75rem', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          if (item.id === 'employees' && !user) return null;

          const Icon = item.icon;
          const isActive = view === item.view;
          return (
            <div key={item.id}>
              <button
                onClick={() => handleNavClick(item)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '0.7rem 0.875rem',
                  borderRadius: '12px',
                  background: isActive
                    ? 'rgba(79, 70, 229, 0.08)'
                    : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent'}`,
                  color: isActive ? 'var(--primary-indigo)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: '3px',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                  background: isActive
                    ? `linear-gradient(135deg, ${item.color}, ${item.color}bb)`
                    : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Icon size={16} color={isActive ? 'white' : '#64748b'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 400, marginTop: '1px' }}>{item.description}</div>
                </div>
                {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
              </button>

              {/* Sub-items */}
              {isActive && item.children && (
                <div style={{ marginLeft: '1rem', marginBottom: '4px' }}>
                  {item.children.map(child => {
                    const isChildActive = leadGenTab === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => { if (!child.soon) { setView(item.view); setLeadGenTab(child.id); setSidebarOpen(false); } }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '0.45rem 0.75rem',
                          background: isChildActive ? `${child.color}12` : 'transparent',
                          border: 'none',
                          borderLeft: `2px solid ${child.soon ? '#e2e8f0' : isChildActive ? child.color : child.color + '30'}`,
                          fontSize: '0.8rem', fontWeight: isChildActive ? 700 : child.soon ? 400 : 500,
                          color: child.soon ? 'var(--text-muted)' : isChildActive ? child.color : 'var(--slate-600)',
                          opacity: child.soon ? 0.5 : 1,
                          cursor: child.soon ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          marginBottom: '2px',
                          fontFamily: 'Inter, sans-serif',
                          textAlign: 'left',
                          borderRadius: '0 8px 8px 0',
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: child.soon ? '#cbd5e1' : isChildActive ? child.color : '#94a3b8', flexShrink: 0 }} />
                        {child.label}
                        {child.soon && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, background: '#e2e8f0', color: '#94a3b8', padding: '1px 5px', borderRadius: '5px', textTransform: 'uppercase' }}>Soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* System Status */}
      <div style={{
        margin: '0.75rem',
        padding: '0.875rem',
        background: 'rgba(79, 70, 229, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(79, 70, 229, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Activity size={12} style={{ color: '#06b6d4' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#06b6d4' }}>System Status</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>PocketBase</span><span style={{ color: '#10b981', fontWeight: 700 }}>● Live</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Scraper</span><span style={{ color: '#f59e0b', fontWeight: 700 }}>● Local</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 0.75rem 1rem' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0.7rem 0.875rem', borderRadius: '12px',
            background: 'transparent', border: '1px solid rgba(0,0,0,0.06)',
            color: 'var(--slate-600)', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-600)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--neural-bg)' }}>

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '260px',
        minWidth: '260px',
        background: 'white',
        borderRight: '1px solid rgba(99, 102, 241, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)',
        zIndex: 100,
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
        className={`main-sidebar ${sidebarOpen ? 'sidebar-visible' : ''}`}
      >
        {renderSidebarContent()}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── MOBILE TOP BAR ── */}
        <div className="mobile-topbar" style={{
          display: 'none',
          alignItems: 'center', gap: '12px',
          padding: '1rem 1.25rem',
          background: 'white',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '10px',
              width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#475569', flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{
              width: '24px', height: '24px',
              background: 'var(--logo-gradient)',
              borderRadius: '6px',
              display: 'none',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Boxes size={12} color="white" />
            </div>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem',
              color: '#0f172a'
            }}>Eleveto<span style={{ color: '#3b82f6' }}>Ai</span></span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
            {NAV_ITEMS.find(n => n.view === view)?.label || 'Pipeline'}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'kanban' && <KanbanBoard user={user} onLogout={handleLogout} />}
          {view === 'leadgen' && <LeadGeneration defaultTab={leadGenTab} />}
          {view === 'clients' && <ClientManagement />}
          {view === 'bookings' && <BookingManagement />}
          {view === 'integrations' && <Integrations />}
          {view === 'employees' && <EmployeesManager currentUser={user} />}
          {view === 'portfolio' && <PortfolioManagement />}
        </div>
      </main>
    </div>
  );
}

export default App;
