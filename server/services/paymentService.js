/**
 * Simulated Payment Service
 * Provides mock payment creation and verification (replacing Razorpay requirement)
 */
class SimulatedPaymentService {
  async createOrder(amount, bookingId) {
    const orderId = `SIM-ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      orderId,
      amount: parseFloat(amount),
      currency: 'INR',
      status: 'created',
      bookingId
    };
  }

  async verifyPayment(orderId, paymentMethod = 'simulated') {
    // Simulated payment always succeeds in test mode
    const transactionRef = `SIM-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      verified: true,
      transactionRef,
      paymentMethod,
      paidAt: new Date()
    };
  }
}

export default new SimulatedPaymentService();
