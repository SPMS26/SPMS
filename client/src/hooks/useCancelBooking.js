import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/common/ConfirmProvider';
import { bookingService } from '../services/bookingService';

// Asks for confirmation, then cancels the booking. Resolves to true when it was cancelled.
export const useCancelBooking = () => {
  const confirm = useConfirm();

  return useCallback(async (booking) => {
    const ok = await confirm({
      title: 'Cancel this booking?',
      confirmLabel: 'Cancel Booking',
      cancelLabel: 'Keep Booking',
      danger: true
    });
    if (!ok) return false;
    try {
      await bookingService.cancelBooking(booking.id);
      toast.success('Booking cancelled.');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel the booking.');
      return false;
    }
  }, [confirm]);
};
