import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowRight, ExternalLink, CheckCircle2,
    Menu, X, ChevronRight, Star,
    Linkedin, Twitter, Github, Image as ImageIcon,
    RefreshCw, Globe, Plus, Minus, Calendar,
    Sparkles, Code2, Palette, Zap, Shield, 
    TrendingUp, Users, Award, Clock,
    Monitor, Smartphone, Search, BarChart3,
    MessageSquare, Phone, Mail, MapPin,
    Play, ChevronDown
} from 'lucide-react';
import { pb } from '../lib/pocketbase';

const LandingPage = ({ onLoginClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const [portfolios, setPortfolios] = useState([]);
    const [loadingPortfolios, setLoadingPortfolios] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [activeService, setActiveService] = useState(0);
    const [counters, setCounters] = useState({ projects: 0, clients: 0, years: 0, satisfaction: 0 });
    const statsRef = useRef(null);
    const hasCountedRef = useRef(false);

    const toggleFaq = (id) => setActiveFaq(activeFaq === id ? null : id);

    // Animate counters
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasCountedRef.current) {
                    hasCountedRef.current = true;
                    const targets = { projects: 120, clients: 80, years: 5, satisfaction: 98 };
                    const duration = 2000;
                    const steps = 60;
                    let step = 0;
                    const interval = setInterval(() => {
                        step++;
                        const progress = step / steps;
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCounters({
                            projects: Math.round(targets.projects * eased),
                            clients: Math.round(targets.clients * eased),
                            years: Math.round(targets.years * eased),
                            satisfaction: Math.round(targets.satisfaction * eased),
                        });
                        if (step >= steps) clearInterval(interval);
                    }, duration / steps);
                }
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    const openProjectDetails = (project) => {
        setSelectedProject(project);
        setIsProjectModalOpen(true);
        setActiveImageIndex(0);
    };

    const closeProjectDetails = () => {
        setIsProjectModalOpen(false);
        setActiveImageIndex(0);
        setTimeout(() => setSelectedProject(null), 300);
    };

    useEffect(() => {
        const fetchPortfolios = async () => {
            try {
                const records = await pb.collection('Portoflio').getFullList({ sort: '-created', limit: 6 });
                setPortfolios(records);
            } catch (err) {
                console.error('Failed to fetch portfolios:', err);
            } finally {
                setLoadingPortfolios(false);
            }
        };
        fetchPortfolios();
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const services = [
        {
            id: 0,
            icon: Globe,
            color: '#6366f1',
            bg: 'rgba(99, 102, 241, 0.08)',
            title: 'Custom Web Development',
            subtitle: 'Bespoke, performant websites built from the ground up',
            desc: 'We engineer custom websites and web applications that perfectly match your brand and business goals. No templates, no shortcuts — just clean, fast, scalable code that converts visitors into customers.',
            features: ['React / Next.js / Vue.js', 'Lightning fast performance', 'SEO-optimized architecture', 'CMS integration', 'API & database design', 'Fully responsive'],
        },
        {
            id: 1,
            icon: Zap,
            color: '#0891b2',
            bg: 'rgba(8, 145, 178, 0.08)',
            title: 'AI-Powered Web Apps',
            subtitle: 'Intelligent applications that automate your business',
            desc: 'We build web applications infused with AI capabilities — from intelligent chatbots and document processors to fully autonomous workflow systems. Your business, running on autopilot.',
            features: ['Custom AI chatbots', 'Document intelligence', 'Lead qualification systems', 'Workflow automation', 'API integrations', 'Real-time dashboards'],
        },
        {
            id: 2,
            icon: Monitor,
            color: '#7c3aed',
            bg: 'rgba(124, 58, 237, 0.08)',
            title: 'SaaS & MVP Development',
            subtitle: 'From idea to live product — fast',
            desc: 'Have a product idea? We take it from a napkin sketch to a live, usable MVP in weeks. Lean, focused, and built to validate — so you can learn fast and scale with confidence.',
            features: ['Product scoping & strategy', 'Rapid MVP delivery', 'SaaS architecture', 'Subscription & payment flows', 'User auth & roles', 'Analytics integration'],
        },
        {
            id: 3,
            icon: Palette,
            color: '#db2777',
            bg: 'rgba(219, 39, 119, 0.08)',
            title: 'UI/UX & Design Systems',
            subtitle: 'Interfaces users love, brands that stand out',
            desc: 'Great software starts with great design. We craft pixel-perfect interfaces with thoughtful user experience, consistent design systems, and the micro-interactions that make products feel premium.',
            features: ['UI/UX design', 'Interactive prototypes', 'Design systems', 'Component libraries', 'Brand identity', 'Accessibility compliant'],
        },
    ];

    const faqData = [
        { id: 'f1', q: 'How long does a website project typically take?', a: 'A standard website takes 3–6 weeks. Custom web apps and SaaS MVPs range from 6–14 weeks depending on complexity. We provide a realistic timeline in our proposal before anything starts.' },
        { id: 'f2', q: 'Do I own the code after the project?', a: 'Absolutely. Everything we build for you is 100% yours — the code, the infrastructure, the IP. No lock-in, no ongoing dependencies on us unless you choose to continue working together.' },
        { id: 'f3', q: 'How do you handle projects remotely?', a: 'We work with clients globally. We use shared tools for project tracking, regular video check-ins, and async communication so you always know where things stand — wherever you are.' },
        { id: 'f4', q: 'What technologies do you use?', a: 'We choose the right tools for each project. Our primary stack includes React, Next.js, Node.js, and modern cloud infrastructure. We adapt to your constraints and preferences.' },
        { id: 'f5', q: 'Do you offer ongoing support after launch?', a: 'Yes. We offer maintenance plans and can remain available for updates, new features, or technical support. We\'re as involved as you need us to be after launch.' },
        { id: 'f6', q: 'What is your pricing model?', a: 'Most projects are fixed-scope with agreed pricing upfront, so there are no surprises. Longer engagements may be structured in phases. We\'ll be fully transparent on cost before we start.' },
    ];

    const process = [
        { step: '01', title: 'Discovery', desc: 'We start by understanding your goals, audience, and business context. No assumptions — just honest questions to make sure we build the right thing.', icon: MessageSquare },
        { step: '02', title: 'Strategy & Design', desc: 'We map the architecture, design the user experience, and create a plan. You see and approve the design before a single line of code is written.', icon: Palette },
        { step: '03', title: 'Development', desc: 'We build in focused sprints with regular check-ins. You can see progress throughout — no black-box delivery months later.', icon: Code2 },
        { step: '04', title: 'Launch & Scale', desc: 'We handle deployment, performance testing, and handover. Post-launch, we\'re available to iterate, optimise, and grow the product with you.', icon: TrendingUp },
    ];

    return (
        <div style={{ backgroundColor: '#050816', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
                :root { --c-bg: #050816; --c-surface: #0d1224; --c-surface2: #111827; --c-border: rgba(255,255,255,0.06); --c-accent: #6366f1; --c-accent2: #06b6d4; --c-text: #e2e8f0; --c-muted: #64748b; }
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                body { background: var(--c-bg); overflow-x: hidden; }
                
                @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(2deg)} }
                @keyframes pulse-glow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
                @keyframes slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
                @keyframes fade-in { from{opacity:0} to{opacity:1} }
                @keyframes orbit { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
                @keyframes gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
                @keyframes border-spin { to { --angle: 360deg; } }
                @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
                
                .hero-animate { animation: slide-up 0.9s cubic-bezier(0.23,1,0.32,1) both; }
                .hero-animate-2 { animation: slide-up 0.9s 0.15s cubic-bezier(0.23,1,0.32,1) both; }
                .hero-animate-3 { animation: slide-up 0.9s 0.3s cubic-bezier(0.23,1,0.32,1) both; }
                .hero-animate-4 { animation: slide-up 0.9s 0.45s cubic-bezier(0.23,1,0.32,1) both; }

                .gradient-text {
                    background: linear-gradient(135deg, #fff 0%, #a5b4fc 40%, #06b6d4 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                }
                .gradient-text-accent {
                    background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                }
                .noise-bg {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
                }
                .card-glass {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    backdrop-filter: blur(20px);
                    transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
                }
                .card-glass:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(99,102,241,0.3);
                    transform: translateY(-6px);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1);
                }
                .btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #06b6d4 100%);
                    background-size: 200% 200%;
                    color: white; border: none; padding: 1rem 2rem; border-radius: 12px;
                    font-weight: 700; font-size: 0.95rem; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
                    display: inline-flex; align-items: center; gap: 10px;
                    box-shadow: 0 8px 32px rgba(99,102,241,0.35);
                    font-family: Inter, sans-serif;
                    animation: gradient-shift 3s ease infinite;
                    letter-spacing: 0.01em;
                }
                .btn-primary:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 16px 48px rgba(99,102,241,0.5);
                }
                .btn-ghost {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
                    color: #e2e8f0; padding: 1rem 2rem; border-radius: 12px;
                    font-weight: 600; font-size: 0.95rem; cursor: pointer;
                    transition: all 0.3s; display: inline-flex; align-items: center; gap: 10px;
                    font-family: Inter, sans-serif;
                }
                .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.25); transform: translateY(-1px); }
                
                .nav-link {
                    color: rgba(226,232,240,0.65); text-decoration: none;
                    font-size: 0.9rem; font-weight: 500; transition: color 0.2s;
                    position: relative;
                }
                .nav-link::after {
                    content: ''; position: absolute; bottom: -4px; left: 0;
                    width: 0; height: 2px; background: #6366f1;
                    transition: width 0.3s cubic-bezier(0.23,1,0.32,1);
                    border-radius: 2px;
                }
                .nav-link:hover { color: #fff; }
                .nav-link:hover::after { width: 100%; }

                .tag-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 6px 16px; border-radius: 100px;
                    background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
                    color: #a5b4fc; font-size: 0.8rem; font-weight: 600;
                    letter-spacing: 0.03em;
                }
                .service-tab {
                    background: transparent; border: 1px solid rgba(255,255,255,0.07);
                    color: rgba(226,232,240,0.6); padding: 0.875rem 1.25rem; border-radius: 12px;
                    cursor: pointer; font-size: 0.875rem; font-weight: 600;
                    transition: all 0.3s; font-family: Inter, sans-serif;
                    display: flex; align-items: center; gap: 10px; text-align: left;
                    width: 100%;
                }
                .service-tab.active {
                    background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.35);
                    color: #a5b4fc;
                }
                .service-tab:hover:not(.active) {
                    background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.15);
                    color: #e2e8f0;
                }
                .process-card {
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 24px; padding: 2.5rem; transition: all 0.4s;
                }
                .process-card:hover {
                    background: rgba(99,102,241,0.04); border-color: rgba(99,102,241,0.2);
                    transform: translateY(-4px);
                }
                .faq-item {
                    border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
                    overflow: hidden; transition: all 0.3s; background: rgba(255,255,255,0.02);
                }
                .faq-item.open { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.04); }
                .faq-btn {
                    width: 100%; padding: 1.5rem 2rem; display: flex; justify-content: space-between;
                    align-items: center; background: none; border: none; cursor: pointer;
                    color: #e2e8f0; text-align: left; font-family: Inter, sans-serif;
                    font-size: 1rem; font-weight: 600;
                }
                .tech-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 8px 16px; border-radius: 8px;
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    font-size: 0.8rem; font-weight: 600; color: rgba(226,232,240,0.7);
                    white-space: nowrap;
                }
                .grid-bg {
                    background-image: linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
                    background-size: 60px 60px;
                }
                .marquee-wrapper { overflow: hidden; }
                .marquee-track { display: flex; gap: 2rem; animation: marquee 25s linear infinite; width: max-content; }
                
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-toggle { display: flex !important; }
                    .hero-btns { flex-direction: column; }
                    .services-layout { flex-direction: column !important; }
                    .process-grid { grid-template-columns: 1fr !important; }
                    .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
                    .footer-grid { grid-template-columns: 1fr !important; }
                    .portfolio-grid { grid-template-columns: 1fr !important; }
                    .cta-inner { padding: 3rem 1.5rem !important; }
                }
                @media (min-width: 769px) {
                    .mobile-toggle { display: none !important; }
                }
            `}} />

            {/* ═══════════════════════════════════════ NAV ═════════════════════════════════════════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 5%',
                background: scrolled ? 'rgba(5,8,22,0.92)' : 'transparent',
                backdropFilter: scrolled ? 'blur(24px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/logo.png" alt="ElevetoAi" style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
                         onError={e => e.target.style.display = 'none'} />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.5px', color: 'white' }}>
                        Eleveto<span style={{ color: '#6366f1' }}>Ai</span>
                    </span>
                </div>

                <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                    {[['Services', '#services'], ['Process', '#process'], ['Work', '#portfolio'], ['FAQ', '#faq']].map(([label, href]) => (
                        <a key={label} href={href} className="nav-link">{label}</a>
                    ))}
                </div>

                <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={onLoginClick} className="btn-ghost" style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}>
                        Client Portal
                    </button>
                    <button onClick={onLoginClick} className="btn-primary" style={{ padding: '0.7rem 1.4rem', fontSize: '0.875rem' }}>
                        Start a Project <ArrowRight size={16} />
                    </button>
                </div>

                <button className="mobile-toggle" onClick={() => setIsMenuOpen(true)}
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e2e8f0' }}>
                    <Menu size={20} />
                </button>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,8,22,0.98)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', padding: '2rem', animation: 'fade-in 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: 'white' }}>Eleveto<span style={{ color: '#6366f1' }}>Ai</span></span>
                        <button onClick={() => setIsMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e2e8f0' }}>
                            <X size={22} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                        {[['Services', '#services'], ['Process', '#process'], ['Work', '#portfolio'], ['FAQ', '#faq']].map(([label, href]) => (
                            <a key={label} href={href} onClick={() => setIsMenuOpen(false)}
                                style={{ color: 'white', textDecoration: 'none', fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                                {label}
                            </a>
                        ))}
                    </div>
                    <button onClick={() => { setIsMenuOpen(false); onLoginClick(); }} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.25rem' }}>
                        Start a Project <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════ HERO ═════════════════════════════════════════ */}
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 5% 6rem', position: 'relative', overflow: 'hidden' }}>
                {/* BG Effects */}
                <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />
                <div style={{ position: 'absolute', top: '20%', left: '15%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', animation: 'float 14s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '950px', margin: '0 auto' }}>
                    <div className="hero-animate" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <span className="tag-badge">
                            <Sparkles size={13} />
                            Website Development Agency
                        </span>
                    </div>

                    <h1 className="hero-animate-2" style={{
                        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                        fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 1.05,
                        letterSpacing: '-0.04em', marginBottom: '1.75rem', color: 'white'
                    }}>
                        We build websites that{' '}
                        <span className="gradient-text">win business.</span>
                    </h1>

                    <p className="hero-animate-3" style={{
                        fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: 'rgba(148,163,184,0.9)',
                        lineHeight: 1.7, maxWidth: '700px', margin: '0 auto 3rem'
                    }}>
                        From stunning marketing sites to complex web applications — we design and engineer digital experiences that look incredible, perform flawlessly, and drive real results.
                    </p>

                    <div className="hero-animate-4 hero-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={onLoginClick} className="btn-primary" style={{ padding: '1.1rem 2.25rem', fontSize: '1rem' }}>
                            Start a Project <ArrowRight size={18} />
                        </button>
                        <a href="#portfolio" className="btn-ghost" style={{ padding: '1.1rem 2.25rem', fontSize: '1rem', textDecoration: 'none' }}>
                            <Play size={16} style={{ color: '#6366f1' }} /> See Our Work
                        </a>
                    </div>

                    {/* Stats strip */}
                    <div ref={statsRef} className="stats-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '1.5rem', marginTop: '5rem',
                        padding: '2rem', borderRadius: '20px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        {[
                            { value: counters.projects, suffix: '+', label: 'Projects Delivered' },
                            { value: counters.clients, suffix: '+', label: 'Happy Clients' },
                            { value: counters.years, suffix: '+', label: 'Years Experience' },
                            { value: counters.satisfaction, suffix: '%', label: 'Client Satisfaction' },
                        ].map((stat, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '1rem' }}>
                                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 3vw, 2.75rem)', color: 'white', lineHeight: 1, marginBottom: '0.5rem' }}>
                                    {stat.value}{stat.suffix}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'rgba(148,163,184,0.7)', fontWeight: 500 }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', animation: 'float 2.5s ease-in-out infinite' }}>
                    <ChevronDown size={24} style={{ color: 'rgba(148,163,184,0.4)' }} />
                </div>
            </section>

            {/* ═══════════════════════════════════════ TECH MARQUEE ═════════════════════════════════════════ */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 0', overflow: 'hidden' }}>
                <div className="marquee-wrapper">
                    <div className="marquee-track">
                        {[
                            '⚛ React', '▲ Next.js', '⚡ Vue.js', '🟢 Node.js', '🐍 Python', '☁️ AWS', '🔵 TypeScript',
                            '🎨 Figma', '🛢 PostgreSQL', '🍃 MongoDB', '🔴 Redis', '🐳 Docker', '🤖 OpenAI', '🔗 Supabase',
                            '⚛ React', '▲ Next.js', '⚡ Vue.js', '🟢 Node.js', '🐍 Python', '☁️ AWS', '🔵 TypeScript',
                            '🎨 Figma', '🛢 PostgreSQL', '🍃 MongoDB', '🔴 Redis', '🐳 Docker', '🤖 OpenAI', '🔗 Supabase',
                        ].map((tech, i) => (
                            <span key={i} className="tech-badge">{tech}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════ SERVICES ═════════════════════════════════════════ */}
            <section id="services" style={{ padding: '8rem 5%' }}>
                <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <span className="tag-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>Our Services</span>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', letterSpacing: '-0.04em', color: 'white', marginBottom: '1.25rem' }}>
                            Everything your digital presence needs
                        </h2>
                        <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                            From design through deployment — we handle the full lifecycle of building exceptional web products.
                        </p>
                    </div>

                    <div className="services-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        {/* Tabs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '280px', flexShrink: 0 }}>
                            {services.map(svc => (
                                <button key={svc.id} onClick={() => setActiveService(svc.id)}
                                    className={`service-tab${activeService === svc.id ? ' active' : ''}`}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: activeService === svc.id ? svc.bg : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${activeService === svc.id ? svc.color + '30' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                                        <svc.icon size={18} style={{ color: activeService === svc.id ? svc.color : 'rgba(148,163,184,0.5)' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>{svc.title}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Content Panel */}
                        {services.map(svc => activeService === svc.id && (
                            <div key={svc.id} style={{
                                flex: 1, padding: '3rem', borderRadius: '24px',
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                                animation: 'fade-in 0.35s ease'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: svc.bg, border: `1px solid ${svc.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svc.icon size={28} style={{ color: svc.color }} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.75rem', color: 'white', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{svc.title}</h3>
                                        <p style={{ color: svc.color, fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>{svc.subtitle}</p>
                                    </div>
                                </div>

                                <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>{svc.desc}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
                                    {svc.features.map((feat, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <CheckCircle2 size={15} style={{ color: svc.color, flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.85rem', color: 'rgba(226,232,240,0.8)', fontWeight: 500 }}>{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={onLoginClick} className="btn-primary" style={{ padding: '0.875rem 1.75rem' }}>
                                    Discuss this service <ChevronRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ PROCESS ═════════════════════════════════════════ */}
            <section id="process" style={{ padding: '8rem 5%', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <span className="tag-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>How We Work</span>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', letterSpacing: '-0.04em', color: 'white', marginBottom: '1.25rem' }}>
                            A process built for clarity
                        </h2>
                        <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
                            No surprises. No black boxes. We work transparently at every stage so you always know what's happening.
                        </p>
                    </div>

                    <div className="process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                        {process.map((step, i) => (
                            <div key={i} className="process-card" style={{ position: 'relative' }}>
                                {i < process.length - 1 && (
                                    <div style={{ position: 'absolute', top: '2.75rem', right: '-12px', width: '24px', height: '2px', background: 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)', zIndex: 10 }} />
                                )}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <step.icon size={18} style={{ color: '#6366f1' }} />
                                    </div>
                                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: 'rgba(99,102,241,0.5)' }}>{step.step}</span>
                                </div>
                                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: 'white', marginBottom: '0.875rem', letterSpacing: '-0.02em' }}>{step.title}</h3>
                                <p style={{ color: 'rgba(148,163,184,0.75)', fontSize: '0.9rem', lineHeight: 1.75 }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ PORTFOLIO ═════════════════════════════════════════ */}
            <section id="portfolio" style={{ padding: '8rem 5%' }}>
                <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '4rem' }}>
                        <div>
                            <span className="tag-badge" style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>Our Work</span>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', letterSpacing: '-0.04em', color: 'white', lineHeight: 1.1 }}>
                                Recent Projects
                            </h2>
                        </div>
                        <button onClick={onLoginClick} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' }}>
                            View All <ExternalLink size={16} />
                        </button>
                    </div>

                    {loadingPortfolios ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
                            <RefreshCw size={32} style={{ color: '#6366f1', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : portfolios.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.5)' }}>
                            <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>Portfolio coming soon — check back shortly.</p>
                        </div>
                    ) : (
                        <div className="portfolio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.75rem' }}>
                            {portfolios.map((project, i) => {
                                const thumbnail = project.Project_thumnail
                                    ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.Project_thumnail}`
                                    : null;
                                return (
                                    <div key={i} className="card-glass" style={{ borderRadius: '24px', overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => openProjectDetails(project)}>
                                        <div style={{ height: '220px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', position: 'relative' }}>
                                            {thumbnail ? (
                                                <img src={thumbnail} alt={project.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)' }}
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                                            ) : (
                                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Globe size={48} style={{ color: 'rgba(99,102,241,0.3)' }} />
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,8,22,0.6) 0%, transparent 60%)' }} />
                                        </div>
                                        <div style={{ padding: '1.75rem' }}>
                                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: 'white', marginBottom: '0.625rem', letterSpacing: '-0.02em' }}>{project.project_name}</h3>
                                            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{project.Desicription_}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '0.85rem', fontWeight: 700 }}>
                                                View Case Study <ExternalLink size={14} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Project Modal */}
            {isProjectModalOpen && selectedProject && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'fade-in 0.25s ease' }}>
                    <div onClick={closeProjectDetails} style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,22,0.85)', backdropFilter: 'blur(12px)' }} />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '1100px', maxHeight: '90vh',
                        overflowY: 'auto', borderRadius: '28px', background: '#0d1224',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <button onClick={closeProjectDetails} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={18} />
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', flex: 1 }}>
                            <div style={{ background: '#070b1a', minHeight: '400px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                                {(() => {
                                    const gallery = [
                                        ...(selectedProject.Project_thumnail ? [selectedProject.Project_thumnail] : []),
                                        ...(Array.isArray(selectedProject.project_images_) ? selectedProject.project_images_ : (selectedProject.project_images_ ? [selectedProject.project_images_] : []))
                                    ];
                                    const currentImage = gallery[activeImageIndex];
                                    return currentImage ? (
                                        <img src={`${pb.baseUrl}/api/files/${selectedProject.collectionId}/${selectedProject.id}/${currentImage}`}
                                            alt={selectedProject.project_name}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', flex: 1 }} />
                                    ) : (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Globe size={64} style={{ color: 'rgba(99,102,241,0.2)' }} />
                                        </div>
                                    );
                                })()}
                                {(() => {
                                    const gallery = [
                                        ...(selectedProject.Project_thumnail ? [selectedProject.Project_thumnail] : []),
                                        ...(Array.isArray(selectedProject.project_images_) ? selectedProject.project_images_ : (selectedProject.project_images_ ? [selectedProject.project_images_] : []))
                                    ];
                                    return gallery.length > 1 ? (
                                        <div style={{ padding: '1rem', display: 'flex', gap: '8px', overflowX: 'auto', background: 'rgba(0,0,0,0.3)', scrollbarWidth: 'none' }}>
                                            {gallery.map((img, idx) => (
                                                <div key={idx} onClick={() => setActiveImageIndex(idx)} style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: `2px solid ${activeImageIndex === idx ? '#6366f1' : 'transparent'}`, opacity: activeImageIndex === idx ? 1 : 0.5, transition: 'all 0.2s' }}>
                                                    <img src={`${pb.baseUrl}/api/files/${selectedProject.collectionId}/${selectedProject.id}/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                            <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', background: '#0d1224' }}>
                                <div style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 700, marginBottom: '1.75rem', width: 'fit-content', letterSpacing: '0.06em' }}>CASE STUDY</div>
                                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '2rem', color: 'white', marginBottom: '1rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{selectedProject.project_name}</h2>
                                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Delivered</div>
                                        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}>{new Date(selectedProject.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Status</div>
                                        <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Live
                                        </div>
                                    </div>
                                </div>
                                <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: '1rem', lineHeight: 1.8, flex: 1, whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>{selectedProject.Desicription_}</p>
                                <button onClick={onLoginClick} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
                                    Start a Similar Project <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ WHY US ═════════════════════════════════════════ */}
            <section style={{ padding: '8rem 5%', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
                        <div>
                            <span className="tag-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>Why Choose Us</span>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.04em', color: 'white', marginBottom: '1.5rem', lineHeight: 1.1 }}>
                                We don't just build websites — we build business assets.
                            </h2>
                            <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
                                We treat every project as an investment in your business. That means understanding your goals, challenging assumptions, and delivering something that actually performs.
                            </p>
                            <button onClick={onLoginClick} className="btn-primary">
                                Work With Us <ArrowRight size={18} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { icon: Shield, title: 'Strategy first, code second', desc: 'We ask questions before writing a single line. Every decision is tied to your business goals.' },
                                { icon: Zap, title: 'Speed without cutting corners', desc: 'We move fast using modern frameworks and proven architectures — not shortcuts that break later.' },
                                { icon: TrendingUp, title: 'Built to scale', desc: 'Whether you\'re at 100 or 100,000 users, the foundations we build are ready to grow with you.' },
                                { icon: Users, title: 'True partnership', desc: 'We\'re in it with you — transparent communication, regular check-ins, no mystery.' },
                            ].map((point, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <point.icon size={20} style={{ color: '#6366f1' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: 700, color: 'white', marginBottom: '0.375rem', fontSize: '0.95rem' }}>{point.title}</h4>
                                        <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.875rem', lineHeight: 1.6 }}>{point.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ FAQ ═════════════════════════════════════════ */}
            <section id="faq" style={{ padding: '8rem 5%' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span className="tag-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>FAQ</span>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.04em', color: 'white', marginBottom: '1rem' }}>
                            Common Questions
                        </h2>
                        <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '1.05rem', lineHeight: 1.7 }}>Everything you need to know before we get started.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {faqData.map(faq => (
                            <div key={faq.id} className={`faq-item${activeFaq === faq.id ? ' open' : ''}`}>
                                <button className="faq-btn" onClick={() => toggleFaq(faq.id)}>
                                    <span style={{ fontWeight: 600, fontSize: '1rem', color: activeFaq === faq.id ? '#a5b4fc' : '#e2e8f0', paddingRight: '1rem', lineHeight: 1.4 }}>{faq.q}</span>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: activeFaq === faq.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: activeFaq === faq.id ? '#a5b4fc' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', flexShrink: 0 }}>
                                        {activeFaq === faq.id ? <Minus size={16} /> : <Plus size={16} />}
                                    </div>
                                </button>
                                <div style={{ maxHeight: activeFaq === faq.id ? '400px' : '0', opacity: activeFaq === faq.id ? 1 : 0, overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)', padding: activeFaq === faq.id ? '0 2rem 1.75rem' : '0 2rem' }}>
                                    <p style={{ color: 'rgba(148,163,184,0.8)', lineHeight: 1.75, fontSize: '0.975rem' }}>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ CTA ═════════════════════════════════════════ */}
            <section style={{ padding: '6rem 5% 8rem' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '32px', pointerEvents: 'none' }} />
                    <div className="cta-inner" style={{
                        textAlign: 'center', padding: '5rem 3rem', borderRadius: '32px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.2)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '300px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)' }} />
                        
                        <span className="tag-badge" style={{ marginBottom: '2rem', display: 'inline-flex' }}>
                            <Sparkles size={13} /> Let's Build Something
                        </span>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em', color: 'white', marginBottom: '1.5rem', lineHeight: 1.05 }}>
                            Ready to build your next<br />
                            <span className="gradient-text">digital product?</span>
                        </h2>
                        <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto 3rem' }}>
                            Whether you have a clear brief or just an idea, we're happy to have a no-pressure conversation about what's possible. Let's figure it out together.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={onLoginClick} className="btn-primary" style={{ padding: '1.15rem 2.5rem', fontSize: '1rem' }}>
                                Start a Project <ArrowRight size={18} />
                            </button>
                            <a href="mailto:hello@elevetoai.com" className="btn-ghost" style={{ padding: '1.15rem 2.5rem', fontSize: '1rem', textDecoration: 'none' }}>
                                <Mail size={18} style={{ color: '#6366f1' }} /> Get in Touch
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ FOOTER ═════════════════════════════════════════ */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4rem 5% 2.5rem' }}>
                <div className="footer-grid" style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                            <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>Eleveto<span style={{ color: '#6366f1' }}>Ai</span></span>
                        </div>
                        <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '280px', marginBottom: '1.5rem' }}>
                            A website development agency building custom digital products for ambitious businesses.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {[Twitter, Linkedin, Github].map((Icon, i) => (
                                <a key={i} href="#" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(148,163,184,0.6)', transition: 'all 0.2s', textDecoration: 'none' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#a5b4fc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(148,163,184,0.6)'; }}>
                                    <Icon size={16} />
                                </a>
                            ))}
                        </div>
                    </div>
                    {[
                        { title: 'Services', links: ['Web Development', 'AI Web Apps', 'MVP Development', 'UI/UX Design'] },
                        { title: 'Company', links: ['Our Process', 'Portfolio', 'About Us', 'Contact'] },
                        { title: 'Connect', links: ['Start a Project', 'Client Portal', 'FAQ', 'Blog'] },
                    ].map((col, i) => (
                        <div key={i}>
                            <h4 style={{ fontWeight: 700, color: 'white', marginBottom: '1.25rem', fontSize: '0.9rem' }}>{col.title}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {col.links.map((link, j) => (
                                    <a key={j} href="#" style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                                        onMouseEnter={e => e.target.style.color = '#a5b4fc'}
                                        onMouseLeave={e => e.target.style.color = 'rgba(148,163,184,0.6)'}>{link}</a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.82rem' }}>© 2025 Eleveto AI. All rights reserved.</p>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {['Privacy Policy', 'Terms of Service'].map((link, i) => (
                            <a key={i} href="#" style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                onMouseLeave={e => e.target.style.color = 'rgba(148,163,184,0.4)'}>{link}</a>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
