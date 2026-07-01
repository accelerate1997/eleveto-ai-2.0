import { io } from 'socket.io-client';

// Determine the Backend API and WebSocket URL
const API_URL = import.meta.env.VITE_API_URL || 
                (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

console.log(`🔌 Eleveto API Client initializing: ${API_URL}`);

// Initialize Socket.io client
const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true
});

// Callback registries for real-time events
const socketCallbacks = new Map(); // topic -> Array of callbacks

socket.on('connect', () => {
    console.log(`🟢 Socket connected: ${socket.id}`);
});

socket.on('leads:create', (record) => triggerCallbacks('leads', 'create', record));
socket.on('leads:update', (record) => triggerCallbacks('leads', 'update', record));
socket.on('leads:delete', (record) => triggerCallbacks('leads', 'delete', record));

socket.on('messages:create', (record) => triggerCallbacks('messages', 'create', record));
socket.on('messages:update', (record) => triggerCallbacks('messages', 'update', record));
socket.on('messages:delete', (record) => triggerCallbacks('messages', 'delete', record));

socket.on('bookings:create', (record) => triggerCallbacks('bookings', 'create', record));
socket.on('bookings:update', (record) => triggerCallbacks('bookings', 'update', record));
socket.on('bookings:delete', (record) => triggerCallbacks('bookings', 'delete', record));

function triggerCallbacks(collection, action, record) {
    // Map backend response matching pocketbase structure
    const pbEvent = { action, record };
    
    // Trigger wildcard subscribers
    const wildCardCallbacks = socketCallbacks.get(`${collection}/*`) || [];
    wildCardCallbacks.forEach(cb => cb(pbEvent));

    // Trigger exact topic subscribers
    const exactCallbacks = socketCallbacks.get(`${collection}/${record.id}`) || [];
    exactCallbacks.forEach(cb => cb(pbEvent));
}

// In-memory Auth Store mimicking PocketBase AuthStore
class AuthStore {
    constructor() {
        this.onChangeCallbacks = [];
        this.load();
    }

    load() {
        try {
            this.token = localStorage.getItem('eleveto_auth_token') || '';
            const rawModel = localStorage.getItem('eleveto_auth_model');
            this.model = rawModel ? JSON.parse(rawModel) : null;
        } catch (e) {
            this.token = '';
            this.model = null;
        }
    }

    get isValid() {
        return !!this.token;
    }

    save(token, model) {
        this.token = token;
        this.model = model;
        localStorage.setItem('eleveto_auth_token', token);
        localStorage.setItem('eleveto_auth_model', JSON.stringify(model));
        this.triggerChange();
    }

    clear() {
        this.token = '';
        this.model = null;
        localStorage.removeItem('eleveto_auth_token');
        localStorage.removeItem('eleveto_auth_model');
        this.triggerChange();
    }

