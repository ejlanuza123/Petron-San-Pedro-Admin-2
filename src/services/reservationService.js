import { supabase } from '../lib/supabase';

const RESERVED_STATUS = 'reserved';

function getRangeForDate(dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59.999`);
  return { start, end };
}

function getRangeForMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export const reservationService = {
  async getByDate(dateKey) {
    const { start, end } = getRangeForDate(dateKey);

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        scheduled_at,
        customer_name,
        customer_phone,
        notes,
        user_id,
        profiles:user_id (full_name, phone_number, email)
      `)
      .eq('status', RESERVED_STATUS)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getMonthReservations(monthDate) {
    const { start, end } = getRangeForMonth(monthDate);

    const { data, error } = await supabase
      .from('reservations')
      .select('id, scheduled_at')
      .eq('status', RESERVED_STATUS)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  subscribe(callback) {
    return supabase
      .channel('admin-reservations-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, callback)
      .subscribe();
  },
};
