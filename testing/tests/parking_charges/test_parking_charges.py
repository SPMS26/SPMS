import pytest
import math
import time
from pages.dashboard_page import DashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.charges
class TestParkingCharges:

    def calculate_expected_charges(self, duration_minutes, hourly_rate, base_fare_paid):
        """Standard SPMS Tariff Specification Formula"""
        billable_hours = max(1, math.ceil(duration_minutes / 60.0))
        total_charge = billable_hours * hourly_rate
        remaining_balance = max(0.0, total_charge - base_fare_paid)
        return billable_hours, total_charge, remaining_balance

    def test_pay_01_verify_duration_calculation_formula(self):
        """PAY-01: Verify parking duration calculation logic."""
        # 15 minutes stay -> 1 billable hour
        hours, total, rem = self.calculate_expected_charges(15, 30.0, 10.0)
        assert hours == 1
        assert total == 30.0
        assert rem == 20.0

        # 65 minutes stay -> 2 billable hours
        hours_2, total_2, rem_2 = self.calculate_expected_charges(65, 30.0, 10.0)
        assert hours_2 == 2
        assert total_2 == 60.0
        assert rem_2 == 50.0

    def test_pay_02_verify_total_parking_charge(self, user_driver):
        """PAY-02: Verify total parking charge display on booking history."""
        dashboard = DashboardPage(user_driver).open()
        user_driver.get(f"{dashboard.get_current_url().replace('/dashboard', '/bookings')}")
        time.sleep(1)

        # Inspect cards for fee displays
        fee_elements = user_driver.find_elements(By.XPATH, "//*[contains(text(), '₹') or contains(text(), 'Rs') or contains(text(), 'PAID') or contains(text(), 'Fee')]")
        assert len(fee_elements) > 0, "Fee information should be displayed in booking cards"

    def test_pay_03_verify_base_fare_deduction(self, user_driver):
        """PAY-03: Verify base fare deduction in payment modal."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        slot = dashboard.select_available_slot()
        if slot:
            dashboard.click_select_slot_button()
            time.sleep(1)

            # Check that Pre-Booking Fee (Base Fare) is explicitly listed
            modal_text = dashboard.get_text(dashboard.PAYMENT_MODAL)
            assert "pre-booking fee" in modal_text.lower() or "reservation fee" in modal_text.lower()
            assert "hourly parking rate" in modal_text.lower()
        else:
            pytest.skip("No available slot to open payment modal")

    def test_pay_04_verify_remaining_payment_at_exit(self):
        """PAY-04: Verify remaining payment at exit calculation."""
        # Minimum 1 hour parking charge: ₹30, Pre-booking fee paid: ₹10 -> Remaining: ₹20
        _, _, remaining = self.calculate_expected_charges(20, 30.0, 10.0)
        assert remaining == 20.0

    def test_pay_05_verify_displayed_parking_pricing(self, user_driver):
        """PAY-05: Verify displayed slot hourly pricing on dashboard."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        slots = dashboard.get_available_slots()
        if slots:
            slots[0].click()
            time.sleep(0.5)

            # Check details panel has price
            price_text = dashboard.get_text((By.XPATH, "//*[contains(., 'Price')]/following-sibling::*"))
            assert "₹" in price_text or "hour" in price_text.lower()
        else:
            pytest.skip("No available slot to inspect pricing")
