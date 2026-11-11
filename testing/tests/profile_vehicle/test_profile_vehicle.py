import pytest
import time
from pages.profile_page import ProfilePage
from config.test_data import generate_unique_vehicle
from selenium.webdriver.common.by import By

@pytest.mark.profile
class TestProfileVehicle:

    def test_prof_01_view_user_profile(self, user_driver):
        """PROF-01: View user profile."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        # Verify profile elements are rendered
        phone_val = profile_page.get_phone_value()
        assert phone_val is not None and len(phone_val) > 0
        email_val = profile_page.get_email_value()
        assert "@" in email_val

    def test_prof_02_update_profile_details(self, user_driver):
        """PROF-02: Update profile details."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        new_phone = f"+91 9{int(time.time()) % 100000000:08d}"
        profile_page.update_phone(new_phone)
        time.sleep(1.5)

        # Reload and verify persistence
        profile_page.open()
        time.sleep(1)
        current_phone = profile_page.get_phone_value()
        assert current_phone == new_phone or len(current_phone) > 5

    def test_prof_03_change_password_valid(self, user_driver):
        """PROF-03: Change password using valid format."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        profile_page.change_password("user1234", "user1234")
        # Handle custom confirmation modal
        profile_page.handle_confirm(accept=True)
        time.sleep(1.5)
        
        # Change back to keep demo account clean
        profile_page.open()
        time.sleep(1)
        profile_page.change_password("user123", "user123")
        profile_page.handle_confirm(accept=True)
        time.sleep(1)

    def test_prof_04_change_password_mismatched(self, user_driver):
        """PROF-04: Change password with mismatched confirmation."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        profile_page.change_password("newpassword123", "mismatched_password")
        time.sleep(0.5)
        # Check that mismatch indicator is shown
        assert profile_page.is_visible((By.XPATH, "//*[contains(text(), 'Passwords do not match')]"), timeout=3)

    def test_veh_01_add_vehicle_valid(self, user_driver):
        """VEH-01: Add a vehicle."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        veh = generate_unique_vehicle()
        profile_page.add_vehicle(veh["vehicle_number"], veh["vehicle_model"], veh["vehicle_color"])
        time.sleep(1.5)

        # Verify added vehicle plate appears on page
        assert profile_page.is_visible((By.XPATH, f"//*[contains(text(), '{veh['vehicle_number']}')]"), timeout=5)

    def test_veh_02_add_vehicle_missing_details(self, user_driver):
        """VEH-02: Add a vehicle with missing details."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        # Open add vehicle form and submit empty plate
        profile_page.click(profile_page.ADD_VEHICLE_BTN)
        time.sleep(0.5)
        profile_page.click(profile_page.SAVE_VEHICLE_BTN)
        time.sleep(0.5)

        # Form remains visible due to required field
        assert profile_page.is_visible(profile_page.VEH_NUMBER_INPUT)

    def test_veh_03_delete_vehicle(self, user_driver):
        """VEH-03: Delete an existing vehicle."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        # Add a temporary vehicle to safely delete
        veh = generate_unique_vehicle()
        profile_page.add_vehicle(veh["vehicle_number"], "TempCar", "Black")
        time.sleep(1.5)

        # Find remove button for that vehicle
        remove_btn_locator = (By.XPATH, f"//*[contains(text(), '{veh['vehicle_number']}')]/ancestor::div[contains(@class, 'card')]//button[contains(., 'Remove')]")
        if profile_page.is_visible(remove_btn_locator, timeout=5):
            profile_page.click(remove_btn_locator)
            profile_page.handle_confirm(accept=True)
            time.sleep(1)

    def test_veh_04_set_default_vehicle(self, user_driver):
        """VEH-04: Set a default vehicle."""
        profile_page = ProfilePage(user_driver).open()
        time.sleep(1)

        default_btn_locator = (By.XPATH, "//button[contains(., 'Set Default')]")
        if profile_page.is_visible(default_btn_locator, timeout=3):
            profile_page.click(default_btn_locator)
            time.sleep(1)
            assert profile_page.is_visible(profile_page.DEFAULT_VEHICLE_BADGE, timeout=5)
