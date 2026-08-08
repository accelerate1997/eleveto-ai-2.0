import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Video, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Copy, Check, Sparkles } from 'lucide-react';
import { pb } from '../lib/pocketbase';

export default function SelfBookingPage({ onBackToHome }) {
    const [step, setStep] = useState(1); // 1: Date & Time, 2: Details, 3: Success
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState(null);

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [copied, setCopied] = useState(false);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const today = new Date();

    // Fetch slots when date changes
    useEffect(() => {
        if (!selectedDate) return;

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setSlotsError(null);
            setSelectedTimeSlot(null);
            
            // Format to YYYY-MM-DD local date
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            try {
                const res = await fetch(`${pb.baseUrl}/api/public/slots?date=${formattedDate}`);
                if (!res.ok) throw new Error('Failed to retrieve available time slots');
                const data = await res.json();
                setAvailableSlots(data);
            } catch (err) {
                console.error('Error fetching slots:', err);
                setSlotsError('Could not load slots for this day. Please try again.');
                setAvailableSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [selectedDate]);

    // Handle Copy to Clipboard
    const copyLink = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Handle Form Submit
    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !phone || !selectedTimeSlot) {
            setBookingError('Please fill out all required fields.');
            return;
        }

        setIsSubmitting(true);
        setBookingError(null);

        try {
            const response = await fetch(`${pb.baseUrl}/api/public/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    start: selectedTimeSlot,
                    notes
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Booking failed. The slot may have been taken.');
            }

            setConfirmedBooking(data);
            setStep(3);
        } catch (err) {
            console.error('Booking error:', err);
            setBookingError(err.message || 'An error occurred while booking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calendar Generation
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const startDay = new Date(year, month, 1).getDay();
        const numDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        // Fill previous month offsets
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        // Fill current month days
        for (let d = 1; d <= numDays; d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        // Don't let users go before current month
        if (prev.getMonth() >= today.getMonth() || prev.getFullYear() > today.getFullYear()) {
            setCurrentMonth(prev);
        }
    };

    const isDateSelectable = (date) => {
        if (!date) return false;
        // Strip hours to compare dates
        const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const comp = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Disable weekends and past dates
        const dayOfWeek = check.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        return check >= comp && !isWeekend;
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const formatSlotTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const days = getDaysInMonth(currentMonth);
    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div style={{
            backgroundColor: '#050816',
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800;900&display=swap');
                
                .booking-grid-bg {
                    background-image: linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
                    background-size: 50px 50px;
                    position: absolute;
                    inset: 0;
                    opacity: 0.5;
                    pointer-events: none;
                }

                .gradient-sphere-1 {
                    position: absolute;
                    top: -10%;
                    right: -10%;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                }

                .gradient-sphere-2 {
                    position: absolute;
                    bottom: -10%;
                    left: -10%;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                }

                .glass-panel {
                    background: rgba(13, 18, 36, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(24px);
                    border-radius: 24px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                }

                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 6px;
                    text-align: center;
                }

                .calendar-day-header {
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #64748b;
                    padding: 8px 0;
                    letter-spacing: 0.05em;
                }

                .calendar-cell {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid transparent;
                }

                .cell-empty {
                    cursor: default;
                    opacity: 0;
                }

                .cell-disabled {
                    color: rgba(255, 255, 255, 0.15);
                    cursor: not-allowed;
                }

                .cell-active {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.06);
                    color: #f1f5f9;
                }

                .cell-active:hover {
                    background: rgba(99, 102, 241, 0.1);
                    border-color: rgba(99, 102, 241, 0.3);
                    color: #fff;
                    transform: translateY(-1px);
                }

                .cell-selected {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
                    border-color: #6366f1 !important;
                    color: white !important;
                    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
                    font-weight: 700;
                }

                .slot-btn {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                    color: #e2e8f0;
                    font-family: Inter, sans-serif;
                }

                .slot-btn:hover {
                    background: rgba(99, 102, 241, 0.08);
                    border-color: rgba(99, 102, 241, 0.3);
                    color: #fff;
                }

                .slot-selected {
                    background: rgba(99, 102, 241, 0.15) !important;
                    border-color: #6366f1 !important;
                    color: #a5b4fc !important;
                    box-shadow: 0 0 0 1px #6366f1;
                }

                .form-input {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 12px;
                    height: 48px;
                    color: white;
                    padding: 0 16px;
                    width: 100%;
                    font-size: 0.95rem;
                    transition: all 0.25s;
                    font-family: Inter, sans-serif;
                }

                .form-input:focus {
                    outline: none;
                    background: rgba(255, 255, 255, 0.04);
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }

                .btn-submit {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                    border: none;
                    height: 50px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.25s;
                    width: 100%;
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
                    font-family: Inter, sans-serif;
                }

                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.45);
                }

                .btn-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @keyframes check-pop {
                    0% { transform: scale(0.8); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }

                .checkmark-animate {
                    animation: check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(226, 232, 240, 0.6);
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                    text-decoration: none;
                    background: none;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .back-link:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.05);
                }
            `}} />

            <div className="booking-grid-bg" />
            <div className="gradient-sphere-1" />
            <div className="gradient-sphere-2" />

            {/* Header */}
            <header style={{
                padding: '1.5rem 5%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={onBackToHome} role="button">
                    <img src="/logo.png" alt="ElevetoAi" style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                         onError={e => e.target.style.display = 'none'} />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', color: 'white' }}>
                        Eleveto<span style={{ color: '#6366f1' }}>Ai</span>
                    </span>
                </div>
                
                <button onClick={onBackToHome} className="back-link">
                    <ArrowLeft size={16} /> Back to Website
                </button>
            </header>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 5%',
                position: 'relative',
                zIndex: 5
            }}>
                <div className="glass-panel" style={{
                    width: '100%',
                    maxWidth: '1050px',
                    display: 'grid',
                    gridTemplateColumns: step === 3 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                    overflow: 'hidden'
                }}>
                    
                    {/* Left Panel: Description */}
                    {step !== 3 && (
                        <div style={{
                            padding: '3rem',
                            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.01)'
                        }}>
                            <div>
                                <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Sparkles size={11} /> 1-on-1 Session
                                    </span>
                                </div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '1rem', fontFamily: 'Outfit' }}>
                                    Strategy Session
                                </h1>
                                <p style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                                    Let's map out your digital requirements. We will analyze your goals, scope out your website or custom AI web application, and establish a clear development roadmap.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', color: '#6366f1', flexShrink: 0, justifyContent: 'center' }}>
                                            <Clock size={16} />
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>30 Minutes Duration</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', color: '#06b6d4', flexShrink: 0, justifyContent: 'center' }}>
                                            <Video size={16} />
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Google Meet / Video Call</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stepper Indicator */}
                            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '24px', height: '24px', borderRadius: '50%', 
                                        background: step >= 1 ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700, color: step >= 1 ? 'white' : '#64748b'
                                    }}>1</div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: step === 1 ? '#fff' : '#64748b' }}>Select Date & Time</span>
                                    
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                                    <div style={{ 
                                        width: '24px', height: '24px', borderRadius: '50%', 
                                        background: step >= 2 ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700, color: step >= 2 ? 'white' : '#64748b'
                                    }}>2</div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: step === 2 ? '#fff' : '#64748b' }}>Your Details</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Panel: Active Step Wrapper */}
                    <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        
                        {/* ── STEP 1: Date & Time Selector ── */}
                        {step === 1 && (
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
                                    Select Date & Time
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    
                                    {/* Month Selector & Calendar */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
                                                {monthsNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                            </span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button 
                                                    onClick={prevMonth} 
                                                    disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()}
                                                    style={{ 
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', 
                                                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                        cursor: 'pointer', color: 'white', opacity: (currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()) ? 0.3 : 1
                                                    }}
                                                >
                                                    &lt;
                                                </button>
                                                <button 
                                                    onClick={nextMonth} 
                                                    style={{ 
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', 
                                                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                        cursor: 'pointer', color: 'white'
                                                    }}
                                                >
                                                    &gt;
                                                </button>
                                            </div>
                                        </div>

                                        <div className="calendar-grid">
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                <div key={day} className="calendar-day-header">{day}</div>
                                            ))}
                                            {days.map((date, idx) => {
                                                if (!date) return <div key={`empty-${idx}`} className="calendar-cell cell-empty" />;
                                                
                                                const selectable = isDateSelectable(date);
                                                const selected = isSameDay(date, selectedDate);
                                                
                                                return (
                                                    <div 
                                                        key={`day-${idx}`} 
                                                        onClick={() => selectable && setSelectedDate(date)}
                                                        className={`calendar-cell ${!selectable ? 'cell-disabled' : selected ? 'cell-selected' : 'cell-active'}`}
                                                    >
                                                        {date.getDate()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Time Slots Area */}
                                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={16} style={{ color: '#6366f1' }} /> Available Times
                                        </h3>

                                        {!selectedDate ? (
                                            <p style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                                Please select a date from the calendar to view available time slots.
                                            </p>
                                        ) : loadingSlots ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '2rem' }}>
                                                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(99, 102, 241, 0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Checking slot availability...</span>
                                                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
                                            </div>
                                        ) : slotsError ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.88rem' }}>
                                                <AlertCircle size={16} />
                                                <span>{slotsError}</span>
                                            </div>
                                        ) : availableSlots.length === 0 ? (
                                            <p style={{ color: '#f43f5e', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem', background: 'rgba(244,63,94,0.03)', border: '1px solid rgba(244,63,94,0.1)', borderRadius: '12px' }}>
                                                Daily meeting limit reached or no slots available for this day. Please choose another date.
                                            </p>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                                {availableSlots.map((slot) => (
                                                    <button 
                                                        key={slot} 
                                                        onClick={() => setSelectedTimeSlot(slot)}
                                                        className={`slot-btn ${selectedTimeSlot === slot ? 'slot-selected' : ''}`}
                                                    >
                                                        {formatSlotTime(slot)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                        <button 
                                            disabled={!selectedTimeSlot}
                                            onClick={() => setStep(2)}
                                            className="btn-submit"
                                            style={{ width: 'auto', padding: '0 2rem' }}
                                        >
                                            Next Step <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: Client Form Details ── */}
                        {step === 2 && (
                            <div>
                                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '1.5rem', padding: '4px 8px', borderRadius: '6px' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#64748b'}>
                                    <ArrowLeft size={14} /> Back to Slot Selector
                                </button>

                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
                                    Enter Your Details
                                </h2>
                                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '2rem' }}>
                                    Booking for: <strong style={{ color: '#a5b4fc' }}>{selectedDate ? selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</strong> at <strong style={{ color: '#a5b4fc' }}>{selectedTimeSlot ? formatSlotTime(selectedTimeSlot) : ''} (IST)</strong>
                                </p>

                                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.05em' }}>Full Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)} 
                                            placeholder="Enter your first and last name"
                                            className="form-input"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.05em' }}>Email Address *</label>
                                            <input 
                                                type="email" 
                                                required
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)} 
                                                placeholder="you@example.com"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.05em' }}>WhatsApp Number *</label>
                                            <input 
                                                type="tel" 
                                                required
                                                value={phone} 
                                                onChange={(e) => setPhone(e.target.value)} 
                                                placeholder="e.g. +91 9876543210"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.05em' }}>Project Description / Notes (Optional)</label>
                                        <textarea 
                                            value={notes} 
                                            onChange={(e) => setNotes(e.target.value)} 
                                            placeholder="Tell us briefly about what you are looking to build..."
                                            className="form-input"
                                            style={{ height: '100px', padding: '12px 16px', resize: 'none' }}
                                        />
                                    </div>

                                    {bookingError && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                                            <AlertCircle size={16} />
                                            <span>{bookingError}</span>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="btn-submit"
                                        style={{ marginTop: '1rem' }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255, 255, 255, 0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Scheduling Meeting...
                                            </>
                                        ) : (
                                            <>Confirm Meeting Booking</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── STEP 3: Booking Confirmation Success ── */}
                        {step === 3 && confirmedBooking && (
                            <div className="checkmark-animate" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                        <CheckCircle2 size={36} />
                                    </div>
                                </div>

                                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem', fontFamily: 'Outfit' }}>
                                    Meeting Confirmed!
                                </h2>
                                <p style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
                                    Hi {name}, your strategy meeting has been successfully booked. An email confirmation containing the calendar invite has been sent.
                                </p>

                                <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto 2.5rem', padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'left' }}>
                                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', letterSpacing: '0.05em' }}>Session Title</span>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>Strategy Meeting with {name}</span>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', letterSpacing: '0.05em' }}>Date</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                                                    {selectedDate ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', letterSpacing: '0.05em' }}>Time</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                                                    {selectedTimeSlot ? formatSlotTime(selectedTimeSlot) : ''} (IST)
                                                </span>
                                            </div>
                                        </div>

                                        {confirmedBooking.meetingLink && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1.25rem' }}>
                                                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em' }}>Meeting Video Link</span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <a 
                                                        href={confirmedBooking.meetingLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="form-input" 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', color: '#3b82f6', textDecoration: 'none', 
                                                            fontSize: '0.88rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Video size={14} style={{ marginRight: '8px', flexShrink: 0 }} />
                                                        {confirmedBooking.meetingLink}
                                                    </a>
                                                    <button 
                                                        onClick={() => copyLink(confirmedBooking.meetingLink)}
                                                        style={{ 
                                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', 
                                                            width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                            cursor: 'pointer', color: copied ? '#10b981' : 'white', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button 
                                        onClick={onBackToHome}
                                        className="btn-submit"
                                        style={{ width: 'auto', padding: '0 2.5rem' }}
                                    >
                                        Return to Website
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '2rem 5%',
                textAlign: 'center',
                color: 'rgba(148, 163, 184, 0.4)',
                fontSize: '0.8rem',
                marginTop: 'auto',
                position: 'relative',
                zIndex: 10
            }}>
                © 2025 Eleveto AI. All rights reserved.
            </footer>
        </div>
    );
}
