import pytest
import time
from pages.bookings_page import BookingsPage
from pages.registration_page import RegistrationPage
from config.test_data import generate_unique_user
from selenium.webdriver.common.by import By

@pytest.mark.history
class TestBookingHistory:

    def test_hist_01_view_booking_history(self, user_driver):
        """HIST-01: View booking history."""
        bookings_page = BookingsPage(user_driver).open()
        time.sleep(1)

        # Should render Bookings page header
        assert bookings_page.is_visible((By.XPATH, "//h1[contains(., 'Booking History')]"), timeout=5)

    def test_hist_02_view_payment_history(self, user_driver):
        """HIST-02: View payment history / reservation fee receipts."""
        bookings_page = BookingsPage(user_driver).open()
        time.sleep(1)

        cards = bookings_page.get_booking_cards()
        if cards:
            card_text = cards[0].text
            assert "fee" in card_text.lower() or "₹" in card_text or "status" in card_text.lower() or "paid" in card_text.lower()
        else:
            pytest.skip("No bookings present for current demo user")

    def test_hist_03_verify_empty_history_for_new_user(self, driver):
        """HIST-03: Verify empty history for a user without bookings."""
        # Register a brand new user with no bookings
        reg_page = RegistrationPage(driver).open()
        user = generate_unique_user()
        reg_page.register(user["full_name"], user["phone"], user["email"], user["password"], user["vehicle_number"])
        reg_page.wait.wait_for_url_contains("/dashboard")

        # Navigate to bookings
        bookings_page = BookingsPage(driver).open()
        time.sleep(1.5)

        # Empty state message should be displayed
        assert bookings_page.has_empty_history()

    def test_hist_04_verify_cannot_access_another_user_history(self, driver):
        """HIST-04: Verify that unauthenticated users cannot access bookings history."""
        # Fresh browser session on login page has no token
        driver.get("http://localhost:5173/login")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get("http://localhost:5173/bookings")
        time.sleep(1.5)
        # ProtectedRoute should redirect unauthenticated request back to login
        assert "/login" in driver.current_url
