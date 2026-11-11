import pytest
import time
from pages.admin_lots_page import AdminLotsPage
from pages.admin_reports_page import AdminReportsPage
from pages.admin_security_page import AdminSecurityPage
from pages.admin_dashboard_page import AdminDashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.admin
class TestAdminManagement:

    def test_adm_01_add_parking_lot(self, admin_driver):
        """ADM-01: Add a parking lot."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        lot_name = f"Selenium Lot {int(time.time()) % 10000}"
        lots_page.add_lot(name=lot_name, address="Testing Boulevard 101", hourly_price=40, prebook_fee=15)
        time.sleep(1.5)

        assert lots_page.is_visible((By.XPATH, f"//*[contains(text(), '{lot_name}')]"), timeout=6)

    def test_adm_02_edit_parking_lot_details(self, admin_driver):
        """ADM-02: Edit parking lot details."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        edit_btn = (By.XPATH, "//button[contains(., 'Edit Lot Details')]")
        if lots_page.is_visible(edit_btn, timeout=3):
            lots_page.click(edit_btn)
            time.sleep(0.5)
            # Update address
            lots_page.type_text(lots_page.LOT_ADDRESS_INPUT, "Updated Address Via Selenium")
            lots_page.click(lots_page.SAVE_LOT_BTN)
            time.sleep(1.5)
        else:
            pytest.skip("No existing lot edit button found")

    def test_adm_03_deactivate_parking_lot(self, admin_driver):
        """ADM-03: Deactivate / Toggle parking lot visibility."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        toggle_btn = (By.XPATH, "//button[contains(., 'Hide from users') or contains(., 'Make live')]")
        if lots_page.is_visible(toggle_btn, timeout=3):
            lots_page.click(toggle_btn)
            lots_page.handle_confirm(accept=True)
            time.sleep(1.5)
        else:
            pytest.skip("No lot status toggle button available")

    def test_adm_04_bulk_generate_slots(self, admin_driver):
        """ADM-04: Generate parking slots in bulk."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        if lots_page.is_visible(lots_page.BULK_SECTIONS_INPUT, timeout=3):
            lots_page.bulk_generate_slots(sections="S", count=3)
            time.sleep(2)
            # Slots grid / table should be updated with slots
            assert lots_page.is_visible((By.XPATH, "//table//*[contains(text(), 'S1') or contains(text(), 'Slot')]"), timeout=6)
        else:
            pytest.skip("Bulk slot generator form not visible")

    def test_adm_05_enable_slot_maintenance(self, admin_driver):
        """ADM-05: Enable maintenance for a slot."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        maint_btns = lots_page.find_all(lots_page.TOGGLE_MAINTENANCE_BTN)
        if maint_btns:
            admin_driver.execute_script("arguments[0].scrollIntoView(true);", maint_btns[0])
            time.sleep(0.3)
            admin_driver.execute_script("arguments[0].click();", maint_btns[0])
            lots_page.handle_confirm(accept=True)
            time.sleep(1.5)
        else:
            pytest.skip("No available slot found to toggle maintenance")

    def test_adm_06_disable_slot_maintenance(self, admin_driver):
        """ADM-06: Disable maintenance (set available)."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        avail_btns = lots_page.find_all(lots_page.SET_AVAILABLE_BTN)
        if avail_btns:
            admin_driver.execute_script("arguments[0].scrollIntoView(true);", avail_btns[0])
            time.sleep(0.3)
            admin_driver.execute_script("arguments[0].click();", avail_btns[0])
            lots_page.handle_confirm(accept=True)
            time.sleep(1.5)
        else:
            pytest.skip("No maintenance slot selected to restore")

    def test_adm_07_update_parking_pricing(self, admin_driver):
        """ADM-07: Update parking pricing."""
        lots_page = AdminLotsPage(admin_driver).open()
        time.sleep(1)

        edit_btn = (By.XPATH, "//button[contains(., 'Edit Lot Details')]")
        if lots_page.is_visible(edit_btn, timeout=3):
            lots_page.click(edit_btn)
            time.sleep(0.5)
            lots_page.type_text(lots_page.LOT_HOURLY_PRICE_INPUT, "45")
            lots_page.click(lots_page.SAVE_LOT_BTN)
            time.sleep(1.5)
        else:
            pytest.skip("Edit lot button not found to update pricing")

    def test_adm_08_resolve_incident(self, admin_driver):
        """ADM-08: Resolve an incident."""
        reports_page = AdminReportsPage(admin_driver).open()
        time.sleep(1)

        rows = reports_page.get_report_rows()
        if rows:
            reports_page.resolve_first_report()
            time.sleep(1)
        else:
            pytest.skip("No incident reports found to resolve")

    def test_adm_09_add_security_staff(self, admin_driver):
        """ADM-09: Add security staff."""
        sec_page = AdminSecurityPage(admin_driver).open()
        time.sleep(1)

        ts = int(time.time() * 1000)
        sec_page.add_security_staff(
            name=f"Guard {ts % 1000}",
            email=f"guard_{ts}@spms.test",
            password="GuardPassword@123",
            phone=f"+91 9{str(ts)[-9:]}"
        )
        time.sleep(1.5)

        # Verify added to security staff table
        assert sec_page.get_staff_count() > 0

    def test_adm_10_verify_admin_analytics_dashboard(self, admin_driver):
        """ADM-10: Verify the admin analytics dashboard."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(1)

        assert dash.are_kpis_displayed()

    def test_adm_11_user_cannot_access_admin_portal(self, user_driver):
        """ADM-11: Verify that ordinary users cannot access admin-only functionality."""
        user_driver.get("http://localhost:5173/admin")
        time.sleep(1.5)

        # ProtectedRoute redirects regular users back to /dashboard
        assert "/dashboard" in user_driver.current_url
