import { useState } from 'react';
import { qrService } from '../../services/qrService';
import toast from 'react-hot-toast';
import { useConfirm } from '../common/ConfirmProvider';

// Check-in / check-out actions shared by every gate page
export const useGateActions = (onDone) => {
  const [busyId, setBusyId] = useState(null);
  const [bill, setBill] = useState(null); // exit payment session awaiting confirmation
  const [confirming, setConfirming] = useState(false);
  const confirm = useConfirm();

  const startCheckout = async (bookingId) => {
    setBusyId(bookingId);
    try {
      const res = await qrService.validateExit(bookingId);
      setBill({ ...res.booking, payment_id: res.payment?.id, amount_due: res.parking_charge, booking_id: bookingId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start checkout.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmCheckout = async () => {
    setConfirming(true);
    try {
      const res = await qrService.confirmExitPayment({ booking_id: bill.booking_id, payment_id: bill.payment_id, notes: 'Collected at gate desk' });
      toast.success(res.message || 'Checked out. Slot is free.');
      setBill(null);
      onDone && (await onDone());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not confirm payment.');
    } finally {
      setConfirming(false);
    }
  };

    const checkInPrebooked = async (bookingId, vehicleNo) => {
    if (!(await confirm({ title: `Check in ${vehicleNo}?`, message: 'Records the vehicle as entered and starts its parking time. This cannot be undone.', confirmLabel: 'Check In' }))) return;
    setBusyId(bookingId);
    try {
      const res = await qrService.validateEntry(bookingId);
      toast.success(res.message || 'Checked in.');
      onDone && (await onDone());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, bill, confirming, startCheckout, confirmCheckout, checkInPrebooked, closeBill: () => !confirming && setBill(null) };
};
