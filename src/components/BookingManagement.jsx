import React, { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { Calendar, Clock, Link as LinkIcon, Users, Edit3, CheckCircle, XCircle, Search, RefreshCw, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function BookingManagement() {
    const [bookings, setBookings] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [calUsername, setCalUsername] = useState('');
    const [calApiKey, setCalApiKey] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        lead_id: '',
        title: '',
        date: '',
        time: '',
        duration: 30,
        status: 'Scheduled',
        meeting_link: '',
        notes: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch bookings with expanded lead info
            const bookingsRes = await pb.collection('bookings').getFullList({
                sort: 'date',
                expand: 'lead_id',
                '$autoCancel': false,
            });
            setBookings(bookingsRes);

            // Fetch leads for the dropdown
            const leadsRes = await pb.collection('leads').getFullList({
                sort: 'name',
                '$autoCancel': false,
            });
            setLeads(leadsRes);

            // Fetch current user's cal config
            const userId = pb.authStore.model?.id;
            if (userId) {
                const userExt = await pb.collection('users').getOne(userId);
                if (userExt?.cal_username) setCalUsername(userExt.cal_username);
                if (userExt?.cal_api_key) setCalApiKey(userExt.cal_api_key);
            }
        } catch (err) {
            if (!err?.isAbort) {
                console.error('Booking fetch error:', err);
                setError('Failed to load data: ' + (err?.message || 'Unknown error'));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSyncCal = async () => {
        setIsSyncing(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiBase}/api/integrations/cal/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Sync failed');
            }
            
            const data = await response.json();
            const total = data.created != null
                ? `${data.created} new, ${data.updated} updated`
                : `${(data.bookings || []).length} bookings loaded`;
            alert(`Sync complete! ${total}.`);
            fetchData();
        } catch (err) {
            console.error('Sync error:', err);
            alert('Failed to sync: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenSchedule = (booking = null) => {
        if (booking) {
            const dateObj = new Date(booking.date);
            // Format YYYY-MM-DD
            const d = dateObj.toISOString().split('T')[0];
            // Format HH:MM
            const t = dateObj.toTimeString().split(' ')[0].substring(0, 5);

            setFormData({
                lead_id: booking.lead_id,
                title: booking.title,
                date: d,
                time: t,
                duration: booking.duration,
                status: booking.status,
                meeting_link: booking.meeting_link || '',
                notes: booking.notes || ''
            });
            setSelectedBooking(booking);
        } else {
            setFormData({
                lead_id: '',
                title: 'Discovery Call',
                date: new Date().toISOString().split('T')[0],
                time: '10:00',
                duration: 30,
                status: 'Scheduled',
                meeting_link: '',
                notes: ''
            });
            setSelectedBooking(null);
        }
        setIsScheduling(true);
    };

    const handleCloseSchedule = () => {
        setIsScheduling(false);
        setSelectedBooking(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Combine date and time
            const dateTimeString = `${formData.date}T${formData.time}:00Z`;

            const data = {
                title: formData.title,
                lead_id: formData.lead_id,
                date: dateTimeString,
                duration: parseInt(formData.duration, 10),
                status: formData.status,
                meeting_link: formData.meeting_link,
                notes: formData.notes
            };

            if (selectedBooking) {
                await pb.collection('bookings').update(selectedBooking.id, data);
            } else {
                await pb.collection('bookings').create(data);
            }
            fetchData();
            handleCloseSchedule();
        } catch (err) {
            console.error("Save Error:", err);
            console.error("BookingManagement: Save Error:", err);
            alert('Failed to save booking: ' + err.message);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        console.log(`BookingManagement: Updating status for booking ${id} to ${newStatus}`);
        try {
            await pb.collection('bookings').update(id, { status: newStatus });
            console.log("BookingManagement: Booking status updated successfully.");
            fetchData();
        } catch (err) {
            console.error("BookingManagement: Failed to update status:", err);
            alert('Failed to update status: ' + (err.message || 'Unknown error'));
        }
    };
    
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this meeting?')) return;
        try {
            const apiBase = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiBase}/api/bookings/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Delete failed');
            }
            
            setBookings(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete: ' + err.message);
        }
    };

    const filtered = bookings.filter(b => {
        const query = search.toLowerCase();
        const leadName = b.expand?.lead_id?.name || '';
        return b.title.toLowerCase().includes(query) || leadName.toLowerCase().includes(query);
    });

    const upcomingBookings = filtered.filter(b => b.status === 'Scheduled');
    const pastBookings = filtered.filter(b => b.status !== 'Scheduled');

    // Every time the component mounts or username changes, tell Cal.com to look for links
    useEffect(() => {
        if (calUsername && window.Cal) {
            window.Cal("ui", {
                styles: { branding: { brandColor: "#000000" } },
                hideEventTypeDetails: false,
                layout: "month_view"
            });
        }
    }, [calUsername]);

    return (
        <div className="dashboard-view">
            <header className="dashboard-header">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Booking Management
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <p className="subtitle" style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Track and schedule client meetings seamlessly.
                        </p>
                        <div style={{ width: '1px', height: '16px', background: 'var(--slate-200)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald-500)' }} />
                            <span>{bookings.length} Total Bookings</span>
                        </div>
                    </div>
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
                            placeholder="Search bookings…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                height: '44px', paddingLeft: '40px', paddingRight: '1rem',
                                border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px',
                                fontSize: '0.875rem', width: '240px', fontFamily: 'Inter, sans-serif',
                                background: 'white', outline: 'none', color: 'var(--text-primary)',
                                fontWeight: 500, transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--primary-indigo)'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.08)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="btn-sync"
                        style={{
                            background: 'white', color: 'var(--text-primary)',
                            padding: '0 1.25rem', height: '44px',
                            borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(0, 0, 0, 0.08)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                            transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        {loading ? 'Syncing...' : 'Refresh'}
                    </button>

                    <button
                        onClick={handleSyncCal}
                        disabled={isSyncing || !calApiKey}
                        title="Sync with Cal.com"
                        style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: 'white', border: '1px solid rgba(0, 0, 0, 0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: (isSyncing || !calApiKey) ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)',
                            transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            opacity: !calApiKey ? 0.5 : 1
                        }}
                    >
                        <Calendar size={15} style={{ animation: isSyncing ? 'pulse 1.5s infinite' : 'none' }} />
                    </button>

                    <button
                        onClick={() => handleOpenSchedule()}
                        style={{
                            background: 'var(--gradient-indigo)', color: 'white',
                            padding: '0 1.5rem', height: '44px',
                            borderRadius: '12px', fontWeight: 700, border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
                            transition: 'all 0.3s'
                        }}
                    >
                        Schedule Meeting
                    </button>

                    {calUsername && (
                        <a
                            href={`https://cal.com/${calUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            data-cal-link={calUsername}
                            data-cal-config='{"layout":"month_view"}'
                            style={{
                                background: '#111827', color: 'white',
                                padding: '0 1.5rem', height: '44px',
                                borderRadius: '12px', fontWeight: 700, border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                                boxShadow: '0 8px 16px rgba(17, 24, 39, 0.2)',
                                transition: 'all 0.3s',
                                textDecoration: 'none'
                            }}
                        >
                            <Calendar size={16} strokeWidth={3} />
                            Book via Cal.com
                        </a>
                    )}
                </div>
            </header>

            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
                    color: '#ef4444', fontSize: '0.875rem', fontWeight: 500,
                }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading bookings...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Upcoming */}
                    <section>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '4px', height: '20px', background: 'var(--primary-indigo)', borderRadius: '4px' }}></div>
                            Upcoming Meetings
                        </h2>
                        {upcomingBookings.length === 0 ? (
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0' }}>
                                No upcoming meetings scheduled.
                            </div>
                        ) : (
                            <div className="bookings-grid">
                                {upcomingBookings.map(b => (
                                    <BookingCard key={b.id} booking={b} onEdit={handleOpenSchedule} onStatusChange={handleUpdateStatus} onDelete={handleDelete} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Past/Canceled */}
                    {pastBookings.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '20px', background: 'var(--slate-300)', borderRadius: '4px' }}></div>
                                Past / Canceled Meetings
                            </h2>
                            <div className="bookings-grid">
                                {pastBookings.map(b => (
                                    <BookingCard key={b.id} booking={b} onEdit={handleOpenSchedule} onStatusChange={handleUpdateStatus} onDelete={handleDelete} isPast />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* Schedule Modal */}
            {isScheduling && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        maxHeight: '90vh'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
                                {selectedBooking ? 'Edit Booking' : 'Schedule Meeting'}
                            </h2>
                            <button onClick={handleCloseSchedule} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                            <form id="booking-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Client / Lead</label>
                                    <select
                                        required
                                        value={formData.lead_id}
                                        onChange={e => setFormData({ ...formData, lead_id: e.target.value })}
                                        style={inputStyle}
                                    >
                                        <option value="">Select a lead or client...</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>
                                                {lead.name} ({lead.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Meeting Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Discovery Call" style={inputStyle} />
                                </div>

                                <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Date</label>
                                        <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={inputStyle} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Time</label>
                                        <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} style={inputStyle} />
                                    </div>
                                </div>

                                <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Duration (mins)</label>
                                        <input required type="number" min="5" step="5" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} style={inputStyle} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Canceled">Canceled</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Meeting Link</label>
                                    <input type="url" value={formData.meeting_link} onChange={e => setFormData({ ...formData, meeting_link: e.target.value })} placeholder="https://zoom.us/..." style={inputStyle} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Notes</label>
                                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Agenda, requirements..." style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>

                            </form>
                        </div>

                        <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={handleCloseSchedule} style={{
                                padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, cursor: 'pointer'
                            }}>Cancel</button>
                            <button type="submit" form="booking-form" style={{
                                padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#6366f1', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}>Save Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared Card Component ──────────────────────────────────────────────────
function BookingCard({ booking, onEdit, onStatusChange, onDelete, isPast }) {
    const lead = booking.expand?.lead_id;
    const dateObj = new Date(booking.date);

    const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const statusColors = {
        'Scheduled': { bg: '#e0e7ff', text: '#4f46e5' },
        'Completed': { bg: '#dcfce7', text: '#16a34a' },
        'Canceled': { bg: '#fee2e2', text: '#dc2626' }
    };
    const sColor = statusColors[booking.status] || { bg: '#f1f5f9', text: '#64748b' };

    return (
        <div style={{
            background: 'white', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '24px', padding: '1.5rem',
            opacity: isPast ? 0.6 : 1, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', gap: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--neural-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={12} color="var(--primary-indigo)" />
                        </div>
                        {lead ? lead.name : 'Unknown Contact'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: sColor.bg, color: sColor.text, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {booking.status}
                    </span>
                    <button 
                        onClick={() => onDelete(booking.id)}
                        className="btn-delete-meeting"
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fecaca'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div style={{ background: 'var(--neural-bg)', padding: '1rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    <Calendar size={14} color="var(--primary-indigo)" /> {formattedDate}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    <Clock size={14} color="var(--accent-cyan)" /> {formattedTime} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({booking.duration}m)</span>
                </div>
            </div>

            {booking.meeting_link && (
                <a href={booking.meeting_link} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px', fontWeight: 500
                }}>
                    <LinkIcon size={14} /> Join Meeting
                </a>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button onClick={() => onEdit(booking)} style={{
                    flex: 1, padding: '0.625rem', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--neural-bg)'; e.currentTarget.style.borderColor = 'var(--primary-indigo)'; e.currentTarget.style.color = 'var(--primary-indigo)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--slate-200)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <Edit3 size={14} /> Edit
                </button>
                {booking.status === 'Scheduled' && (
                    <>
                        <button onClick={() => onStatusChange(booking.id, 'Completed')} style={{
                            flex: 1, padding: '0.625rem', background: 'white', border: '1px solid #10b98140', borderRadius: '10px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#10b981'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#10b98140'; }}
                        >
                            <CheckCircle size={14} /> Finish
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box'
};
