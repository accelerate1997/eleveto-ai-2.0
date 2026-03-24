import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Copy, CheckCircle, Trash2, Loader2, Link as LinkIcon, ShieldCheck, Power, AlertCircle } from 'lucide-react';
import { pb } from '../lib/pocketbase';

export default function EmployeesManager({ currentUser }) {
    const [employees, setEmployees] = useState([]);
    const [invites, setInvites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);

    useEffect(() => {
        if (currentUser?.role === 'owner' || currentUser?.role === 'admin') {
            fetchData();
        }
    }, [currentUser]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch all users
            const usersRes = await pb.collection('users').getFullList({
                sort: '-created',
            });
            setEmployees(usersRes);

            // Fetch active invites created by this user (or all if admin context allows)
            const invitesRes = await pb.collection('invites').getFullList({
                filter: 'used = false',
                sort: '-created',
                expand: 'created_by'
            });
            setInvites(invitesRes);
        } catch (error) {
            console.error("Failed to fetch employees/invites:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateInvite = async () => {
        setIsGenerating(true);
        try {
            // Generate a random token
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const newInvite = await pb.collection('invites').create({
                token: token,
                used: false,
                created_by: currentUser?.id
            });

            setInvites([newInvite, ...invites]);
        } catch (error) {
            console.error("Failed to generate invite:", error);
            alert("Error generating invite. Ensure you are logged in and have permissions.");
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteInvite = async (id) => {
        try {
            await pb.collection('invites').delete(id);
            setInvites(invites.filter(inv => inv.id !== id));
        } catch (error) {
            console.error("Failed to delete invite:", error);
        }
    };

    const copyToClipboard = (token) => {
        const inviteLink = `${window.location.origin}/?invite=${token}`;
        navigator.clipboard.writeText(inviteLink);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const toggleEmployeeStatus = async (id, currentStatus) => {
        try {
            const updated = await pb.collection('users').update(id, { active: !currentStatus });
            setEmployees(employees.map(emp => emp.id === id ? updated : emp));
        } catch (error) {
            console.error("Failed to toggle status", error);
            alert("Error updating status. You might not have permission.");
        }
    };

    if (currentUser?.role !== 'owner') {
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--slate-500)', maxWidth: '600px', margin: '0 auto' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3, color: 'var(--slate-400)' }} />
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Access Denied</h2>
                <p>Only agency owners can access the Team Manager.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users style={{ color: 'var(--primary-indigo)' }} size={28} />
                        Employees Manager
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                        Manage your agency team and generate secure invite links for new members.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* INVITATIONS PANEL */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neural-bg)' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LinkIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
                            Active Invites
                        </h2>
                        <button
                            onClick={generateInvite}
                            disabled={isGenerating}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'var(--gradient-indigo)',
                                color: 'white', border: 'none', borderRadius: '10px',
                                padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700,
                                cursor: isGenerating ? 'wait' : 'pointer',
                                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
                            }}
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            Generate Link
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
                        {invites.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                <div style={{ background: '#f1f5f9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <LinkIcon size={20} style={{ color: '#94a3b8' }} />
                                </div>
                                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No active invites</p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>Click generate to create an invite link.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {invites.map(invite => (
                                    <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px', letterSpacing: '0.05em' }}>
                                                TOKEN: {invite.token.substring(0, 8)}...
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                Created: {new Date(invite.created).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => copyToClipboard(invite.token)}
                                                style={{
                                                    background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
                                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: copiedToken === invite.token ? '#10b981' : '#64748b',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Copy Link"
                                            >
                                                {copiedToken === invite.token ? <CheckCircle size={16} /> : <Copy size={16} />}
                                            </button>
                                            <button
                                                onClick={() => deleteInvite(invite.id)}
                                                style={{
                                                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
                                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s'
                                                }}
                                                title="Delete Invite"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* EMPLOYEES PANEL */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#f8fafc' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={18} style={{ color: '#10b981' }} />
                            Registered Team Members ({employees.length})
                        </h2>
                    </div>

                    <div className="table-container" style={{ padding: '1.5rem' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--neural-indigo)' }} />
                            </div>
                        ) : employees.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                <p>No employees found.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #f1f5f9', color: 'var(--slate-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #f1f5f9', color: 'var(--slate-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity (Email)</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #f1f5f9', color: 'var(--slate-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined Date</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '2px solid #f1f5f9', color: 'var(--slate-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0
                                                }}>
                                                    {(emp.name || emp.username || emp.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>
                                                        {emp.name || emp.username || 'Unnamed Agent'}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                                                        ID: {emp.id} • Role: <span style={{ textTransform: 'capitalize' }}>{emp.role || 'Employee'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--slate-600)', fontSize: '0.85rem' }}>{emp.email}</td>
                                            <td style={{ padding: '16px', color: 'var(--slate-600)', fontSize: '0.85rem' }}>{new Date(emp.created).toLocaleDateString()}</td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                {emp.id === currentUser?.id ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        padding: '4px 8px', background: '#f0fdf4', color: '#10b981',
                                                        borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                                        Active (You)
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => toggleEmployeeStatus(emp.id, emp.active)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '6px 12px', borderRadius: '8px',
                                                            background: emp.active ? '#fef2f2' : '#f0fdf4',
                                                            color: emp.active ? '#ef4444' : '#10b981',
                                                            border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                                            transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        <Power size={14} />
                                                        {emp.active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
