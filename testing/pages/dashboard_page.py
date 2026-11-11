import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class DashboardPage(BasePage):
    PAGE_TITLE = (By.CSS_SELECTOR, ".page-title-box h1")
    LOT_CARDS = (By.CSS_SELECTOR, ".lot-summary-card, .lot-card")
    FLOOR_BUTTONS = (By.CSS_SELECTOR, ".floor-btn")
    SLOT_ITEMS = (By.CSS_SELECTOR, ".slot-item")
    AVAILABLE_SLOTS = (By.CSS_SELECTOR, ".slot-item.status-available")
    RESERVED_SLOTS = (By.CSS_SELECTOR, ".slot-item.status-reserved")
    OCCUPIED_SLOTS = (By.CSS_SELECTOR, ".slot-item.status-occupied")
    MAINTENANCE_SLOTS = (By.CSS_SELECTOR, ".slot-item.status-maintenance")
    SELECT_SLOT_BUTTON = (By.CSS_SELECTOR, ".slot-details-panel .btn-select-slot")
    SLOT_STATUS_BADGE = (By.CSS_SELECTOR, ".slot-details-panel h3 + span")
    SLOT_PRICE_TEXT = (By.CSS_SELECTOR, ".slot-details-panel .details-row .val")
    
    # Payment Modal Locators
    PAYMENT_MODAL = (By.CSS_SELECTOR, ".modal-box")
    PAYMENT_SUBMIT_BTN = (By.CSS_SELECTOR, ".modal-box form button[type='submit']")
    PAYMENT_FEE_TEXT = (By.CSS_SELECTOR, ".modal-box .details-row .val")
    
    # QR Pass Modal Locators
    QR_PASS_MODAL = (By.CSS_SELECTOR, ".modal-box")
    QR_IMAGE = (By.CSS_SELECTOR, ".modal-box img, .qr-image-frame img")
    QR_CLOSE_BTN = (By.CSS_SELECTOR, ".modal-close")
    PASS_CODE = (By.CSS_SELECTOR, ".modal-box span")

    def open(self):
        self.navigate_to("/dashboard")
        return self

    def get_lots(self):
        self.wait.wait_for_presence(self.LOT_CARDS)
        return self.find_all(self.LOT_CARDS)

    def select_lot_by_index(self, index=0):
        lots = self.get_lots()
        if lots and index < len(lots):
            lots[index].click()
            time.sleep(0.5)

    def select_floor_by_name(self, floor_name):
        btns = self.find_all(self.FLOOR_BUTTONS)
        for btn in btns:
            if floor_name.lower() in btn.text.lower():
                btn.click()
                time.sleep(0.5)
                break

    def get_available_slots(self):
        return self.find_all(self.AVAILABLE_SLOTS)

    def select_available_slot(self):
        slots = self.get_available_slots()
        if slots:
            slots[0].click()
            time.sleep(0.3)
            return slots[0].text
        return None

    def click_select_slot_button(self):
        self.click(self.SELECT_SLOT_BUTTON)

    def confirm_payment(self):
        self.click(self.PAYMENT_SUBMIT_BTN)

    def is_qr_modal_displayed(self):
        return self.is_visible(self.QR_IMAGE, timeout=5)

    def close_qr_modal(self):
        if self.is_visible(self.QR_CLOSE_BTN, timeout=2):
            self.click(self.QR_CLOSE_BTN)
