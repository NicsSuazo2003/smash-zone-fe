// src/services/mockData.ts
import type {
  Booking,
  BookingStatus,
  Court,
  TimeSlot,
  BlockedDate,
  Analytics,
} from '@/types';
import { COURT_IMAGES, FIXED_SLOT } from '@/utils/constants';
import { addDays, toISODate, todayISO } from '@/utils/format';
import { MOCK_COURT_GUIDS } from './bookingService';

// Helper to generate deterministic IDs for mock data
function generateMockId(prefix: string, ...parts: string[]): string {
  return `${prefix}-${parts.join('-')}`;
}

export const mockCourts: Court[] = [
  {
    id: MOCK_COURT_GUIDS['court-1'], // Use UUID instead of 'court-1'
    name: 'Cedar Court',
    description:
      'Premium indoor court with professional-grade flooring and climate control. Perfect for competitive play year-round.',
    image: COURT_IMAGES.court1,
    price_per_hour: 350,
    peak_price_per_hour: 450,
    open_time: '05:00',
    close_time: '23:00',
    amenities: ['Indoor', 'Air Conditioned', 'Lighted', 'Showers', 'WiFi', 'Parking'],
    surface: 'Hard Court - Polyurethane',
    is_indoor: true,
    is_active: true,
  },
  {
    id: MOCK_COURT_GUIDS['court-2'], // Use UUID instead of 'court-2'
    name: 'Pine Grove Court',
    description:
      'Open-air court surrounded by greenery with premium lighting for evening games. Enjoy the fresh air while you play.',
    image: COURT_IMAGES.court2,
    price_per_hour: 280,
    peak_price_per_hour: 380,
    open_time: '06:00',
    close_time: '22:00',
    amenities: ['Outdoor', 'Lighted', 'Parking', 'Water Station', 'Spectator Seating'],
    surface: 'Hard Court - Acrylic',
    is_indoor: false,
    is_active: true,
  },
  {
    id: MOCK_COURT_GUIDS['court-3'], // Use UUID instead of 'court-3'
    name: 'Mosswood Arena',
    description:
      'Our flagship court with stadium seating and tournament-grade surfaces. Host your leagues and events here.',
    image: COURT_IMAGES.court3,
    price_per_hour: 500,
    peak_price_per_hour: 650,
    open_time: '05:00',
    close_time: '23:00',
    amenities: [
      'Indoor',
      'Air Conditioned',
      'Lighted',
      'Showers',
      'Pro Shop',
      'WiFi',
      'Parking',
      'Spectator Seating',
    ],
    surface: 'Cushioned Hard Court',
    is_indoor: true,
    is_active: true,
  },
];

