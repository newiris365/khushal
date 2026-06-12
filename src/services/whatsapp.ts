import logger from '../config/logger';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

function isSandboxMode(): boolean {
  return !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN;
}

async function twilioFetch(endpoint: string, body: URLSearchParams): Promise<any> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}${endpoint}`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  params: Record<string, string>
): Promise<boolean> {
  if (isSandboxMode()) {
    logger.info(`[WHATSAPP SANDBOX] To: ${to}, Template: ${templateName}, Params: ${JSON.stringify(params)}`);
    return true;
  }

  try {
    const body = new URLSearchParams({
      To: to,
      From: TWILIO_WHATSAPP_FROM,
      ContentTemplateSid: templateName,
      ContentVariables: JSON.stringify(params),
    });

    await twilioFetch('/Messages.json', body);
    logger.info(`WhatsApp message sent to ${to} using template ${templateName}`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to send WhatsApp message to ${to}: ${err.message}`);
    return false;
  }
}

export async function sendFeeReminder(
  studentPhone: string,
  studentName: string,
  feeName: string,
  amount: number,
  dueDate: string,
  daysOverdue: number
): Promise<boolean> {
  if (isSandboxMode()) {
    logger.info(
      `[WHATSAPP FEE REMINDER SANDBOX] To: ${studentPhone}, Student: ${studentName}, Fee: ${feeName}, Amount: ₹${amount}, Due: ${dueDate}, Days Overdue: ${daysOverdue}`
    );
    return true;
  }

  try {
    const messageBody = daysOverdue > 0
      ? `Dear ${studentName}, your fee payment of ₹${amount} for "${feeName}" was due on ${dueDate} and is now ${daysOverdue} day(s) overdue. Please pay immediately to avoid late charges. - IRIS 365`
      : `Dear ${studentName}, this is a reminder that your fee payment of ₹${amount} for "${feeName}" is due on ${dueDate}. Please ensure timely payment. - IRIS 365`;

    const body = new URLSearchParams({
      To: studentPhone,
      From: TWILIO_WHATSAPP_FROM,
      Body: messageBody,
    });

    await twilioFetch('/Messages.json', body);
    logger.info(`Fee reminder sent to ${studentPhone} for ${feeName}`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to send fee reminder to ${studentPhone}: ${err.message}`);
    return false;
  }
}

export interface FeeReminderEntry {
  student_id: string;
  student_name: string;
  student_phone: string;
  fee_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
}

export interface AttendanceWarningEntry {
  student_id: string;
  student_name: string;
  student_phone: string;
  guardian_phone: string | null;
  attendance_pct: number;
  total_classes: number;
  attended_classes: number;
  warning_type: 'warning_80' | 'critical_75' | 'final_60';
  department_name: string;
}

export async function sendAttendanceWarning(entry: AttendanceWarningEntry): Promise<{ student: boolean; parent: boolean }> {
  const levelMap = {
    warning_80: { label: 'Warning', emoji: '⚠️', threshold: '80%' },
    critical_75: { label: 'Critical', emoji: '🚨', threshold: '75%' },
    final_60: { label: 'Final Notice', emoji: '🔴', threshold: '60%' },
  };
  const level = levelMap[entry.warning_type];

  const studentMsg = `${level.emoji} ATTENDANCE ${level.label.toUpperCase()}: Dear ${entry.student_name}, your attendance has dropped to ${entry.attendance_pct}% (below ${level.threshold} threshold). You have attended ${entry.attended_classes}/${entry.total_classes} classes. Continued shortage may bar you from exams. - IRIS 365 ${entry.department_name}`;

  const parentMsg = `${level.emoji} ATTENDANCE ALERT: Your child ${entry.student_name} (${entry.department_name}) has ${entry.attendance_pct}% attendance (attended ${entry.attended_classes}/${entry.total_classes} classes). This is below the ${level.threshold} requirement. Please contact the college. - IRIS 365`;

  let studentSent = false;
  let parentSent = false;

  // Send to student
  if (entry.student_phone) {
    try {
      if (isSandboxMode()) {
        logger.info(`[WHATSAPP ATTENDANCE SANDBOX] Student: ${entry.student_phone}, Pct: ${entry.attendance_pct}%, Level: ${level.label}`);
        studentSent = true;
      } else {
        const body = new URLSearchParams({ To: entry.student_phone, From: TWILIO_WHATSAPP_FROM, Body: studentMsg });
        await twilioFetch('/Messages.json', body);
        studentSent = true;
        logger.info(`Attendance ${level.label} sent to student ${entry.student_phone}`);
      }
    } catch (err: any) {
      logger.error(`Failed to send attendance warning to student ${entry.student_phone}: ${err.message}`);
    }
  }

  // Send to parent
  if (entry.guardian_phone) {
    try {
      if (isSandboxMode()) {
        logger.info(`[WHATSAPP ATTENDANCE SANDBOX] Parent: ${entry.guardian_phone}, Student: ${entry.student_name}, Pct: ${entry.attendance_pct}%`);
        parentSent = true;
      } else {
        const body = new URLSearchParams({ To: entry.guardian_phone, From: TWILIO_WHATSAPP_FROM, Body: parentMsg });
        await twilioFetch('/Messages.json', body);
        parentSent = true;
        logger.info(`Attendance ${level.label} sent to parent ${entry.guardian_phone}`);
      }
    } catch (err: any) {
      logger.error(`Failed to send attendance warning to parent ${entry.guardian_phone}: ${err.message}`);
    }
  }

  return { student: studentSent, parent: parentSent };
}

export interface FeeEscalationEntry {
  student_id: string;
  student_name: string;
  student_phone: string;
  guardian_phone: string | null;
  hod_phone: string | null;
  fee_name: string;
  amount: number;
  amount_overdue: number;
  days_overdue: number;
  stage: string;
  total_due: number;
}

export async function sendFeeEscalation(entry: FeeEscalationEntry): Promise<{ student: boolean; parent: boolean; hod: boolean }> {
  let studentSent = false;
  let parentSent = false;
  let hodSent = false;

  const stageMessages: Record<string, string> = {
    reminder_7day: `Dear ${entry.student_name}, your fee "${entry.fee_name}" of ₹${entry.amount} is due in 7 days (on ${new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN')}). Please plan your payment. - IRIS 365`,
    reminder_1day: `Dear ${entry.student_name}, your fee "${entry.fee_name}" of ₹${entry.amount} is due TOMORROW. Please ensure timely payment. - IRIS 365`,
    due_today: `Dear ${entry.student_name}, your fee "${entry.fee_name}" of ₹${entry.amount} is due TODAY. Please pay immediately. - IRIS 365`,
    overdue_7day: `URGENT: Dear ${entry.student_name}, your fee "${entry.fee_name}" is ${entry.days_overdue} days overdue. Amount: ₹${entry.amount_overdue}. Late fees are now being charged. Pay immediately. - IRIS 365`,
    overdue_30day: `FINAL NOTICE: Dear ${entry.student_name}, your fee "${entry.fee_name}" is ${entry.days_overdue} days overdue (₹${entry.total_due} total). A formal notice will be generated. Pay now to avoid escalation. - IRIS 365`,
  };

  const msg = stageMessages[entry.stage] || stageMessages.reminder_7day;

  // Send to student
  if (entry.student_phone) {
    try {
      if (isSandboxMode()) {
        logger.info(`[WHATSAPP FEE ESCALATION SANDBOX] Student: ${entry.student_phone}, Stage: ${entry.stage}, Amount: ₹${entry.amount_overdue}`);
        studentSent = true;
      } else {
        const body = new URLSearchParams({ To: entry.student_phone, From: TWILIO_WHATSAPP_FROM, Body: msg });
        await twilioFetch('/Messages.json', body);
        studentSent = true;
      }
    } catch (err: any) {
      logger.error(`Failed to send fee escalation to student: ${err.message}`);
    }
  }

  // Send to parent (for overdue stages)
  if (entry.guardian_phone && ['due_today', 'overdue_7day', 'overdue_30day'].includes(entry.stage)) {
    const parentMsg = `Dear Parent, your child ${entry.student_name} has an overdue fee "${entry.fee_name}" of ₹${entry.total_due} (${entry.days_overdue} days overdue). Please ensure timely payment. - IRIS 365`;
    try {
      if (isSandboxMode()) {
        logger.info(`[WHATSAPP FEE ESCALATION SANDBOX] Parent: ${entry.guardian_phone}, Student: ${entry.student_name}`);
        parentSent = true;
      } else {
        const body = new URLSearchParams({ To: entry.guardian_phone, From: TWILIO_WHATSAPP_FROM, Body: parentMsg });
        await twilioFetch('/Messages.json', body);
        parentSent = true;
      }
    } catch (err: any) {
      logger.error(`Failed to send fee escalation to parent: ${err.message}`);
    }
  }

  // Send to HOD (for overdue_7day and beyond)
  if (entry.hod_phone && ['overdue_7day', 'overdue_30day'].includes(entry.stage)) {
    const hodMsg = `NOTICE: Student ${entry.student_name} has fee "${entry.fee_name}" overdue by ${entry.days_overdue} days (₹${entry.total_due} total). Please follow up. - IRIS 365`;
    try {
      if (isSandboxMode()) {
        logger.info(`[WHATSAPP FEE ESCALATION SANDBOX] HOD: ${entry.hod_phone}, Student: ${entry.student_name}`);
        hodSent = true;
      } else {
        const body = new URLSearchParams({ To: entry.hod_phone, From: TWILIO_WHATSAPP_FROM, Body: hodMsg });
        await twilioFetch('/Messages.json', body);
        hodSent = true;
      }
    } catch (err: any) {
      logger.error(`Failed to send fee escalation to HOD: ${err.message}`);
    }
  }

  return { student: studentSent, parent: parentSent, hod: hodSent };
}

export interface DailyDigestEntry {
  parent_phone: string;
  student_name: string;
  date: string;
  attendance_present: number;
  attendance_total: number;
  attendance_pct: number;
  canteen_spend: number;
  bus_boarded: boolean;
  bus_time: string | null;
  pending_fees: number;
}

export async function sendDailyDigest(entry: DailyDigestEntry): Promise<boolean> {
  const attendanceStatus = entry.attendance_pct >= 75 ? '✅' : entry.attendance_pct >= 60 ? '⚠️' : '🚨';
  const busStatus = entry.bus_boarded
    ? `🚌 Boarded at ${entry.bus_time || 'N/A'}`
    : '🚌 Not boarded today';

  const message = [
    `📊 *Daily Summary — ${entry.date}*`,
    ``,
    `${attendanceStatus} *Attendance:* ${entry.attendance_present}/${entry.attendance_total} classes (${entry.attendance_pct}%)`,
    `🍽️ *Canteen Spend:* ₹${entry.canteen_spend}`,
    busStatus,
    entry.pending_fees > 0 ? `💰 *Pending Fees:* ₹${entry.pending_fees.toLocaleString('en-IN')}` : '',
    ``,
    `— IRIS 365`,
  ].filter(Boolean).join('\n');

  if (isSandboxMode()) {
    logger.info(`[WHATSAPP DAILY DIGEST SANDBOX] To: ${entry.parent_phone}, Student: ${entry.student_name}, Attendance: ${entry.attendance_pct}%, Spend: ₹${entry.canteen_spend}`);
    return true;
  }

  try {
    const body = new URLSearchParams({
      To: entry.parent_phone,
      From: TWILIO_WHATSAPP_FROM,
      Body: message,
    });
    await twilioFetch('/Messages.json', body);
    logger.info(`Daily digest sent to ${entry.parent_phone} for ${entry.student_name}`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to send daily digest to ${entry.parent_phone}: ${err.message}`);
    return false;
  }
}

export async function sendBulkReminders(reminders: FeeReminderEntry[]): Promise<{ sent: number; failed: number; details: { student_id: string; status: string }[] }> {
  let sent = 0;
  let failed = 0;
  const details: { student_id: string; status: string }[] = [];

  for (const reminder of reminders) {
    if (!reminder.student_phone) {
      failed++;
      details.push({ student_id: reminder.student_id, status: 'no_phone' });
      continue;
    }

    const success = await sendFeeReminder(
      reminder.student_phone,
      reminder.student_name,
      reminder.fee_name,
      reminder.amount,
      reminder.due_date,
      reminder.days_overdue
    );

    if (success) {
      sent++;
      details.push({ student_id: reminder.student_id, status: 'sent' });
    } else {
      failed++;
      details.push({ student_id: reminder.student_id, status: 'failed' });
    }
  }

  logger.info(`Bulk reminders: ${sent} sent, ${failed} failed out of ${reminders.length}`);
  return { sent, failed, details };
}
