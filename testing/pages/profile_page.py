import time
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class ProfilePage(BasePage):
    # Profile View Elements
    USER_NAME_DISPLAY = (By.XPATH, "//div[contains(@class, 'card')]//h3")
    USER_EMAIL_DISPLAY = (By.XPATH, "//i[contains(@class, 'fa-envelope')]/following-sibling::span")
    USER_PHONE_DISPLAY = (By.XPATH, "//i[contains(@class, 'fa-phone')]/following-sibling::span")
    
    # Edit Profile Toggles & Inputs
    EDIT_PROFILE_TRIGGER = (By.XPATH, "//div[@title='Click to edit phone' or @title='Click to edit email']")
    PHONE_INPUT = (By.XPATH, "//input[@placeholder='Enter phone number']")
    EMAIL_INPUT = (By.XPATH, "//input[@placeholder='Enter email']")
    SAVE_PROFILE_BTN = (By.XPATH, "//button[text()='Save' and contains(@class, 'change-btn')]")
    
    # Change Password Elements
    CHANGE_PASSWORD_TOGGLE = (By.XPATH, "//div[contains(@title, 'password')]")
    NEW_PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Enter new password')]")
    CONFIRM_PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Re-enter new password')]")
    SAVE_PASSWORD_BTN = (By.XPATH, "//button[contains(., 'Save Password')]")
    
    # Registered Vehicles
    ADD_VEHICLE_BTN = (By.XPATH, "//button[contains(., 'Add Vehicle')]")
    VEH_NUMBER_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Vehicle Reg No')]")
    VEH_MODEL_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Model')]")
    VEH_COLOR_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Color')]")
    SAVE_VEHICLE_BTN = (By.XPATH, "//form//button[contains(., 'Add Vehicle') or contains(., 'Save') or @type='submit']")
    DEFAULT_VEHICLE_BADGE = (By.XPATH, "//span[contains(text(), 'Default')]")

    def open(self):
        self.navigate_to("/profile")
        return self

    def get_phone_value(self):
        el = self.find(self.USER_PHONE_DISPLAY)
        return el.text.strip()

    def get_email_value(self):
        el = self.find(self.USER_EMAIL_DISPLAY)
        return el.text.strip()

    def update_phone(self, new_phone):
        if self.is_visible(self.EDIT_PROFILE_TRIGGER, timeout=3):
            self.click(self.EDIT_PROFILE_TRIGGER)
            time.sleep(0.5)
        self.type_text(self.PHONE_INPUT, new_phone)
        self.click(self.SAVE_PROFILE_BTN)

    def change_password(self, new_pw, confirm_pw):
        if not self.is_visible(self.NEW_PASSWORD_INPUT, timeout=1):
            if self.is_visible(self.CHANGE_PASSWORD_TOGGLE, timeout=3):
                self.click(self.CHANGE_PASSWORD_TOGGLE)
                time.sleep(0.5)
        self.type_text(self.NEW_PASSWORD_INPUT, new_pw)
        self.type_text(self.CONFIRM_PASSWORD_INPUT, confirm_pw)
        self.click(self.SAVE_PASSWORD_BTN)

    def add_vehicle(self, plate, model="", color=""):
        if self.is_visible(self.ADD_VEHICLE_BTN, timeout=3):
            self.click(self.ADD_VEHICLE_BTN)
            time.sleep(0.5)
        self.type_text(self.VEH_NUMBER_INPUT, plate)
        if model:
            self.type_text(self.VEH_MODEL_INPUT, model)
        if color:
            self.type_text(self.VEH_COLOR_INPUT, color)
        self.click(self.SAVE_VEHICLE_BTN)