function generateSlotsForCourt(court: Court, date: string, bookedSlots: string[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [openH] = court.open_time.split(':').map(Number);
  const [closeH] = court.close_time.split(':').map(Number);
  const peakStartH = 17; // 5 PM peak start
  const peakEndH = 21; // 9 PM peak end

  for (let h = openH; h < closeH; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;

    // Skip the two slots covered by the fixed 2hr slot (4-5 PM and 5-6 PM)
    if (h === 16 || h === 17) continue;

    const isPeak = h >= peakStartH && h < peakEndH;
    const price = isPeak ? court.peak_price_per_hour : court.price_per_hour;
    const slotId = generateMockId('slot', court.id, date, start);
    const isAvailable = !bookedSlots.includes(start);

    slots.push({
      id: slotId,
      court_id: court.id,
      date,
      start_time: start,
      end_time: end,
      type: 'standard',
      price,
      is_available: isAvailable,
      is_peak: isPeak,
    });
  }

  // Add the fixed 2hr slot (4:00 PM - 6:00 PM)
  const fixedSlotId = generateMockId('slot', court.id, date, 'fixed');
  const fixedBooked = bookedSlots.includes('16:00') || bookedSlots.includes('17:00');
  slots.push({
    id: fixedSlotId,
    court_id: court.id,
    date,
    start_time: FIXED_SLOT.start,
    end_time: FIXED_SLOT.end,
    type: 'fixed_2hr',
    price: court.price_per_hour * FIXED_SLOT.hours,
    is_available: !fixedBooked,
    is_peak: true,
  });

  // Sort: standard slots by time, with fixed slot at its position (16:00)
  slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return slots;
}

export function generateMockSlots(courtId: string, date: string): TimeSlot[] {
  const court = mockCourts.find((c) => c.id === courtId);
  if (!court) return [];

  // Determine booked slots from mock bookings
  const bookedSlots: string[] = [];
  mockBookings.forEach((b) => {
    if (b.court_id === courtId && b.date === date && b.status !== 'cancelled' && b.status !== 'rejected') {
      b.slots.forEach((s) => bookedSlots.push(s.start_time));
    }
  });

  // Add some random "booked" slots for demo variety on non-today dates
  if (date !== todayISO()) {
    const seed = date.split('-').reduce((a, c) => a + parseInt(c), 0);
    const extraBooked = ['07:00', '18:00', '19:00'].filter((_, i) => (seed + i) % 3 === 0);
    extraBooked.forEach((s) => bookedSlots.push(s));
  }

  return generateSlotsForCourt(court, date, bookedSlots);
}

export const mockBookings: Booking[] = [
  {
    id: generateMockId('booking', '1'),
    reference_code: 'PJAB12CD',
    court_id: MOCK_COURT_GUIDS['court-1'],
    court_name: 'Cedar Court',
    date: todayISO(),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], todayISO(), '1600'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], todayISO(), '1600'),
        start_time: '16:00',
        end_time: '18:00',
        date: todayISO(),
        type: 'fixed_2hr',
        price: 700,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '0917 111 2222',
      notes: 'Birthday game with friends',
    },
    total_amount: 700,
    status: 'confirmed',
    payment_screenshot_url: null,
    payment_reference: 'GCASH12345',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 80000000).toISOString(),
  },
  {
    id: generateMockId('booking', '2'),
    reference_code: 'PJEF34GH',
    court_id: MOCK_COURT_GUIDS['court-2'],
    court_name: 'Pine Grove Court',
    date: todayISO(),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], todayISO(), '1800'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], todayISO(), '1800'),
        start_time: '18:00',
        end_time: '19:00',
        date: todayISO(),
        type: 'standard',
        price: 380,
        is_peak: true,
      },
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], todayISO(), '1900'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], todayISO(), '1900'),
        start_time: '19:00',
        end_time: '20:00',
        date: todayISO(),
        type: 'standard',
        price: 380,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '0918 333 4444',
      notes: '',
    },
    total_amount: 760,
    status: 'pending_payment',
    payment_screenshot_url: null,
    payment_reference: '',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: generateMockId('booking', '3'),
    reference_code: 'PJIJ56KL',
    court_id: MOCK_COURT_GUIDS['court-3'],
    court_name: 'Mosswood Arena',
    date: toISODate(addDays(new Date(), 1)),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-3'], toISODate(addDays(new Date(), 1)), '1600'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-3'], toISODate(addDays(new Date(), 1)), '1600'),
        start_time: '16:00',
        end_time: '18:00',
        date: toISODate(addDays(new Date(), 1)),
        type: 'fixed_2hr',
        price: 1000,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Anna Reyes',
      email: 'anna.reyes@email.com',
      phone: '0919 555 6666',
      notes: 'Tournament practice',
    },
    total_amount: 1000,
    status: 'payment_submitted',
    payment_screenshot_url: 'mock-screenshot-url',
    payment_reference: 'GCASH67890',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: generateMockId('booking', '4'),
    reference_code: 'PJMN78OP',
    court_id: MOCK_COURT_GUIDS['court-1'],
    court_name: 'Cedar Court',
    date: toISODate(addDays(new Date(), 2)),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 2)), '1900'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 2)), '1900'),
        start_time: '19:00',
        end_time: '20:00',
        date: toISODate(addDays(new Date(), 2)),
        type: 'standard',
        price: 450,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Carlos Tan',
      email: 'carlos.tan@email.com',
      phone: '0920 777 8888',
      notes: '',
    },
    total_amount: 450,
    status: 'completed',
    payment_screenshot_url: 'mock-screenshot-url',
    payment_reference: 'GCASH11111',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: generateMockId('booking', '5'),
    reference_code: 'PJQR90ST',
    court_id: MOCK_COURT_GUIDS['court-3'],
    court_name: 'Mosswood Arena',
    date: toISODate(addDays(new Date(), -1)),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-3'], toISODate(addDays(new Date(), -1)), '1600'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-3'], toISODate(addDays(new Date(), -1)), '1600'),
        start_time: '16:00',
        end_time: '18:00',
        date: toISODate(addDays(new Date(), -1)),
        type: 'fixed_2hr',
        price: 1000,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Lisa Garcia',
      email: 'lisa.garcia@email.com',
      phone: '0921 999 0000',
      notes: 'League match',
    },
    total_amount: 1000,
    status: 'cancelled',
    payment_screenshot_url: null,
    payment_reference: '',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: generateMockId('booking', '6'),
    reference_code: 'PJUV12WX',
    court_id: MOCK_COURT_GUIDS['court-2'],
    court_name: 'Pine Grove Court',
    date: toISODate(addDays(new Date(), 3)),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], toISODate(addDays(new Date(), 3)), '1600'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-2'], toISODate(addDays(new Date(), 3)), '1600'),
        start_time: '16:00',
        end_time: '18:00',
        date: toISODate(addDays(new Date(), 3)),
        type: 'fixed_2hr',
        price: 560,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Pedro Lim',
      email: 'pedro.lim@email.com',
      phone: '0922 123 4567',
      notes: '',
    },
    total_amount: 560,
    status: 'confirmed',
    payment_screenshot_url: 'mock-screenshot-url',
    payment_reference: 'GCASH22222',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: generateMockId('booking', '7'),
    reference_code: 'PJYZ34AB',
    court_id: MOCK_COURT_GUIDS['court-1'],
    court_name: 'Cedar Court',
    date: toISODate(addDays(new Date(), 5)),
    slots: [
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 5)), '1700'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 5)), '1700'),
        start_time: '17:00',
        end_time: '18:00',
        date: toISODate(addDays(new Date(), 5)),
        type: 'standard',
        price: 450,
        is_peak: true,
      },
      {
        id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 5)), '1800'),
        slot_id: generateMockId('slot', MOCK_COURT_GUIDS['court-1'], toISODate(addDays(new Date(), 5)), '1800'),
        start_time: '18:00',
        end_time: '19:00',
        date: toISODate(addDays(new Date(), 5)),
        type: 'standard',
        price: 450,
        is_peak: true,
      },
    ],
    customer: {
      name: 'Sophia Cruz',
      email: 'sophia.cruz@email.com',
      phone: '0923 234 5678',
      notes: 'Group session',
    },
    total_amount: 900,
    status: 'confirmed',
    payment_screenshot_url: 'mock-screenshot-url',
    payment_reference: 'GCASH33333',
    gcash_number: '0917 234 5678',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

