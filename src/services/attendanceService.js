import { supabaseClient } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { logError } from '@/lib/logger';

export const getTodayAttendanceForEmployee = async (employeeId) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendances = await supabaseClient.entities.Attendance.filter({
            employee_id: employeeId,
            date: today
        });

        return attendances?.[0] || null;
    } catch (error) {
        logError(error, 'attendance.getTodayAttendanceForEmployee');
        throw error;
    }
};

export const createAttendance = async (attendanceData) => {
    try {
        return await supabaseClient.entities.Attendance.create(attendanceData);
    } catch (error) {
        logError(error, 'attendance.createAttendance');
        throw error;
    }
};

export const updateAttendance = async (id, attendanceData) => {
    try {
        return await supabaseClient.entities.Attendance.update(id, attendanceData);
    } catch (error) {
        logError(error, 'attendance.updateAttendance');
        throw error;
    }
};

export const calculateHoursWorked = (checkInTime, checkOutTime, lunchStart, lunchEnd) => {
    const [inHour, inMinute] = checkInTime.split(':').map(Number);
    const [outHour, outMinute] = checkOutTime.split(':').map(Number);

    let hoursWorked = (outHour * 60 + outMinute - inHour * 60 - inMinute) / 60;

    if (lunchStart && lunchEnd) {
        const [lunchStartHour, lunchStartMinute] = lunchStart.split(':').map(Number);
        const [lunchEndHour, lunchEndMinute] = lunchEnd.split(':').map(Number);
        const lunchDuration = (lunchEndHour * 60 + lunchEndMinute - lunchStartHour * 60 - lunchStartMinute) / 60;
        hoursWorked -= lunchDuration;
    }

    return Math.max(0, hoursWorked);
};
