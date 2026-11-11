from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class AdminDashboardPage(BasePage):
    KPI_CARDS = (By.CSS_SELECTOR, ".kpi-card, .card")
    REVENUE_CARD = (By.XPATH, "//*[contains(., 'Revenue Generated')]/..")
    BOOKINGS_CARD = (By.XPATH, "//*[contains(., 'Total Bookings')]/..")
    ACTIVE_VEHICLES_CARD = (By.XPATH, "//*[contains(., 'Active Vehicles')]/..")
    SLOTS_CARD = (By.XPATH, "//*[contains(., 'Total Slots')]/..")
    
    CHART_CONTAINER = (By.CSS_SELECTOR, ".recharts-responsive-container")
    HEATMAP_CONTAINER = (By.CSS_SELECTOR, ".heatmap-grid, table")

    def open(self):
        self.navigate_to("/admin")
        return self

    def are_kpis_displayed(self):
        return self.is_visible(self.KPI_CARDS, timeout=5)

    def is_chart_displayed(self):
        return self.is_visible(self.CHART_CONTAINER, timeout=5)

