import React, { useState, useEffect } from 'react';
import { 
    Terminal, Bot, Zap, Boxes, ArrowRight, ExternalLink, Shield, CheckCircle2, 
    Star, Menu, X, Play, ChevronRight, MessageSquare, Activity, 
    Linkedin, Twitter, Github, Image as ImageIcon, Send, Clock, Sparkles,
    RefreshCw, Cpu, Layers, Lock, Database, Globe, Plus, Minus
} from 'lucide-react';
import { pb } from '../lib/pocketbase';

const LandingPage = ({ onLoginClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const [heroInput, setHeroInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [activeTab, setActiveTab] = useState('agent'); // 'human' | 'agent'
    const [portfolios, setPortfolios] = useState([]);
    const [loadingPortfolios, setLoadingPortfolios] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const toggleFaq = (id) => {
        setActiveFaq(activeFaq === id ? null : id);
    };

    const faqData = [
        {
            category: "General",
            questions: [
                { id: "g1", q: "What exactly does Eleveto AI do?", a: "We build custom software for businesses — specifically custom portals and internal systems, AI agents and automations, and MVPs for new product ideas. Everything we build is tailored to your business. We don't sell pre-built templates or one-size-fits-all solutions." },
                { id: "g2", q: "Who do you typically work with?", a: "We work with founders, operators, and business owners who know they need better systems but don't have the in-house technical team to build them. Our clients range from early-stage startups validating an idea to established businesses looking to automate or modernise their operations." },
                { id: "g3", q: "Do I need to be technical to work with you?", a: "Not at all. We handle all the technical side. Our job is to take what's in your head — or on a napkin — and turn it into something that works. We'll explain things in plain language throughout the process." }
            ]
        },
        {
            category: "Services",
            questions: [
                { id: "s1", q: "How is a custom portal different from just using an existing tool like HubSpot or Notion?", a: "Off-the-shelf tools are built for the average business. If your workflows are specific, your data is complex, or you need multiple tools to talk to each other in a particular way, a custom system will almost always outperform a generic one. We help you figure out whether a custom build is actually worth it for your situation — and we'll tell you honestly if it isn't." },
                { id: "s2", q: "What kind of AI agents can you build?", a: "We build agents that handle real business tasks — answering customer queries, processing and extracting data from documents, qualifying leads, routing requests internally, sending follow-ups, and connecting tools that don't natively integrate. If there's a repetitive task in your business that follows a consistent pattern, there's a good chance we can automate it." },
                { id: "s3", q: "I have an idea for a product but I'm not sure if it's ready to build. Can you help?", a: "Yes, and this is actually one of the best times to talk to us. We can help you think through the idea, identify what the MVP should actually include, and scope out what it would take to build it. Many clients come to us at the idea stage and leave the first call with much more clarity — even if they don't start building straight away." },
                { id: "s4", q: "Do you work on existing systems or only build from scratch?", a: "Both. We can build something entirely new, or we can come into an existing codebase and extend, fix, or improve it. We'll assess what's there first and give you an honest view of whether it's worth building on or starting fresh." }
            ]
        },
        {
            category: "Process & Timeline",
            questions: [
                { id: "p1", q: "How long does a typical project take?", a: "It depends on the scope. A focused automation or a simple internal tool can be done in two to four weeks. A full custom portal or MVP typically takes six to twelve weeks. We'll give you a realistic timeline in the proposal — not an optimistic one." },
                { id: "p2", q: "What does the process look like from start to finish?", a: "We start with a discovery call to understand your needs, then put together a proposal with scope, timeline, and cost. Once agreed, we build in short cycles with regular check-ins so you're always up to date. After launch, we support you through handover and any post-launch adjustments." },
                { id: "p3", q: "Will I be kept in the loop during the build?", a: "Yes, always. We share progress regularly and check in at key milestones. You won't be waiting months to see something — we work collaboratively throughout so there are no surprises at the end." }
            ]
        },
        {
            category: "Pricing & Engagement",
            questions: [
                { id: "e1", q: "How do you charge for projects?", a: "Most of our projects are priced on a fixed-scope basis — meaning you know the cost upfront before we begin. For longer or more complex engagements, we may structure it in phases. We'll always be clear about pricing before anything starts." },
                { id: "e2", q: "Do you offer ongoing support after a project is delivered?", a: "Yes. We offer post-launch support and can stay on for ongoing maintenance, updates, or future development. The specifics are discussed at the proposal stage depending on what you need." },
                { id: "e3", q: "What's the minimum budget to work with Eleveto AI?", a: "We don't publish fixed minimums, but we're best suited to projects where there's a real business problem to solve and the budget reflects that. Get in touch and we'll have an honest conversation about whether we're the right fit for your budget and needs." }
            ]
        },
        {
            category: "Technical",
            questions: [
                { id: "t1", q: "What technologies do you build with?", a: "We choose the right tools for the job rather than locking every project into the same stack. We work across modern web technologies, cloud platforms, and AI frameworks. If you have an existing preference or constraint, we'll work within it." },
                { id: "t2", q: "Will I own the code and the system you build?", a: "Yes. Everything we build for you is yours. You get full ownership of the code, the infrastructure, and the intellectual property. No lock-in." },
                { id: "t3", q: "What happens if something breaks after launch?", a: "We build with quality in mind from the start, but if something goes wrong post-launch, we're available to fix it. For ongoing peace of mind, we offer support arrangements so you're never left dealing with a problem alone." }
            ]
        }
    ];

    const openProjectDetails = (project) => {
        setSelectedProject(project);
        setIsProjectModalOpen(true);
        setActiveImageIndex(0);
    };

    const closeProjectDetails = () => {
        setIsProjectModalOpen(false);
        setActiveImageIndex(0);
        setTimeout(() => setSelectedProject(null), 300); // Wait for transition
    };

    useEffect(() => {
        const fetchPortfolios = async () => {
            try {
                const records = await pb.collection('Portoflio').getFullList({
                    sort: '-created',
                    limit: 6,
                });
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
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Command Terminal AI Simulation
    const handleTerminalSubmit = async (e) => {
        e.preventDefault();
        if (!heroInput.trim() || isTyping) return;

        const problem = heroInput;
        setHeroInput('');
        setTerminalOutput([{ type: 'user', text: problem }]);
        setIsTyping(true);

        setTerminalOutput(prev => [...prev, { type: 'system', text: 'Analyzing business bottleneck via ElevetoAi Hub...' }]);

        try {
            const res = await fetch('http://192.168.1.134:3001/api/public/landing-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem })
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();
            const aiTextResponse = data.result || "Solution: Unable to calculate automation pathway at this time.";

            const lines = aiTextResponse.split('\n').filter(l => l.trim().length > 0);

            let steps = [];
            let conclusion = '';

            lines.forEach(line => {
                if (line.toLowerCase().startsWith('solution:')) {
                    conclusion = line.trim();
                } else if (/^\d+\./.test(line)) {
                    const stepText = line.replace(/^\d+\.\s*/, '').trim();
                    steps.push(`${stepText}... [OK]`);
                } else {
                    steps.push(`${line.trim()}... [OK]`);
                }
            });

            if (!conclusion) {
                conclusion = "Solution: Intelligent Automation Deployed.";
            }

            setTerminalOutput(prev => {
                const newArr = [...prev];
                return [...newArr, {
                    type: 'agent',
                    steps: steps.length > 0 ? steps : ["Executing autonomous mapping... [OK]"],
                    conclusion: conclusion
                }];
            });

        } catch (error) {
            console.error(error);
            setTerminalOutput(prev => [...prev, {
                type: 'agent',
                steps: ["System degraded... [FAILED]"],
                conclusion: "Solution: Connection to AI Core interrupted. Retry."
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            fontFamily: 'Inter, sans-serif',
            minHeight: '100vh',
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* Premium Animations & Global Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --container-px: 5%; /* Default padding for sections */
                    --section-py: 6rem; /* Default vertical padding for sections */
                }
                @media (min-width: 768px) {
                    :root {
                        --container-px: 8%;
                        --section-py: 8rem;
                    }
                }
                @media (min-width: 1024px) {
                    :root {
                        --container-px: 10%;
                        --section-py: 10rem;
                    }
                }
                @keyframes float-subtle {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(1deg); }
                }
                @keyframes glow-pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes border-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .hero-gradient {
                    background: radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.08) 0%, rgba(248, 250, 252, 0) 50%);
                }
                .glow-orb {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0) 70%);
                    border-radius: 50%;
                    filter: blur(60px);
                    z-index: -1;
                    animation: float-subtle 10s ease-in-out infinite;
                }
                .cyber-grid-v2 {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(to right, rgba(15, 23, 42, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
                    background-size: 60px 60px;
                    mask-image: radial-gradient(circle at 50% 50%, black, transparent 80%);
                    -webkit-mask-image: radial-gradient(circle at 50% 50%, black, transparent 80%);
                    z-index: -1;
                    pointer-events: none;
                }
                .glass-premium {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(59, 130, 246, 0.08);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
                }
                .text-gradient {
                    background: linear-gradient(135deg, #0f172a 30%, #3b82f6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .btn-primary-v2 {
                    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
                }
                .btn-primary-v2:hover {
                     transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.5);
                }
                .pillar-card {
                    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
                    background: white;
                }
                .pillar-card:hover {
                    transform: translateY(-10px);
                    border-color: rgba(79, 70, 229, 0.2);
                    background: rgba(79, 70, 229, 0.02);
                }
                .step-connector {
                    position: absolute;
                    height: 2px;
                    background: linear-gradient(90deg, #3b82f6, transparent);
                    top: 50%;
                    width: 100%;
                    left: 50%;
                    z-index: -1;
                }
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-btn { display: flex !important; }
                }
            `}} />

            {/* --- NAV BAR --- */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem var(--container-px)',
                background: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(15px)',
                borderBottom: scrolled ? '1px solid rgba(59, 130, 246, 0.1)' : '1px solid rgba(59, 130, 246, 0.05)',
                transition: 'all 0.3s ease-in-out'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/logo.png" alt="ElevetoAi" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
                        Eleveto<span style={{ color: '#3b82f6' }}>Ai</span>
                    </span>
                </div>
                {/* Desktop Nav */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2.5rem'
                }} className="desktop-nav">
                    {['Services', 'Process', 'Why Us', 'Portfolio'].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase().replace(' ', '')}`}
                            style={{
                                color: scrolled ? '#475569' : 'rgba(15, 23, 42, 0.7)',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={e => e.target.style.color = '#3b82f6'}
                            onMouseLeave={e => e.target.style.color = scrolled ? '#475569' : 'rgba(15, 23, 42, 0.7)'}
                        >
                            {item}
                        </a>
                    ))}
                    <button
                        onClick={onLoginClick}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            background: scrolled ? '#3b82f6' : 'white',
                            color: scrolled ? 'white' : '#3b82f6',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: scrolled ? '0 10px 15px -3px rgba(59, 130, 246, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s'
                        }}
                    >
                        Access Hub
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    style={{
                        display: 'none',
                        background: scrolled ? '#f1f5f9' : 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '10px',
                        width: '40px', height: '40px',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: scrolled ? '#0f172a' : '#0f172a'
                    }}
                    className="mobile-btn"
                >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </nav>

            {/* Mobile Sidebar Navigation */}
            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: isMenuOpen ? 'flex' : 'none',
                flexDirection: 'column',
                padding: '2rem',
                transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem' }}>
                    <button onClick={() => setIsMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '1rem', borderRadius: '50%' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {['Services', 'Process', 'Why Us', 'Portfolio'].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase().replace(' ', '')}`}
                            onClick={() => setIsMenuOpen(false)}
                            style={{
                                color: 'white',
                                textDecoration: 'none',
                                fontSize: '2rem',
                                fontWeight: 800,
                                fontFamily: 'Outfit, sans-serif'
                            }}
                        >
                            {item}
                        </a>
                    ))}
                    <button
                        onClick={() => { setIsMenuOpen(false); onLoginClick(); }}
                        style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '1.2rem',
                            marginTop: '2rem'
                        }}
                    >
                        Access Hub
                    </button>
                </div>
            </div>

            {/* --- HERO SECTION --- */}
            <section style={{
                padding: scrolled ? '8rem var(--container-px) 4rem' : '10rem var(--container-px) 6rem',
                background: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div className="cyber-grid-v2" />
                <div className="glow-orb" style={{ top: '20%', left: '10%' }} />
                <div className="glow-orb" style={{ bottom: '20%', right: '10%', animationDelay: '-5s' }} />
                
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 2,
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 20px',
                        background: '#eff6ff',
                        borderRadius: '100px',
                        color: '#3b82f6',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        marginBottom: '2.5rem',
                        border: '1px solid rgba(59, 130, 246, 0.1)'
                    }}>
                        <Sparkles size={14} />
                        Autonomous Systems for High-Growth Agencies
                    </div>
                    <h1 style={{
                        marginBottom: '1.5rem',
                        maxWidth: '800px',
                        fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.1,
                        letterSpacing: '-0.04em', animation: 'slide-up 0.8s ease-out'
                    }}>
                        We build systems that make your business <span style={{ color: '#3b82f6' }}>run itself.</span>
                    </h1>

                    <p style={{
                        fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: '#475569', maxWidth: '900px',
                        lineHeight: 1.6, marginBottom: '3.5rem', animation: 'slide-up 1s ease-out'
                    }}>
                        Eleveto AI helps businesses move faster by building custom software, intelligent automations, 
                        and AI-powered tools — designed around how your business actually works, not a generic template.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '5rem', animation: 'slide-up 1.2s ease-out' }}>
                        <button className="btn-primary-v2">
                            Start a Project <ArrowRight size={18} />
                        </button>
                        <button style={{
                            background: 'transparent', border: '1px solid rgba(79, 70, 229, 0.2)',
                            color: '#0f172a', padding: '1rem 2rem', borderRadius: '12px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                            See How It Works
                        </button>
                    </div>

                    {/* Diagnostic Terminal */}
                    <div className="glass-premium" style={{
                        width: '100%', maxWidth: '900px', borderRadius: '24px', textAlign: 'left',
                        overflow: 'hidden', animation: 'float-subtle 6s ease-in-out infinite'
                    }}>
                        <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', letterSpacing: '1px' }}>
                                CORE-AI ENGINE // ACTIVE
                            </div>
                        </div>
                        <div style={{ padding: '2rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#94a3b8', minHeight: '260px' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{ color: '#6395ff' }}>SYSTEM:</span> Identify automation bottleneck to initiate mapping...
                            </div>
                            {terminalOutput.map((item, i) => (
                                <div key={i} style={{ marginBottom: '1.25rem' }}>
                                    {item.type === 'user' && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span style={{ color: '#10b981' }}>$</span>
                                            <span style={{ color: 'white' }}>{item.text}</span>
                                        </div>
                                    )}
                                    {item.type === 'system' && (
                                        <div style={{ color: '#6395ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} /> {item.text}
                                        </div>
                                    )}
                                    {item.type === 'agent' && (
                                        <div style={{ background: 'rgba(30, 90, 250, 0.05)', padding: '1.25rem', borderRadius: '12px', borderLeft: '3px solid #6395ff', marginTop: '1rem' }}>
                                            {item.steps.map((step, idx) => (
                                                <div key={idx} style={{ marginBottom: '6px', color: '#475569' }}>
                                                    <span style={{ color: '#4f46e5', marginRight: '8px' }}>→</span> {step}
                                                </div>
                                            ))}
                                            <div style={{ color: '#6395ff', fontWeight: 800, marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(99, 149, 255, 0.2)' }}>
                                                {item.conclusion}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!isTyping && terminalOutput.length === 0 && (
                                <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
                                    <span style={{ color: '#10b981' }}>$</span>
                                    <input 
                                        type="text" 
                                        value={heroInput} 
                                        onChange={e => setHeroInput(e.target.value)}
                                        placeholder="e.g. Lead tracking is slow and manual..."
                                        style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '1rem' }}
                                    />
                                    <button type="submit" style={{ background: '#1e5afa', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>INITIATE</button>
                                </form>
                            )}
                            {terminalOutput.length > 0 && !isTyping && (
                                <button onClick={() => setTerminalOutput([])} style={{ background: 'transparent', border: 'none', color: '#64748b', textDecoration: 'underline', marginTop: '1.5rem', cursor: 'pointer' }}>[ CLEAR CACHE ]</button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CORE PILLARS --- */}
            <section id="services" style={{ padding: 'var(--section-py) var(--container-px)', background: 'white' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '1.25rem', fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, color: '#0f172a' }}>Our Agency <span style={{ color: '#3b82f6' }}>Pillars.</span></h2>
                        <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                            We don't just build code. We build autonomous ecosystems that handle the heavy lifting of your business.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
                        gap: '2rem'
                    }}>
                    {[
                        { 
                            step: '01',
                            title: 'Custom Portals & Systems', 
                            desc: 'Off-the-shelf software rarely fits perfectly. We build custom portals, dashboards, and internal tools tailored to your exact operations — so your team stops working around broken systems and starts actually working.',
                            details: 'Client portals, admin dashboards, CRM systems, ERP integrations, internal workflow tools, reporting systems',
                            icon: Boxes,
                            color: '#4f46e5'
                        },
                        { 
                            step: '02',
                            title: 'Custom AI Agents & Automations', 
                            desc: 'Stop paying people to do things a machine can handle. We design and deploy AI agents and automation systems that handle customer queries, process documents, route tasks, and connect your existing tools — accurately, consistently, and around the clock.',
                            details: 'AI chatbots and assistants, document processing, workflow automation, lead qualification, tool and API integrations, notification and routing systems',
                            icon: Zap, // Changed from Chip to Zap as Chip is not imported
                            color: '#0891b2'
                        },
                        { 
                            step: '03',
                            title: 'MVP Development', 
                            desc: 'Have a product idea but not sure where to start? We take you from concept to a working product — fast. Our approach is lean: build what matters most, validate it early, and iterate before you scale.',
                            details: 'SaaS products, web apps, mobile apps, rapid prototyping, technical scoping, go-to-market readiness',
                            icon: Activity,
                            color: '#8b5cf6'
                        }
                    ].map((pillar, i) => (
                        <div key={i} className="pillar-card" style={{ 
                            padding: '3rem 2.5rem', borderRadius: '32px', 
                            border: '1px solid rgba(79, 70, 229, 0.08)',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                <div style={{ 
                                    width: '56px', height: '56px', borderRadius: '16px', 
                                    background: `${pillar.color}10`, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${pillar.color}20`
                                }}>
                                    <pillar.icon size={28} style={{ color: pillar.color }} />
                                </div>
                                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: `${pillar.color}30`, fontFamily: 'Outfit' }}>{pillar.step}</span>
                            </div>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a' }}>{pillar.title}</h3>
                            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '1rem', marginBottom: '2rem', flex: 1 }}>{pillar.desc}</p>
                            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: pillar.color, marginBottom: '0.75rem' }}>What this includes:</div>
                                <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>{pillar.details}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>


            {/* --- PROCESS SECTION --- */}
            <section id="process" style={{ padding: 'var(--section-py) var(--container-px)', background: '#fff' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem' }}>How It Works</h2>
                        <p style={{ color: '#475569' }}>Our approach to building and launching your system.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                        {[
                            { step: '01', title: 'Discovery Call', desc: 'We start by understanding your business — what you do, where the friction is, and what you actually need. No assumptions, no sales pitch. Just an honest conversation about whether we\'re the right fit for each other.' },
                            { step: '02', title: 'Scope & Proposal', desc: 'We put together a clear breakdown of what we\'ll build, how long it\'ll take, and what it\'ll cost. You\'ll know exactly what you\'re getting before we start — no surprises, no hidden extras halfway through.' },
                            { step: '03', title: 'Build & Collaborate', desc: 'We work in short cycles with regular check-ins so you can see progress and share feedback as we go. You\'re not waiting months to see something — you\'re part of the process throughout.' },
                            { step: '04', title: 'Launch & Beyond', desc: 'Once we launch, we don\'t disappear. We stick around for handover, training, and ongoing support — because what gets built should actually get used well.' }
                        ].map((step, i) => (
                            <div key={i} style={{ 
                                display: 'flex', gap: '2.5rem', alignItems: 'flex-start', padding: '2.5rem',
                                borderRadius: '24px', background: '#f8fafc', border: '1px solid #f1f5f9',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{ 
                                    fontSize: '2rem', fontWeight: 900, color: '#4f46e5', 
                                    fontFamily: 'Outfit, sans-serif', width: '60px', flexShrink: 0, opacity: 0.2
                                }}>{step.step}</div>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{step.title}</h3>
                                    <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: '700px', lineHeight: 1.6 }}>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- WHY ELEVETO AI --- */}
            <section id="why-us" style={{ padding: 'var(--section-py) var(--container-px)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem' }}>Why Eleveto AI</h2>
                        <p style={{ color: '#475569' }}>Engineering grounded in practical results, not hype.</p>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        {[
                            { title: 'We think before we build', desc: 'A lot of agencies take your brief and start coding immediately. We ask questions first, push back where needed, and make sure we\'re solving the right problem — before a single line of code gets written.' },
                            { title: 'No unnecessary complexity', desc: 'We build things as simple as they need to be, and no more complicated. Clean code, clear documentation, and handovers that don\'t leave you permanently dependent on us to maintain your own system.' },
                            { title: 'AI isn\'t a buzzword here', desc: 'We work with AI every day — as a practical tool, not a marketing angle. When we recommend an AI solution, it\'s because it genuinely fits your use case. When it doesn\'t, we\'ll tell you that too.' },
                            { title: 'Built to scale with you', desc: 'We build with your future in mind. Whether you\'re a 10-person team today or planning to grow significantly, the foundations we put in place won\'t hold you back later.' }
                        ].map((point, i) => (
                            <div key={i} style={{ padding: '2rem', borderRadius: '24px', background: '#fff', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#4f46e5', fontWeight: 900, fontSize: '1.25rem', marginBottom: '1rem', fontFamily: 'Outfit' }}>•</div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>{point.title}</h4>
                                <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>{point.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- PORTFOLIO SECTION --- */}
            <section id="portfolio" style={{ padding: 'var(--section-py) var(--container-px)', background: '#fff', position: 'relative' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                        <div style={{ maxWidth: '600px' }}>
                            <div style={{ 
                                display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', 
                                background: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5',
                                fontSize: '0.75rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '0.05em'
                            }}>PROVEN TRACK RECORD</div>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>Latest Work</h2>
                            <p style={{ color: '#475569', fontSize: '1.1rem' }}>A look at the custom systems and AI tools we've recently deployed.</p>
                        </div>
                        <div className="desktop-only">
                            <button onClick={onLoginClick} style={{ 
                                background: 'none', border: 'none', color: '#4f46e5', 
                                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                View All Case Studies <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>

                    {loadingPortfolios ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <RefreshCw className="animate-spin" size={32} style={{ color: '#4f46e5', opacity: 0.5 }} />
                        </div>
                    ) : portfolios.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#94a3b8' }}>
                            <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>Portfolio items will appear here once published.</p>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                            gap: '2.5rem',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {portfolios.map(project => {
                                const imageUrl = project.Project_thumnail 
                                    ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.Project_thumnail}`
                                    : (project.project_images_ ? `${pb.baseUrl}/api/files/${project.collectionId}/${project.id}/${project.project_images_}` : null);
                                    
                                return (
                                    <div key={project.id} className="pillar-card" style={{ 
                                        borderRadius: '24px', 
                                        overflow: 'hidden', 
                                        height: '100%',
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        border: '1px solid #f1f5f9',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: '#fff',
                                        cursor: 'pointer'
                                    }}>
                                        <div style={{ 
                                            width: '100%',
                                            paddingTop: '62.5%', // 16:10 Aspect Ratio
                                            background: '#f8fafc', 
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            {imageUrl ? (
                                                <img 
                                                    src={imageUrl} 
                                                    alt={project.project_name} 
                                                    style={{ 
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%', 
                                                        height: '100%', 
                                                        objectFit: 'cover',
                                                        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }} 
                                                    className="portfolio-img"
                                                />
                                            ) : (
                                                <div style={{ 
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%', 
                                                    height: '100%',
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center' 
                                                }}>
                                                    <ImageIcon size={40} style={{ color: '#cbd5e1' }} />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ padding: '2.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{project.project_name}</h3>
                                            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
                                                {project.Desicription_?.substring(0, 160)}{project.Desicription_?.length > 160 ? '...' : ''}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>{new Date(project.created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                                <div 
                                                    onClick={() => openProjectDetails(project)}
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px',
                                                        color: '#4f46e5',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700
                                                    }}>
                                                    View Case <ExternalLink size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* --- PROJECT DETAILS MODAL --- */}
            {isProjectModalOpen && selectedProject && (
                <div role="dialog" style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem', animation: 'fadeIn 0.3s ease'
                }}>
                    <div 
                        onClick={closeProjectDetails}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} 
                    />
                    <div className="glass-card" style={{
                        position: 'relative', width: '100%', maxWidth: '1000px', maxHeight: '90vh',
                        overflowY: 'auto', borderRadius: '32px', padding: 0, border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <button 
                            onClick={closeProjectDetails}
                            style={{ 
                                position: 'absolute', top: '24px', right: '24px', zIndex: 10,
                                background: 'white', border: 'none', width: '44px', height: '44px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#64748b'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                            <div style={{ background: '#f1f5f9', position: 'relative', minHeight: '450px', display: 'flex', flexDirection: 'column' }}>
                                {/* Main Image Display */}
                                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                    {(() => {
                                        const gallery = [
                                            ...(selectedProject.Project_thumnail ? [selectedProject.Project_thumnail] : []),
                                            ...(Array.isArray(selectedProject.project_images_) ? selectedProject.project_images_ : (selectedProject.project_images_ ? [selectedProject.project_images_] : []))
                                        ];
                                        const currentImage = gallery[activeImageIndex];
                                        
                                        return currentImage ? (
                                            <img 
                                                src={`${pb.baseUrl}/api/files/${selectedProject.collectionId}/${selectedProject.id}/${currentImage}`} 
                                                alt={selectedProject.project_name} 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                                            />
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                <ImageIcon size={64} />
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Thumbnail Strip */}
                                {(() => {
                                    const gallery = [
                                        ...(selectedProject.Project_thumnail ? [selectedProject.Project_thumnail] : []),
                                        ...(Array.isArray(selectedProject.project_images_) ? selectedProject.project_images_ : (selectedProject.project_images_ ? [selectedProject.project_images_] : []))
                                    ];
                                    
                                    return gallery.length > 1 ? (
                                        <div style={{ 
                                            padding: '1rem', 
                                            display: 'flex', 
                                            gap: '10px', 
                                            overflowX: 'auto', 
                                            background: 'rgba(255,255,255,0.8)',
                                            borderTop: '1px solid #e2e8f0'
                                        }}>
                                            {gallery.map((img, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setActiveImageIndex(idx)}
                                                    style={{ 
                                                        width: '60px', 
                                                        height: '60px', 
                                                        borderRadius: '8px', 
                                                        overflow: 'hidden', 
                                                        flexShrink: 0,
                                                        cursor: 'pointer',
                                                        border: activeImageIndex === idx ? '2px solid #4f46e5' : '2px solid transparent',
                                                        opacity: activeImageIndex === idx ? 1 : 0.6,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <img 
                                                        src={`${pb.baseUrl}/api/files/${selectedProject.collectionId}/${selectedProject.id}/${img}`} 
                                                        alt="Thumbnail" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                            <div style={{ padding: '3.5rem' }}>
                                <div style={{ 
                                    display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', 
                                    background: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5',
                                    fontSize: '0.75rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '0.05em'
                                }}>CASE STUDY</div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a', lineHeight: 1.1 }}>{selectedProject.project_name}</h2>
                                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Date</div>
                                        <div style={{ color: '#475569', fontWeight: 600 }}>{new Date(selectedProject.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                                        <div style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Live System
                                        </div>
                                    </div>
                                </div>
                                <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '2.5rem', whiteSpace: 'pre-wrap' }}>
                                    {selectedProject.Desicription_}
                                </p>
                                <button onClick={onLoginClick} className="btn-primary-v2" style={{ width: 'auto' }}>
                                    Deploy Similar System <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* --- FAQ SECTION --- */}
            <section id="faq" style={{ padding: '100px 5%', background: '#f8fafc' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <div style={{ 
                            display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', 
                            background: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5',
                            fontSize: '0.75rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '0.05em'
                        }}>GOT QUESTIONS?</div>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: '1.5rem', color: '#0f172a' }}>Frequently Asked Questions</h2>
                        <p style={{ color: '#475569', fontSize: '1.1rem' }}>Everything you need to know about working with us.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                        {faqData.map((category, catIdx) => (
                            <div key={catIdx}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2rem', paddingLeft: '1rem', borderLeft: '3px solid #4f46e5' }}>
                                    {category.category}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {category.questions.map((faq) => (
                                        <div 
                                            key={faq.id} 
                                            style={{ 
                                                background: 'white', 
                                                borderRadius: '20px', 
                                                border: '1px solid',
                                                borderColor: activeFaq === faq.id ? 'rgba(79, 70, 229, 0.2)' : '#f1f5f9',
                                                overflow: 'hidden',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: activeFaq === faq.id ? '0 20px 40px -10px rgba(79, 70, 229, 0.1)' : 'none'
                                            }}
                                        >
                                            <button 
                                                onClick={() => toggleFaq(faq.id)}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '1.5rem 2rem', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center', 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: activeFaq === faq.id ? '#4f46e5' : '#1e293b' }}>{faq.q}</span>
                                                <div style={{ 
                                                    width: '32px', height: '32px', borderRadius: '50%', 
                                                    background: activeFaq === faq.id ? '#4f46e5' : '#f8fafc',
                                                    color: activeFaq === faq.id ? 'white' : '#64748b',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.3s'
                                                }}>
                                                    {activeFaq === faq.id ? <Minus size={18} /> : <Plus size={18} />}
                                                </div>
                                            </button>
                                            <div style={{ 
                                                maxHeight: activeFaq === faq.id ? '500px' : '0',
                                                opacity: activeFaq === faq.id ? 1 : 0,
                                                overflow: 'hidden',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                padding: activeFaq === faq.id ? '0 2rem 2rem' : '0 2rem'
                                            }}>
                                                <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem' }}>{faq.a}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section style={{ padding: '100px 5%', textAlign: 'center' }}>
                <div style={{ 
                    maxWidth: '800px', margin: '0 auto', background: 'white',
                    padding: '5rem 2rem', borderRadius: '32px', border: '1px solid rgba(79, 70, 229, 0.15)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.03)'
                }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, marginBottom: '1.5rem', color: '#0f172a' }}>Let's talk about what you're trying to achieve.</h2>
                    <p style={{ color: '#475569', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: 1.6 }}>
                        Whether you have a fully formed brief or just a rough idea, we're happy to have an honest 
                        conversation about what's possible and what makes sense for where you are right now. No commitment required.
                    </p>
                    <button className="btn-primary-v2">
                        Start a Project <Lock size={18} />
                    </button>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer style={{ padding: '80px 5% 40px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ flex: '2 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <img src="/logo.png" alt="Logo" style={{ width: '30px' }} />
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>Eleveto AI</span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '300px' }}>
                            Custom portals · AI agents · MVP development
                        </p>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <h4 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Platform</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#64748b' }}>
                            <span>Custom Portals</span>
                            <span>AI Agents</span>
                            <span>MVP Build</span>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '80px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    © 2025 Eleveto AI. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
