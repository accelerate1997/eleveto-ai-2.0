let ioInstance = null;

export function initSocket(io) {
    ioInstance = io;
    
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
}

export function getSocketIO() {
    return ioInstance;
}

/**
 * Broadcast an event to all connected clients.
 */
export function broadcast(event, data) {
    if (ioInstance) {
        ioInstance.emit(event, data);
    }
}
