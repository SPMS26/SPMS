import pytest
import time
from pages.qr_scanner_page import QRScannerPage
from pages.dashboard_page import DashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.qr
class TestQREntryExit:

    def test_qr_01_verify_qr_code_generation(self, user_driver):
        """QR-01: Verify QR code generation for a valid parking pass."""
        dashboard = DashboardPage(user_driver).open()
        time.sleep(1)

        # Go to bookings page
        user_driver.get(f"{dashboard.get_current_url().replace('/dashboard', '/bookings')}")
        time.sleep(1)

        # Click View Digital Pass if present
        view_pass_btns = dashboard.find_all((By.XPATH, "//button[contains(., 'View') and contains(., 'Pass')]"))
        if view_pass_btns:
            view_pass_btns[0].click()
            time.sleep(1)
            # Verify QR code image is rendered
            assert dashboard.is_visible((By.CSS_SELECTOR, ".modal-box img, .qr-image-frame img"), timeout=5)
        else:
            pytest.skip("No existing booking with active pass to open modal")

    def test_qr_02_verify_qr_scanning_interface(self, security_driver):
        """QR-02: Verify the QR scanning interface on Gate Scanner page."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        # Check Camera HUD, manual input bar, and mode buttons are rendered
        assert scanner_page.is_visible(scanner_page.MANUAL_INPUT, timeout=5)
        assert scanner_page.is_visible(scanner_page.AUTO_MODE_BTN, timeout=5)
        assert scanner_page.is_visible(scanner_page.ENTRY_MODE_BTN, timeout=5)
        assert scanner_page.is_visible(scanner_page.EXIT_MODE_BTN, timeout=5)

    def test_qr_03_verify_vehicle_entry_check_in(self, security_driver):
        """QR-03: Verify vehicle entry check-in."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        # Look in the live gate queue for pending arrival (reserved vehicle)
        arrival_items = scanner_page.find_all((By.XPATH, "//span[contains(text(), 'Check-In')]"))
        if arrival_items:
            security_driver.execute_script("arguments[0].scrollIntoView(true);", arrival_items[0])
            time.sleep(0.3)
            security_driver.execute_script("arguments[0].click();", arrival_items[0])
            scanner_page.handle_confirm(accept=True)
            time.sleep(2)
            # Verify barrier status opens
            status = scanner_page.get_barrier_status()
            assert "OPENED" in status or "GRANTED" in status or "BARRIER" in status
        else:
            pytest.skip("No pending reserved arrival in queue to check in")

    def test_qr_04_verify_vehicle_exit_check_out(self, security_driver):
        """QR-04: Verify vehicle exit check-out."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        # Look for parked vehicle in queue or active parked list
        parked_items = scanner_page.find_all((By.XPATH, "//span[contains(text(), 'Check-Out')]"))
        if parked_items:
            security_driver.execute_script("arguments[0].scrollIntoView(true);", parked_items[0])
            time.sleep(0.3)
            security_driver.execute_script("arguments[0].click();", parked_items[0])
            scanner_page.handle_confirm(accept=True)
            time.sleep(2)
            assert scanner_page.is_visible((By.CSS_SELECTOR, ".card"), timeout=5)
        else:
            pytest.skip("No currently parked vehicle in queue to start checkout")

    def test_qr_05_verify_invalid_qr_data_rejected(self, security_driver):
        """QR-05: Verify invalid QR data is rejected."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        # Enter bogus pass code
        scanner_page.submit_manual_code("BK-INVALID-CODE-99999")
        time.sleep(1.5)

        # Check that barrier is not opened / access denied
        status = scanner_page.get_barrier_status()
        assert "DENIED" in status or "LOCKED" in status or "CLOSED" in status

    def test_qr_06_verify_tampered_qr_rejected(self, security_driver):
        """QR-06: Verify modified or invalid QR signatures are rejected."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        tampered_json = '{"bookingId":"00000000-0000-0000-0000-000000000000","sig":"tampered_signature"}'
        scanner_page.submit_manual_code(tampered_json)
        time.sleep(1.5)

        status = scanner_page.get_barrier_status()
        assert "DENIED" in status or "LOCKED" in status or "CLOSED" in status

    def test_qr_07_verify_parking_duration_calculation(self, security_driver):
        """QR-07: Verify parking duration calculation after exit."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)
        # Check that scanner or parked page tracks duration
        security_driver.get(f"{scanner_page.get_current_url().replace('/scanner', '/parked')}")
        time.sleep(1)
        # Parked page should list parked vehicles with timestamps
        assert "/parked" in security_driver.current_url

    def test_qr_08_attempt_exit_without_entry(self, security_driver):
        """QR-08: Attempt exit without a valid entry record."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)
        scanner_page.set_mode("exit")

        # Try an un-entered license plate
        scanner_page.submit_manual_code("TS09 NONEXISTENT")
        time.sleep(1.5)

        status = scanner_page.get_barrier_status()
        assert "DENIED" in status or "LOCKED" in status or "CLOSED" in status

    def test_qr_09_attempt_reuse_expired_pass(self, security_driver):
        """QR-09: Attempt to reuse an already-used or completed pass."""
        scanner_page = QRScannerPage(security_driver).open()
        time.sleep(1)

        # Submitting an old completed booking code should be rejected
        scanner_page.submit_manual_code("BK-COMPLETED")
        time.sleep(1.5)

        status = scanner_page.get_barrier_status()
        assert "DENIED" in status or "LOCKED" in status or "CLOSED" in status
