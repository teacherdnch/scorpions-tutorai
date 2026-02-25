// lib/auth.js — simple auth helpers
export function getUser() {
    if (typeof window === 'undefined') return null;
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

export function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function requireRole(allowed, router) {
    const user = getUser();
    if (!user) {
        router.replace('/login');
        return false;
    }
    if (allowed && !allowed.includes(user.role)) {
        router.replace(`/${user.role}/dashboard`);
        return false;
    }
    return true;
}
