from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class BookingsPage(BasePage):
    EMPTY_MESSAGE = (By.XPATH, "//*[contains(., 'No bookings yet') or contains(., 'No bookings') or contains(., 'No Active Bookings')]")
    BOOKING_CARDS = (By.CSS_SELECTOR, ".card")
    PASS_CODE = (By.XPATH, "//*[contains(., 'Pass Code:')]/following-sibling::*")
    VIEW_PASS_BTN = (By.XPATH, "//button[contains(., 'View Digital Pass') or contains(., 'View Pass')]")
    PAY_FEE_BTN = (By.XPATH, "//button[contains(., 'Pay') and contains(., 'Pass')]")

    def open(self):
        self.navigate_to("/bookings")
        return self

    def get_booking_cards(self):
        if self.is_visible(self.BOOKING_CARDS, timeout=4):
            return self.find_all(self.BOOKING_CARDS)
        return []

    def has_empty_history(self):
        return self.is_visible(self.EMPTY_MESSAGE, timeout=3)
