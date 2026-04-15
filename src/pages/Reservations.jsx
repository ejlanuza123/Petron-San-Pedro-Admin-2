import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Phone, User } from 'lucide-react';
import { reservationService } from '../services/reservationService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Reservations() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [monthRows, setMonthRows] = useState([]);
  const [dayReservations, setDayReservations] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [error, setError] = useState('');

  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );

  const daysWithReservations = useMemo(() => {
    const map = new Map();

    monthRows.forEach((row) => {
      const key = toDateKey(new Date(row.scheduled_at));
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [monthRows]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

    return cells;
  }, [currentMonth]);

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    setError('');
    try {
      const rows = await reservationService.getMonthReservations(currentMonth);
      setMonthRows(rows);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Unable to load reservation month summary.');
    } finally {
      setLoadingMonth(false);
    }
  }, [currentMonth]);

  const loadDay = useCallback(async () => {
    setLoadingDay(true);
    setError('');
    try {
      const rows = await reservationService.getByDate(selectedDateKey);
      setDayReservations(rows);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Unable to load selected day reservations.');
    } finally {
      setLoadingDay(false);
    }
  }, [selectedDateKey]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  useEffect(() => {
    const subscription = reservationService.subscribe(() => {
      loadMonth();
      loadDay();
    });

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [loadDay, loadMonth]);

  const goToMonth = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-[#0033A0]" size={24} />
            Reservations
          </h1>
          <p className="text-sm text-gray-600">Read-only view of customer schedule submissions.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-semibold text-gray-900">{monthLabel}</h2>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">
            {WEEKDAYS.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-12" />;
              }

              const key = toDateKey(date);
              const selected = key === selectedDateKey;
              const count = daysWithReservations.get(key) || 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                  className={`h-12 rounded-md border text-sm font-medium transition ${
                    selected
                      ? 'bg-[#0033A0] border-[#0033A0] text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span>{date.getDate()}</span>
                    {count > 0 && (
                      <span
                        className={`mt-1 inline-block min-w-4 px-1 rounded-full text-[10px] ${
                          selected ? 'bg-white text-[#0033A0]' : 'bg-[#ED2939] text-white'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Day badges show how many reservations are scheduled on that date.
          </p>
          {loadingMonth && <p className="mt-2 text-xs text-blue-700">Loading month summary...</p>}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{formatDateLabel(selectedDateKey)}</h2>
          <p className="text-sm text-gray-600 mb-4">Admin can view only. No actions are available.</p>

          {loadingDay ? (
            <div className="text-sm text-blue-700">Loading reservations...</div>
          ) : dayReservations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              No reservations for this day.
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {dayReservations.map((reservation) => {
                const profile = reservation.profiles || {};
                const displayName = reservation.customer_name || profile.full_name || 'Customer';
                const displayPhone = reservation.customer_phone || profile.phone_number || 'N/A';

                return (
                  <article key={reservation.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="font-semibold text-gray-900">Reservation #{reservation.id}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                        <Clock size={12} />
                        {formatTime(reservation.scheduled_at)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700">
                      <p className="flex items-center gap-2">
                        <User size={14} className="text-gray-500" />
                        <span>{displayName}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-500" />
                        <span>{displayPhone}</span>
                      </p>
                      {reservation.notes && (
                        <p className="text-gray-600 bg-white border border-gray-200 rounded-md p-2">
                          {reservation.notes}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
