import pytest

class TestMissingFeaturesSRS:
    """
    Explicitly tracks features specified in the SRS but verified as NOT IMPLEMENTED in the codebase.
    These are marked as NOT IMPLEMENTED / Skipped to prevent false-positive reporting.
    """

    def test_missing_01_real_razorpay_gateway_integration(self):
        """NOT IMPLEMENTED: Real Razorpay payment gateway integration (Req-9). Current system uses manual/simulated payment provider."""
        pytest.skip("NOT IMPLEMENTED: Real Razorpay payment gateway integration (Req-9) is not implemented.")

    def test_missing_02_user_self_service_live_booking(self):
        """NOT IMPLEMENTED: User self-service instant live booking with entry QR (Req-6). Implemented only as gate guard walk-in desk."""
        pytest.skip("NOT IMPLEMENTED: User self-service live booking (Req-6) is not implemented.")

    def test_missing_03_advanced_lot_search_filtering(self):
        """NOT IMPLEMENTED: Advanced parking lot search by location radius, date, and time (Req-3)."""
        pytest.skip("NOT IMPLEMENTED: Advanced parking lot search by location, date, and time (Req-3) is not implemented.")

    def test_missing_04_automated_nightly_backups(self):
        """NOT IMPLEMENTED: Automated nightly database backups with 30-day retention cycle (Section 5.5)."""
        pytest.skip("NOT IMPLEMENTED: Automated nightly database backups and 30-day retention (Section 5.5) are not implemented.")

    def test_missing_05_admin_direct_user_administration(self):
        """NOT IMPLEMENTED: Direct user administration (edit, suspend, delete customer accounts) by admin (Req-13)."""
        pytest.skip("NOT IMPLEMENTED: Direct user administration (edit/suspend/delete) by admin (Req-13) is not implemented.")

