const USER_CACHE_KEY = 'presencex.offline.session';
const EMPLOYEE_CACHE_KEY = 'presencex.offline.employee';
const QUEUE_KEY = 'presencex.offline.attendance.queue';

const readJson = (key, fallback) => {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = (key, value) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Offline support remains best-effort if browser storage is unavailable.
    }
};

export const cacheOfflineSession = (user, employee) => {
    if (!user || !employee) return;
    writeJson(USER_CACHE_KEY, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        employee_id: employee.id,
        department: employee.department,
        position: employee.position,
    });
    writeJson(EMPLOYEE_CACHE_KEY, employee);
};

export const getCachedOfflineSession = () => readJson(USER_CACHE_KEY, null);
export const getCachedOfflineEmployee = () => readJson(EMPLOYEE_CACHE_KEY, null);

export const clearOfflineSession = () => {
    try {
        window.localStorage.removeItem(USER_CACHE_KEY);
        window.localStorage.removeItem(EMPLOYEE_CACHE_KEY);
    } catch {
        // Ignore storage errors during logout.
    }
};

export const getOfflineAttendanceQueue = () => readJson(QUEUE_KEY, []);

export const getOfflineAttendanceForToday = (employeeId, date) =>
    getOfflineAttendanceQueue().find(
        (item) => item.employee_id === employeeId && item.date === date && item.status !== 'failed',
    ) || null;

export const enqueueOfflineAttendance = (attendance) => {
    const queue = getOfflineAttendanceQueue();
    const duplicate = queue.find(
        (item) => item.employee_id === attendance.employee_id && item.date === attendance.date,
    );
    if (duplicate) return duplicate;

    const item = {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action: 'create-attendance',
        ...attendance,
        queued_at: new Date().toISOString(),
        status: 'pending',
    };
    writeJson(QUEUE_KEY, [...queue, item]);
    return item;
};

export const flushOfflineAttendanceQueue = async (syncAttendance) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, pending: getOfflineAttendanceQueue().length };

    const queue = getOfflineAttendanceQueue();
    const remaining = [];
    let synced = 0;

    for (const item of queue) {
        try {
            await syncAttendance({ action: item.action, payload: {
                employee_id: item.employee_id,
                employee_name: item.employee_name,
                date: item.date,
                check_in: item.check_in,
                status: item.attendance_status,
                interventions: item.interventions || [],
                offline: true,
            }});
            synced += 1;
        } catch (error) {
            const message = error?.message || '';
            if (message.toLowerCase().includes('already exists')) {
                synced += 1;
            } else {
                remaining.push({ ...item, status: 'pending', last_error: message });
            }
        }
    }

    writeJson(QUEUE_KEY, remaining);
    return { synced, pending: remaining.length };
};
