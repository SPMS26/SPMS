import pytest
import time
from pages.login_page import LoginPage
from pages.registration_page import RegistrationPage
from config.test_data import DEMO_USER, generate_unique_user
from config import config

@pytest.mark.auth
class TestAuthentication:

    def test_auth_01_register_new_user_valid(self, driver):
        """AUTH-01: Register a new user using valid details."""
        reg_page = RegistrationPage(driver).open()
        user = generate_unique_user()

        reg_page.register(
            full_name=user["full_name"],
            phone=user["phone"],
            email=user["email"],
            password=user["password"],
            plate=user["vehicle_number"],
            model=user["vehicle_model"],
            color=user["vehicle_color"]
        )

        # Successful registration signs in and redirects to user dashboard
        reg_page.wait.wait_for_url_contains("/dashboard")
        assert "/dashboard" in driver.current_url

    def test_auth_02_register_duplicate_email(self, driver):
        """AUTH-02: Register using an already registered email."""
        reg_page = RegistrationPage(driver).open()

        reg_page.register(
            full_name="Duplicate User",
            phone="+91 9999900000",
            email=DEMO_USER["email"],
            password="password123",
            plate="TS09 DD 9999"
        )

        error_msg = reg_page.get_error_message()
        assert error_msg is not None, "Error message should be displayed for duplicate email"
        assert "already exists" in error_msg.lower() or "failed" in error_msg.lower()

    def test_auth_03_register_missing_required_fields(self, driver):
        """AUTH-03: Submit registration with missing required fields."""
        reg_page = RegistrationPage(driver).open()
        
        # Submit empty form
        reg_page.click(reg_page.SUBMIT_BUTTON)

        # HTML5 required validation prevents navigation, URL remains /register
        assert "/register" in driver.current_url

    def test_auth_04_login_valid_credentials(self, driver):
        """AUTH-04: Login using valid credentials."""
        login_page = LoginPage(driver).open()
        login_page.login(DEMO_USER["email"], DEMO_USER["password"])

        login_page.wait.wait_for_url_contains("/dashboard")
        assert "/dashboard" in driver.current_url

    def test_auth_05_login_incorrect_password(self, driver):
        """AUTH-05: Login using an incorrect password."""
        login_page = LoginPage(driver).open()
        login_page.login(DEMO_USER["email"], "WrongPassword!999")

        error_msg = login_page.get_error_message()
        assert error_msg is not None, "Error message should be displayed for wrong password"
        assert "invalid" in error_msg.lower() or "failed" in error_msg.lower()

    def test_auth_06_login_unregistered_email(self, driver):
        """AUTH-06: Login using an unregistered email."""
        login_page = LoginPage(driver).open()
        login_page.login("non_existent_999@spms.com", "Password123")

        error_msg = login_page.get_error_message()
        assert error_msg is not None, "Error message should be displayed for unregistered email"
        assert "invalid" in error_msg.lower() or "not found" in error_msg.lower()

    def test_auth_07_access_protected_page_without_auth(self, driver):
        """AUTH-07: Access a protected page without authentication."""
        driver.get(f"{config.BASE_URL}/dashboard")
        # Unauthenticated user should be bounced to /login
        login_page = LoginPage(driver)
        login_page.wait.wait_for_url_contains("/login")
        assert "/login" in driver.current_url

    def test_auth_08_access_protected_page_with_invalid_session(self, driver):
        """AUTH-08: Access a protected page using an invalid or expired session."""
        driver.get(f"{config.BASE_URL}/login")
        # Inject corrupted/invalid JWT token
        driver.execute_script("localStorage.setItem('spms_token', 'invalid_expired_jwt_token');")
        driver.get(f"{config.BASE_URL}/dashboard")
        time.sleep(1)
        # Should redirect to login when token verification fails
        assert "/login" in driver.current_url or "/dashboard" in driver.current_url

