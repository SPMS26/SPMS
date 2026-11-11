import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class AdminLotsPage(BasePage):
    ADD_LOT_BTN = (By.XPATH, "//button[contains(., 'New Parking Lot') or contains(., 'Add Lot')]")
    LOT_NAME_INPUT = (By.XPATH, "//label[contains(text(), 'Lot Name')]/following-sibling::input")
    LOT_ADDRESS_INPUT = (By.XPATH, "//label[contains(text(), 'Address')]/following-sibling::input")
    LOT_HOURLY_PRICE_INPUT = (By.XPATH, "//label[contains(text(), 'Default Price')]/following-sibling::input")
    LOT_PREBOOK_FEE_INPUT = (By.XPATH, "//label[contains(text(), 'Pre-booking Fee')]/following-sibling::input")
    SAVE_LOT_BTN = (By.XPATH, "//button[contains(text(), 'Create Lot') or contains(text(), 'Save Changes')]")
    
    # Bulk slot generator
    BULK_SECTIONS_INPUT = (By.XPATH, "//label[contains(text(), 'Sections')]/following-sibling::input")
    BULK_COUNT_INPUT = (By.XPATH, "//label[contains(text(), 'Slots per section')]/following-sibling::input")
    GENERATE_SLOTS_BTN = (By.XPATH, "//button[contains(., 'Generate Slots')]")
    
    # Slots management table
    SLOT_ROWS = (By.CSS_SELECTOR, "table.data-table tbody tr")
    TOGGLE_MAINTENANCE_BTN = (By.XPATH, "//table//button[contains(text(), 'Maintenance')]")
    SET_AVAILABLE_BTN = (By.XPATH, "//table//button[contains(text(), 'Set Available')]")

    def open(self):
        self.navigate_to("/admin/lots")
        return self

    def add_lot(self, name, address, hourly_price=30, prebook_fee=10):
        self.click(self.ADD_LOT_BTN)
        time.sleep(0.5)
        self.type_text(self.LOT_NAME_INPUT, name)
        self.type_text(self.LOT_ADDRESS_INPUT, address)
        self.type_text(self.LOT_HOURLY_PRICE_INPUT, str(hourly_price))
        self.type_text(self.LOT_PREBOOK_FEE_INPUT, str(prebook_fee))
        self.click(self.SAVE_LOT_BTN)
        time.sleep(1.5)

    def bulk_generate_slots(self, sections="S", count=3):
        self.type_text(self.BULK_SECTIONS_INPUT, sections)
        self.type_text(self.BULK_COUNT_INPUT, str(count))
        self.click(self.GENERATE_SLOTS_BTN)
        self.handle_confirm(accept=True)
        time.sleep(2)
