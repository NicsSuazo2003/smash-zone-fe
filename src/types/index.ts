export type BookingStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'refunded';

export type SlotType = 'standard' | 'fixed_2hr';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Court {
  id: string;
  name: string;
  description: string;
  image: string;
  image_url?: string;
  price_per_hour: number;
  peak_price_per_hour: number;
  open_time: string;
  close_time: string;
  amenities: string[];
  surface: string;
  dimensions?: string;
  images?: string[];
  rating?: number;
  type?: string;
  is_indoor: boolean;
  is_active: boolean;
  status?: string;
  client_id?: string;
  pricing_rules?: PricingRule[];
}

export interface TimeSlot {
  id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: SlotType;
  price: number;
  is_available: boolean;
  is_peak: boolean;
  is_pending?: boolean;
  is_blocked?: boolean;
}

export interface BookingSlotItem {
  id: string;
  slot_id: string;
  court_id: string;
  court_name?: string; 
  start_time: string;
  end_time: string;
  date: string;
  type: SlotType;
  price: number;
  is_peak: boolean;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface Booking {
  id: string;
  reference_code: string;
  court_id: string;
  court_name: string;
  date: string;
  slots: BookingSlotItem[];
  customer: CustomerDetails;
  total_amount: number;
  status: BookingStatus;
  payment_screenshot_url?: string | null;
  payment_reference?: string;
  payment_expires_at?: string | null;
  gcash_number: string;
  created_at: string;
  updated_at: string;
  open_play_session_id?: string | null;
}

export interface SlotSelection {
  slot_id: string;
  start_time: string;
  end_time: string;
  date: string;
  type: SlotType;
  price: number;
  is_peak: boolean;
}

export interface BlockedDate {
  id: string;
  court_id: string;
  date: string;
  reason: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface PricingRule {
  id: string;
  court_id: string;
  label: string;
  days: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  priority: number;
}

export interface Analytics {
  total_bookings: number;
  total_revenue: number;
  pending_payments: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  status_breakdown: Record<BookingStatus, number>;
  revenue_by_day: { date: string; revenue: number; bookings: number }[];
  court_breakdown: { court_id: string; court_name: string; bookings: number; revenue: number }[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'gcash' | 'qr_ph' | 'bank_transfer' | 'e_wallet' | 'other';
  icon: string;
  enabled: boolean;
  config: {
    account_name?: string;
    account_number?: string;
    qr_image_url?: string;
    instructions?: string;
  };
  sort_order: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'staff';
  avatar?: string;
  createdAt?: string;
  bookingsCount?: number;
  status?: string;
}

// ⭐ Amenity card on the Landing page
export interface AmenityItem {
  name: string;
  icon: string;
  description?: string;
}

export interface ClientSettings {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string | null;
  primary_color: string;
  accent_color: string;
  gcash_number?: string | null;
  gcash_account_name?: string | null;
  payment_methods?: PaymentMethod[];
  available_amenities?: AmenityItem[];
  /**
   * ⭐ NEW — Max days ahead customers can book.
   * 0 = unlimited. Default 90 (~3 months).
   */
  max_advance_booking_days: number;
  // 👇 NEW — Master switch for customer-facing online bookings
  bookings_enabled: boolean;
}

export type AdminView = 'calendar' | 'list';

export type OpenPlaySkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
export type OpenPlaySessionStatus = 'upcoming' | 'active' | 'full' | 'past' | 'cancelled';

export interface OpenPlayCourt {
  id: string;
  name: string;
}

export interface OpenPlaySession {
  id: string;
  court_id: string;
  court_name: string;
  courts: OpenPlayCourt[];
  date: string;
  start_time: string;
  end_time: string;
  max_players: number;
  current_players: number;
  spots_left: number;
  price_per_player: number;
  skill_level: OpenPlaySkillLevel;
  host_name?: string | null;
  title?: string | null;
  description?: string | null;
  status: OpenPlaySessionStatus;
  is_active: boolean;
  created_at: string;
}

export interface OpenPlaySessionStats {
  id: string;
  total_players: number;
  max_players: number;
  total_revenue: number;
  pending_revenue: number;
  confirmed_count: number;
  pending_count: number;
}

export interface OpenPlayPlayer {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  reference_code: string;
  status: BookingStatus;
  payment_method: string;
  amount_paid: number;
  joined_at: string;
}

export interface CreateOpenPlaySessionPayload {
  court_ids: string[];
  date: string;
  start_time: string;
  end_time: string;
  max_players: number;
  price_per_player: number;
  skill_level: OpenPlaySkillLevel;
  host_name?: string;
  title?: string;
  description?: string;
}

export interface UpdateOpenPlaySessionPayload extends CreateOpenPlaySessionPayload {
  is_active: boolean;
}

export interface BookingSummary {
  id: string;
  reference_code: string;
  court_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_amount: number;
  created_at: string;
}

// ✅ Reschedule feature — request payload for the admin endpoint
export interface RescheduleBookingPayload {
  court_id?: string;       // omit to keep current court
  date?: string;           // omit to keep current date (YYYY-MM-DD)
  slots: { start_time: string; end_time: string }[];
  reason?: string;
  staff_notes?: string;
}

// ✅ Reschedule feature — response wrapper with delta info
export interface RescheduleBookingResult {
  booking: Booking;
  previous_slots: BookingSlotItem[];
  previous_date: string;
  previous_court_id: string;
  previous_court_name: string;
  previous_total_amount: number;
  new_total_amount: number;
  balance_due: number;     // positive = customer owes more
  refund_due: number;      // positive = customer is owed a refund
}