export const mockBlockedDates: BlockedDate[] = [
  {
    id: generateMockId('blocked', '1'),
    court_id: MOCK_COURT_GUIDS['court-2'],
    date: toISODate(addDays(new Date(), 4)),
    reason: 'Surface maintenance',
  },
  {
    id: generateMockId('blocked', '2'),
    court_id: MOCK_COURT_GUIDS['court-3'],
    date: toISODate(addDays(new Date(), 6)),
    reason: 'Tournament setup',
  },
];

export function generateMockAnalytics(): Analytics {
  const bookings = mockBookings;
  const statusBreakdown: Record<BookingStatus, number> = {
  pending_payment: 0,
  payment_submitted: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  rejected: 0,
  expired: 0,   // ✅ added
  refunded: 0,  // ✅ added
};
  bookings.forEach((b) => {
    statusBreakdown[b.status]++;
  });

  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.total_amount, 0);

  // Revenue by day (last 7 days)
  const revenueByDay: { date: string; revenue: number; bookings: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = toISODate(addDays(new Date(), -i));
    const dayBookings = bookings.filter((b) => b.date === date);
    const dayRevenue = dayBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.total_amount, 0);
    revenueByDay.push({ date, revenue: dayRevenue, bookings: dayBookings.length });
  }

  // Court breakdown
  const courtMap = new Map<string, { bookings: number; revenue: number }>();
  bookings.forEach((b) => {
    const existing = courtMap.get(b.court_id) ?? { bookings: 0, revenue: 0 };
    existing.bookings++;
    if (b.status === 'confirmed' || b.status === 'completed') {
      existing.revenue += b.total_amount;
    }
    courtMap.set(b.court_id, existing);
  });

  return {
    total_bookings: bookings.length,
    total_revenue: totalRevenue,
    pending_payments: statusBreakdown.pending_payment + statusBreakdown.payment_submitted,
    confirmed_bookings: statusBreakdown.confirmed,
    completed_bookings: statusBreakdown.completed,
    cancelled_bookings: statusBreakdown.cancelled,
    status_breakdown: statusBreakdown,
    revenue_by_day: revenueByDay,
    court_breakdown: mockCourts.map((c) => ({
      court_id: c.id,
      court_name: c.name,
      bookings: courtMap.get(c.id)?.bookings ?? 0,
      revenue: courtMap.get(c.id)?.revenue ?? 0,
    })),
  };
}