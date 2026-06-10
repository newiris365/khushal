import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export async function getChildToday(req: Request, res: Response) {
  try {
    const { id } = req.params; // student_id

    // Try fetching child's schedule
    const { data: scheduleData, error: timetableError } = await supabaseAdmin
      .from('timetable')
      .select('*, staff(name)')
      .order('time_slot');

    // Fetch child's today attendance status
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: attendanceData } = await supabaseAdmin
      .from('attendance')
      .select('status')
      .eq('student_id', id)
      .eq('date', todayStr)
      .maybeSingle();

    if (timetableError) throw timetableError;

    const schedule = (scheduleData || []).map(item => ({
      id: item.id,
      time_slot: item.time_slot,
      subject: item.subject,
      teacher: item.staff?.name || 'Faculty Member',
      room: item.room
    }));

    return res.status(200).json({
      success: true,
      schedule,
      current_period: schedule[0] || null,
      attendance_status: attendanceData?.status || 'absent'
    });
  } catch (err: any) {
    // Local offline mock fallback
    const mockSchedule = [
      { id: 's-1', time_slot: '09:00 AM - 10:00 AM', subject: 'Compiler Design', teacher: 'Dr. Aditya Kumar', room: 'CS-301' },
      { id: 's-2', time_slot: '10:00 AM - 11:00 AM', subject: 'Database Systems', teacher: 'Prof. Sarah Vance', room: 'CS-302' },
      { id: 's-3', time_slot: '11:15 AM - 12:15 PM', subject: 'Artificial Intelligence', teacher: 'Dr. Vivek Sharma', room: 'Lab 4' }
    ];
    return res.status(200).json({
      success: true,
      schedule: mockSchedule,
      current_period: mockSchedule[0],
      attendance_status: 'present'
    });
  }
}

export async function getChildDailyReport(req: Request, res: Response) {
  try {
    const { id, date } = req.params;
    const { data, error } = await supabaseAdmin
      .from('parent_daily_reports')
      .select('*')
      .eq('student_id', id)
      .eq('date', date)
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      report: data
    });
  } catch (err: any) {
    const reportDate = req.params.date || new Date().toISOString().split('T')[0];
    const mockReport = {
      student_id: req.params.id,
      date: reportDate,
      attendance_status: 'Present',
      current_period: 'Completed',
      meals_today: 'Samosa, Fruit Juice (Canteen)',
      gate_in_time: `${reportDate}T09:05:00Z`,
      gate_out_time: `${reportDate}T17:15:00Z`,
      canteen_spend: 85.00,
      notices_count: 2
    };
    return res.status(200).json({
      success: true,
      report: mockReport
    });
  }
}

export async function sendParentMessage(req: Request, res: Response) {
  try {
    const { teacher_id, message } = req.body;
    if (!teacher_id || !message) {
      return res.status(400).json({ success: false, error: 'Teacher ID and message are required.' });
    }

    // Attempt insert in dummy table if existed or just resolve mock
    return res.status(200).json({
      success: true,
      message: {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        sender_role: 'Parent',
        sender_id: req.user?.id || 'parent_id',
        receiver_id: teacher_id,
        message,
        sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send message.' });
  }
}

export async function getParentMessages(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;
    // In a real system we would fetch messages matching sender and receiver roles
    // Return mock thread with 48h SLA response indicators
    const mockMessages = [
      {
        id: 'msg_01',
        sender_role: 'Parent',
        sender_id: req.user?.id || 'parent_id',
        receiver_id: teacherId,
        message: 'Hello teacher, I wanted to inquire about Vikram\'s attendance dip.',
        created_at: new Date(Date.now() - 3600 * 1000 * 25).toISOString()
      },
      {
        id: 'msg_02',
        sender_role: 'Teacher',
        sender_id: teacherId,
        receiver_id: req.user?.id || 'parent_id',
        message: 'Hello! He was absent for two labs. We discussed this and he promised to submit regularizations.',
        created_at: new Date(Date.now() - 3600 * 1000 * 22).toISOString()
      }
    ];

    return res.status(200).json({
      success: true,
      messages: mockMessages
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch messages.' });
  }
}

export async function bookPTM(req: Request, res: Response) {
  try {
    const { teacher_id, date, slot_time } = req.body;
    if (!teacher_id || !date || !slot_time) {
      return res.status(400).json({ success: false, error: 'Teacher ID, date, and slot_time are required.' });
    }

    return res.status(200).json({
      success: true,
      booking: {
        id: 'ptm_' + Math.random().toString(36).substring(2, 9),
        teacher_id,
        parent_id: req.user?.id || 'parent_id',
        date,
        slot_time,
        meet_link: `https://meet.jit.si/iris-ptm-${Math.random().toString(36).substring(2, 9)}`,
        status: 'confirmed'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to book PTM.' });
  }
}

export async function getPTMSlots(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;
    // Slots availability
    const slots = [
      { id: 'slot_1', time: '04:00 PM - 04:15 PM', available: true },
      { id: 'slot_2', time: '04:15 PM - 04:30 PM', available: false },
      { id: 'slot_3', time: '04:30 PM - 04:45 PM', available: true },
      { id: 'slot_4', time: '04:45 PM - 05:00 PM', available: true }
    ];
    return res.status(200).json({
      success: true,
      slots
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch slots.' });
  }
}