    onChange(callback, fireImmediately = false) {
        this.onChangeCallbacks.push(callback);
        if (fireImmediately) {
            callback(this.token, this.model);
        }
        // Return unsubscribe function
        return () => {
            this.onChangeCallbacks = this.onChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    triggerChange() {
        this.onChangeCallbacks.forEach(cb => cb(this.token, this.model));
    }
}

const authStoreInstance = new AuthStore();

// Custom Fetch Client
async function request(path, options = {}) {
    const headers = { ...options.headers };
    
    if (authStoreInstance.token) {
        headers['Authorization'] = `Bearer ${authStoreInstance.token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const err = new Error(errData.error || `HTTP error: ${response.status}`);
        err.status = response.status;
        err.data = errData;
        throw err;
    }

    return await response.json().catch(() => ({}));
}

// PocketBase API mock wrapper
export const pb = {
    baseUrl: API_URL,
    authStore: authStoreInstance,
    
    // File URL resolution utility
    files: {
        getURL: (record, filename) => {
            // Under PostgreSQL custom uploads, filenames are fully qualified paths starting with /uploads
            if (filename && filename.startsWith('/uploads')) {
                return `${API_URL}${filename}`;
            }
            return filename || '';
        }
    },

    collection: (colName) => {
        return {
            getFullList: async (queryOptions = {}) => {
                let url = `/api/${colName}`;
                
                // PocketBase compatibility: client_credentials filtering by client_id
                if (colName === 'client_credentials') {
                    const match = queryOptions.filter?.match(/client_id\s*=\s*"([^"]+)"/);
                    if (match && match[1]) {
                        url += `?client_id=${match[1]}`;
                    }
                }
                
                // Map pocketbase collection naming inconsistencies
                if (colName === 'Portoflio') {
                    url = '/api/portfolios';
                }

                const items = await request(url);
                if (colName === 'bookings') {
                    return items.map(b => ({
                        ...b,
                        expand: {
                            lead_id: b.lead
                        }
                    }));
                }
                return items;
            },

            getList: async (page, perPage, queryOptions = {}) => {
                let url = `/api/${colName}`;
                
                // Compatibility for leads messages query: `lead = "leadId"`
                if (colName === 'messages') {
                    const match = queryOptions.filter?.match(/lead\s*=\s*"([^"]+)"/);
                    if (match && match[1]) {
                        url = `/api/messages/${match[1]}`;
                    }
                }

                // Compatibility for invites check query: `token = "inviteToken"`
                if (colName === 'invites') {
                    const match = queryOptions.filter?.match(/token\s*=\s*"([^"]+)"/);
                    if (match && match[1]) {
                        url = `/api/invites?token=${match[1]}`;
                    }
                }

                const items = await request(url);
                let formatted = items;
                if (colName === 'bookings') {
                    formatted = items.map(b => ({
                        ...b,
                        expand: {
                            lead_id: b.lead
                        }
                    }));
                }
                return {
                    items: formatted,
                    totalItems: items.length,
                    page: 1,
                    perPage: 100
                };
            },

            getOne: async (id) => {
                return await request(`/api/${colName}/${id}`);
            },

            getFirstListItem: async (filter, queryOptions = {}) => {
                const list = await pb.collection(colName).getFullList(queryOptions);
                const match = filter.match(/^\s*([a-zA-Z0-9_]+)\s*(?:=|\~)\s*["']([^"']+)["']\s*$/);
                if (match) {
                    const key = match[1];
                    const val = match[2];
                    const found = list.find(item => {
                        const itemVal = item[key];
                        if (itemVal === undefined || itemVal === null) return false;
                        return String(itemVal).toLowerCase().trim() === String(val).toLowerCase().trim();
                    });
                    if (found) return found;
                }
                const error = new Error('The requested resource was not found.');
                error.status = 404;
                throw error;
            },

            create: async (data) => {
                let body;
                if (data instanceof FormData) {
                    body = data;
                } else {
                    body = JSON.stringify(data);
                }

                let url = `/api/${colName}`;
                if (colName === 'Portoflio') {
                    url = '/api/portfolios';
                }

                return await request(url, {
                    method: 'POST',
                    body
                });
            },

            update: async (id, data) => {
                let body;
                if (data instanceof FormData) {
                    body = data;
                } else {
                    body = JSON.stringify(data);
                }

                let url = `/api/${colName}/${id}`;
                if (colName === 'Portoflio') {
                    url = `/api/portfolios/${id}`;
                }

                return await request(url, {
                    method: 'PUT',
                    body
                });
            },

            delete: async (id) => {
                let url = `/api/${colName}/${id}`;
                if (colName === 'Portoflio') {
                    url = `/api/portfolios/${id}`;
                }

                return await request(url, {
                    method: 'DELETE'
                });
            },

            subscribe: (topic, callback) => {
                const fullTopic = `${colName}/${topic}`;
                const list = socketCallbacks.get(fullTopic) || [];
                list.push(callback);
                socketCallbacks.set(fullTopic, list);
            },

            unsubscribe: (topic) => {
                const fullTopic = `${colName}/${topic}`;
                socketCallbacks.delete(fullTopic);
            },

            // PocketBase Auth SDK mapping
            authWithPassword: async (email, password) => {
                const authData = await request('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                const formattedData = {
                    token: authData.token,
                    record: authData.record || authData.user
                };

                authStoreInstance.save(formattedData.token, formattedData.record);
                return formattedData;
            }
        };
    }
};
