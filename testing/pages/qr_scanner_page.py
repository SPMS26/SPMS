import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class QRScannerPage(BasePage):
    AUTO_MODE_BTN = (By.XPATH, "//button[contains(., 'Auto-Detect')]")
    ENTRY_MODE_BTN = (By.XPATH, "//button[contains(., 'Entry Gate')]")
    EXIT_MODE_BTN = (By.XPATH, "//button[contains(., 'Exit Gate')]")
    
    MANUAL_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Manual / Barcode Gun Pass Code']")
    VERIFY_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    
    BARRIER_STATUS_TEXT = (By.XPATH, "//*[contains(text(), 'BARRIER')]")
    SCAN_RESULT_BOX = (By.CSS_SELECTOR, ".card")
    CONFIRM_EXIT_PAYMENT_BTN = (By.XPATH, "//button[contains(., 'Confirm Exit Payment') or contains(., 'Payment Received')]")
    
    PARKING_CHARGE_VAL = (By.XPATH, "//*[contains(., 'Parking Charge') or contains(., 'Total')]/following-sibling::*")
    DURATION_VAL = (By.XPATH, "//*[contains(., 'Duration')]/following-sibling::*")

    def open(self):
        self.navigate_to("/admin/scanner")
        return self

    def set_mode(self, mode="auto"):
        if mode == "entry":
            self.click(self.ENTRY_MODE_BTN)
        elif mode == "exit":
            self.click(self.EXIT_MODE_BTN)
        else:
            self.click(self.AUTO_MODE_BTN)
        time.sleep(0.3)

    def submit_manual_code(self, code):
        self.type_text(self.MANUAL_INPUT, code)
        self.click(self.VERIFY_BUTTON)
        time.sleep(1)

    def get_barrier_status(self):
        if self.is_visible(self.BARRIER_STATUS_TEXT, timeout=5):
            return self.get_text(self.BARRIER_STATUS_TEXT)
        return ""

    def confirm_exit_payment(self):
        if self.is_visible(self.CONFIRM_EXIT_PAYMENT_BTN, timeout=3):
            self.click(self.CONFIRM_EXIT_PAYMENT_BTN)
            self.handle_confirm(accept=True)

