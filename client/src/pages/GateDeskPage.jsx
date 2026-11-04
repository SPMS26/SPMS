import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import WalkInPanel from '../components/admin/WalkInPanel';
import CheckoutModal from '../components/gate/CheckoutModal';
import { useGateQueue } from '../components/gate/useGateQueue';
import { useGateActions } from '../components/gate/useGateActions';

// Walk-in Desk: assign a slot to an arriving vehicle (top).
// The full lists live on the Parked Vehicles, Pre-booked Vehicles and Live Bookings pages.
const GateDeskPage = () => {
  const { queue, refresh } = useGateQueue();
  const actions = useGateActions(refresh);
  const [newPlate, setNewPlate] = useState('');

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Walk-in Desk</h1>
        </div>
      </div>

      {/* Slot assignment (live booking) */}
      <div>
        <WalkInPanel
          onChanged={refresh}
          queue={queue}
          plate={newPlate}
          onPlateChange={setNewPlate}
          onCheckout={actions.startCheckout}
        />
      </div>

      <CheckoutModal bill={actions.bill} confirming={actions.confirming} onConfirm={actions.confirmCheckout} onClose={actions.closeBill} />
    </AppLayout>
  );
};

export default GateDeskPage;
