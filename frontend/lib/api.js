// lib/api.js  — thin fetch wrapper that injects JWT from localStorage
const BASE = '';  // Proxied through Next.js rewrites to http://localhost:5000

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        // Token expired — clear and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Auth
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    // Tests
    generateTest: (body) => request('/api/tests/generate', { method: 'POST', body: JSON.stringify(body) }),
    submitTest: (body) => request('/api/tests/submit', { method: 'POST', body: JSON.stringify(body) }),
    getTestHistory: () => request('/api/tests/history'),
    getTestProgress: () => request('/api/tests/progress'),
    getTestById: (id) => request(`/api/tests/${id}`),
    getSubjects: () => request('/api/tests/subjects'),

    // Adaptive exam
    startAdaptive: (body) => request('/api/adaptive/start', { method: 'POST', body: JSON.stringify(body) }),
    answerAdaptive: (sessionId, body) => request(`/api/adaptive/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(body) }),
    getAdaptiveHistory: () => request('/api/adaptive/history'),
    sendTelemetry: (sessionId, events) => request(`/api/adaptive/${sessionId}/events`, { method: 'POST', body: JSON.stringify({ events }) }),
    getAntiCheatReport: (sessionId) => request(`/api/adaptive/${sessionId}/report`),

    // Mentor
    analyzeMentor: (body) => request('/api/mentor/analyze', { method: 'POST', body: JSON.stringify(body) }),
    getMentorSession: (id) => request(`/api/mentor/${id}`),

    // Oral exam
    startOral: (body) => request('/api/oral/start', { method: 'POST', body: JSON.stringify(body) }),
    submitOralAnswer: (sessionId, body) => request(`/api/oral/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(body) }),
    getOralHistory: () => request('/api/oral/history'),
    getOralSession: (id) => request(`/api/oral/${id}`),

    // Admin
    generateCode: () => request('/api/admin/codes', { method: 'POST' }),
    getCodes: () => request('/api/admin/codes'),
    getUsers: () => request('/api/admin/users'),
    getAdminStats: () => request('/api/admin/stats'),

    // Teacher
    getStudents: () => request('/api/teacher/students'),
    getStudentAnalytics: (id) => request(`/api/teacher/students/${id}/analytics`),
};
