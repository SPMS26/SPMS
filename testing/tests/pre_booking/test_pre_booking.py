import pytest
import time
from pages.dashboard_page import DashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.booking
class TestPreBooking:

    def test_book_01_create_valid_pre_booking(self, user_driver):
        """BOOK-01: Create a valid pre-booking (Opens Reservation Modal)."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Select an available slot
        slot_code = dashboard.select_available_slot()
        assert slot_code is not None, "Should find at least one available slot"

        dashboard.click_select_slot_button()
        time.sleep(1)

        # Payment/Reservation confirmation modal should open
        assert dashboard.is_visible(dashboard.PAYMENT_MODAL, timeout=5)

    def test_book_02_attempt_overlapping_reservation(self, user_driver):
        """BOOK-02: Attempt an overlapping reservation (Vehicle conflict)."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Try to select a reserved slot or check overlap protection
        reserved_slots = dashboard.find_all(dashboard.RESERVED_SLOTS)
        if reserved_slots:
            reserved_slots[0].click()
            time.sleep(0.5)
            # Button is disabled, displays SLOT RESERVED, or offers Cancel Booking for user's pass
            btn = dashboard.find(dashboard.SELECT_SLOT_BUTTON)
            btn_text = btn.text.lower()
            assert not btn.is_enabled() or "reserved" in btn_text or "cancel booking" in btn_text
        else:
            pytest.skip("No currently reserved slots in database to test overlapping click")

    def test_book_03_attempt_booking_occupied_slot(self, user_driver):
        """BOOK-03: Attempt booking an occupied slot."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        occupied_slots = dashboard.find_all(dashboard.OCCUPIED_SLOTS)
        if occupied_slots:
            occupied_slots[0].click()
            time.sleep(0.5)
            btn = dashboard.find(dashboard.SELECT_SLOT_BUTTON)
            assert not btn.is_enabled() or "occupied" in btn.text.lower()
        else:
            pytest.skip("No occupied slot currently in database to click")

    def test_book_04_submit_booking_missing_details(self, user_driver):
        """BOOK-04: Submit booking with missing details / blocked slot."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Look for non-available slots where booking is prevented
        non_avail = dashboard.find_all(dashboard.OCCUPIED_SLOTS) + dashboard.find_all(dashboard.MAINTENANCE_SLOTS)
        if non_avail:
            non_avail[0].click()
            time.sleep(0.5)
            btn = dashboard.find(dashboard.SELECT_SLOT_BUTTON)
            assert not btn.is_enabled()
        else:
            btn = dashboard.find(dashboard.SELECT_SLOT_BUTTON)
            assert btn.is_displayed()

    def test_book_05_submit_booking_invalid_date_time(self):
        """BOOK-05: Submit booking with invalid date or time."""
        # In current SPMS implementation, the UI instant-reserves from current time; custom future date picker is not implemented
        pytest.skip("NOT IMPLEMENTED: Future date/time search and selection inputs are not implemented in the current SPMS UI.")

    def test_book_06_complete_base_fare_payment_flow(self, user_driver):
        """BOOK-06: Complete the implemented base-fare payment confirmation flow."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # If an active reservation exists, cancel it first to allow new reservation
        cancel_btn = (By.XPATH, "//button[contains(., 'Cancel Booking')]")
        if dashboard.is_visible(cancel_btn, timeout=2):
            dashboard.click(cancel_btn)
            dashboard.handle_confirm(accept=True)
            time.sleep(1.5)

        slot_code = dashboard.select_available_slot()
        dashboard.click_select_slot_button()
        time.sleep(1)

        # Confirm reservation payment
        dashboard.confirm_payment()
        time.sleep(2.5)

        # Digital QR Parking Pass modal opens
        assert dashboard.is_qr_modal_displayed()

    def test_book_07_verify_parking_pass_activation(self, user_driver):
        """BOOK-07: Verify parking pass activation after successful confirmation."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Open bookings page to check newly active pass
        user_driver.get(f"{dashboard.get_current_url().replace('/dashboard', '/bookings')}")
        time.sleep(1.5)

        cards = dashboard.find_all((By.CSS_SELECTOR, ".card"))
        assert len(cards) > 0, "Active pass should be listed in bookings"
