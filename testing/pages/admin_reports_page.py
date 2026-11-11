import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class AdminReportsPage(BasePage):
    REPORT_ROWS = (By.CSS_SELECTOR, "table.data-table tbody tr")
    SOLVE_BTN = (By.XPATH, "//button[contains(., 'Mark Solved') or contains(., 'Solve') or contains(., 'Resolve')]")

    def open(self):
        self.navigate_to("/admin/reports")
        return self

    def get_report_rows(self):
        if self.is_visible(self.REPORT_ROWS, timeout=4):
            return self.find_all(self.REPORT_ROWS)
        return []

    def resolve_first_report(self):
        if self.is_visible(self.SOLVE_BTN, timeout=3):
            self.click(self.SOLVE_BTN)
            self.handle_confirm(accept=True)
            time.sleep(1)

