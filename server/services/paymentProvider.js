/**
 * Manual Gate Payment Service
 * Handles manual exit payment sessions and security operator confirmations.
 * No external payment gateways are used.
 */

class ManualPaymentProvider {
  /**
   * Create a manual exit payment session reference
   */
  async createPayment({ bookingId, amount, paymentType = 'parking_charge', timeoutSeconds = 300 }) {
    const orderReference = `EXIT-ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

    return {
      provider: 'manual',
      orderReference,
      amount: parseFloat(amount),
      currency: 'INR',
      status: 'pending',
      paymentType,
      expiresAt
    };
  }

  /**
   * Verify manual payment confirmed by security guard / admin
   */
  async verifyPayment({ transactionReference, operatorName, notes }) {
    const txnRef = transactionReference || `MANUAL-REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      verified: true,
      provider: 'manual',
      transactionReference: txnRef,
      operatorName: operatorName || 'Security Gate Operator',
      paidAt: new Date(),
      notes: notes || 'Verified manually at exit gate'
    };
  }
}

const manualProvider = new ManualPaymentProvider();

function getPaymentProvider() {
  return manualProvider;
}

module.exports = {
  ManualPaymentProvider,
  getPaymentProvider
};
