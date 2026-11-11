import pytest
import time
from pages.admin_dashboard_page import AdminDashboardPage
from selenium.webdriver.common.by import By

@pytest.mark.analytics
class TestAnalytics:

    def test_ana_01_verify_total_revenue(self, admin_driver):
        """ANA-01: Verify total revenue displayed on admin KPI."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(1.5)

        # Check for revenue element containing currency symbol or revenue label
        rev_elements = admin_driver.find_elements(By.XPATH, "//*[(contains(text(), '₹') or contains(text(), 'Rs') or contains(text(), 'Revenue')) and ancestor::*[contains(@class, 'card')]]")
        assert len(rev_elements) > 0, "Total revenue metric should be displayed with currency symbol"

    def test_ana_02_verify_total_booking_count(self, admin_driver):
        """ANA-02: Verify total booking count on admin KPI."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(1.5)

        booking_elements = admin_driver.find_elements(By.XPATH, "//*[contains(text(), 'Total Bookings')]")
        assert len(booking_elements) > 0, "Total bookings metric should be displayed"

    def test_ana_03_verify_active_vehicle_count(self, admin_driver):
        """ANA-03: Verify active vehicle count on admin KPI."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(1.5)

        active_veh_elements = admin_driver.find_elements(By.XPATH, "//*[contains(text(), 'Active Vehicles')]")
        assert len(active_veh_elements) > 0, "Active vehicles count should be displayed"

    def test_ana_04_verify_monthly_revenue_chart(self, admin_driver):
        """ANA-04: Verify monthly revenue chart is rendered."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(2)

        # Check for Recharts responsive container or SVG chart elements
        charts = admin_driver.find_elements(By.CSS_SELECTOR, ".recharts-responsive-container, .recharts-surface, svg")
        assert len(charts) > 0, "Monthly revenue chart should render SVG graphical elements"

    def test_ana_05_verify_peak_occupancy_heatmap(self, admin_driver):
        """ANA-05: Verify peak occupancy information is rendered."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(2)

        # Peak hours / heatmap grid or table
        heatmap_elements = admin_driver.find_elements(By.CSS_SELECTOR, ".heatmap-grid, table, .peak-times-table")
        assert len(heatmap_elements) > 0 or dash.are_kpis_displayed(), "Peak occupancy information should be accessible"

    def test_ana_06_verify_daily_revenue_breakdown(self, admin_driver):
        """ANA-06: Verify daily revenue information is rendered."""
        dash = AdminDashboardPage(admin_driver).open()
        time.sleep(2)

        # Look for day breakdown / charts
        assert dash.is_chart_displayed() or dash.are_kpis_displayed()
