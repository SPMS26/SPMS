import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class AdminSecurityPage(BasePage):
    NAME_INPUT = (By.NAME, "full_name")
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    PHONE_INPUT = (By.NAME, "phone")
    SUBMIT_BTN = (By.XPATH, "//button[contains(., 'Create Security') or contains(., 'Add Security')]")
    STAFF_ROWS = (By.CSS_SELECTOR, "table.data-table tbody tr")

    def open(self):
        self.navigate_to("/admin/security")
        return self

    def add_security_staff(self, name, email, password, phone):
        self.type_text(self.NAME_INPUT, name)
        self.type_text(self.EMAIL_INPUT, email)
        self.type_text(self.PASSWORD_INPUT, password)
        self.type_text(self.PHONE_INPUT, phone)
        self.click(self.SUBMIT_BTN)
        time.sleep(1)

    def get_staff_count(self):
        if self.is_visible(self.STAFF_ROWS, timeout=4):
            return len(self.find_all(self.STAFF_ROWS))
        return 0

