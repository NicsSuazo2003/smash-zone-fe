// src/pages/staff/StaffBookings.tsx
import { Bookings } from '@/pages/admin/Bookings';

// Bookings already selects StaffLayout vs AdminLayout internally based on role —
// wrapping it in StaffLayout here would nest two layouts for staff users.
export function StaffBookings() {
  return <Bookings />;
}