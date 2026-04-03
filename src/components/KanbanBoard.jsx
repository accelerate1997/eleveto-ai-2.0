import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { pb } from '../lib/pocketbase';
import LeadCard from './LeadCard';
import AddLeadModal from './AddLeadModal';
import { UserPlus, Settings, LogOut, ShieldCheck, Activity, Cpu, ChevronRight, Share2 } from 'lucide-react';

const COLUMNS = [
    'Lead',
    'Qualified',
    'Contacted',
    'Meeting Booked',
    'Follow Up',
    'Converted',
    'Non Converted'
];

export default function KanbanBoard({ onViewLead }) {
    const [leads, setLeads] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchLeads();

        pb.collection('leads').subscribe('*', function (e) {
            if (e.action === 'create') {
                setLeads(prev => {
                    if (prev.find(l => l.id === e.record.id)) return prev;
                    return [e.record, ...prev];
                });
            } else if (e.action === 'delete') {
                setLeads(prev => prev.filter(l => l.id !== e.record.id));
            }
            // 'update' events are NOT handled here — optimistic updates in onDragEnd
            // own status changes. Subscription update handler was causing a race
            // condition that reverted the drag-and-drop state.
        });

        return () => {
            pb.collection('leads').unsubscribe('*');
        };
    }, []);

    const fetchLeads = async () => {
        try {
            const records = await pb.collection('leads').getFullList({
                sort: '-created',
                expand: 'created_by',
                '$autoCancel': false,
            });
            setLeads(records);
        } catch (err) {
            // Ignore auto-cancelled requests (happens on fast re-renders)
            if (err?.isAbort) return;
            console.error('Error fetching leads:', err);
        }
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;

        // Immutable optimistic update — create a new object, don't mutate
        setLeads(prev => prev.map(l =>
            l.id === draggableId ? { ...l, status: newStatus } : l
        ));

        try {
            setIsSyncing(true);
            await pb.collection('leads').update(draggableId, { status: newStatus });
        } catch (err) {
            console.error('Sync failed:', err);
            fetchLeads(); // Revert to server state on failure
        } finally {
            setIsSyncing(false);
        }
    };

    const getLeadsByStatus = (status) => {
        return leads.filter(lead => lead.status === status);
    };

    return (
        <div className="dashboard-view">
            <header className="dashboard-header">
                <div>
                    <h1>ElevetoAi Pipeline</h1>
                    <p className="subtitle" style={{ textAlign: 'left', margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>
                        ElevetoAi Lead Infrastructure • Real-time Sync Active
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="add-lead-btn" onClick={() => setIsModalOpen(true)}>
                        <UserPlus size={18} />
                        <span>New Entity</span>
                    </button>
                </div>
            </header>

            <main className="kanban-board">
                <DragDropContext onDragEnd={onDragEnd}>
                    {COLUMNS.map(columnId => (
                        <div key={columnId} className="kanban-column">
                            <div className="column-header">
                                <span className="column-title">{columnId}</span>
                                <span className="column-count">{getLeadsByStatus(columnId).length}</span>
                            </div>

                            <Droppable droppableId={columnId}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            flexGrow: 1,
                                            minHeight: '100px',
                                            transition: 'background 0.2s ease',
                                            borderRadius: '12px'
                                        }}
                                    >
                                        {getLeadsByStatus(columnId).map((lead, index) => (
                                            <LeadCard
                                                key={lead.id}
                                                lead={lead}
                                                index={index}
                                                onViewLead={onViewLead}
                                                onUpdated={(updated) => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))}
                                                onDeleted={(id) => setLeads(prev => prev.filter(l => l.id !== id))}
                                            />
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </DragDropContext>
            </main>

            <AddLeadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onLeadAdded={(newLead) => setLeads([newLead, ...leads])}
            />

            {isSyncing && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    background: 'var(--neural-indigo)', color: 'white',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '16px', fontSize: '0.85rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    boxShadow: '0 15px 35px rgba(99, 102, 241, 0.25)',
                    zIndex: 2000,
                    animation: 'syncPulse 2s infinite ease-in-out'
                }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    ElevetoAi Sync Active
                </div>
            )}
        </div>
    );
}
