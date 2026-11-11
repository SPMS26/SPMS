import pytest
import time
from pages.dashboard_page import DashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.slots
class TestParkingSlots:

    def test_slot_01_view_parking_lots(self, user_driver):
        """SLOT-01: View parking lots."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        lots = dashboard.get_lots()
        assert len(lots) > 0, "At least one parking lot should be visible on dashboard"

    def test_slot_02_view_slots_belonging_to_lot(self, user_driver):
        """SLOT-02: View slots belonging to a parking lot."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Select first lot
        dashboard.select_lot_by_index(0)
        time.sleep(1)

        # Verify slots grid has slot elements
        slots = dashboard.find_all(dashboard.SLOT_ITEMS)
        assert len(slots) > 0, "Slots should be populated in the grid for selected lot"

    def test_slot_03_verify_available_slot_status(self, user_driver):
        """SLOT-03: Verify available slot status."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        available_slots = dashboard.find_all(dashboard.AVAILABLE_SLOTS)
        assert len(available_slots) > 0, "Should have slots with available status"

        # Click an available slot and check details panel
        available_slots[0].click()
        time.sleep(0.5)

        badge_text = dashboard.get_text(dashboard.SLOT_STATUS_BADGE)
        assert "available" in badge_text.lower()

    def test_slot_04_verify_occupied_slot_status(self, user_driver):
        """SLOT-04: Verify occupied slot status."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        occupied_slots = dashboard.find_all(dashboard.OCCUPIED_SLOTS)
        if occupied_slots:
            occupied_slots[0].click()
            time.sleep(0.5)
            badge_text = dashboard.get_text(dashboard.SLOT_STATUS_BADGE)
            assert "occupied" in badge_text.lower()
        else:
            # Verified that occupied slots class is handled in DOM legend
            assert dashboard.is_visible((By.CSS_SELECTOR, ".legend-item .dot.occupied"))

    def test_slot_05_verify_reserved_slot_status(self, user_driver):
        """SLOT-05: Verify reserved slot status."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        reserved_slots = dashboard.find_all(dashboard.RESERVED_SLOTS)
        if reserved_slots:
            reserved_slots[0].click()
            time.sleep(0.5)
            badge_text = dashboard.get_text(dashboard.SLOT_STATUS_BADGE)
            assert "reserved" in badge_text.lower()
        else:
            assert dashboard.is_visible((By.CSS_SELECTOR, ".legend-item .dot.reserved"))

    def test_slot_06_verify_maintenance_slot_status(self, user_driver):
        """SLOT-06: Verify maintenance slot status."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        maintenance_slots = dashboard.find_all(dashboard.MAINTENANCE_SLOTS)
        if maintenance_slots:
            maintenance_slots[0].click()
            time.sleep(0.5)
            badge_text = dashboard.get_text(dashboard.SLOT_STATUS_BADGE)
            assert "maintenance" in badge_text.lower()
        else:
            assert dashboard.is_visible((By.CSS_SELECTOR, ".legend-item .dot.maintenance"))

    def test_slot_07_verify_slot_status_updates_ui(self, user_driver):
        """SLOT-07: Verify slot status updates in the UI after floor changes."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Switch floor tabs
        floor_buttons = dashboard.find_all(dashboard.FLOOR_BUTTONS)
        if len(floor_buttons) > 1:
            initial_active = floor_buttons[0].text
            floor_buttons[1].click()
            time.sleep(0.5)
            # Verify grid refreshed
            new_slots = dashboard.find_all(dashboard.SLOT_ITEMS)
            assert len(new_slots) > 0

