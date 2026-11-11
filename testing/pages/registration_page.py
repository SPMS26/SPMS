from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class RegistrationPage(BasePage):
    NAME_INPUT = (By.ID, "reg-name")
    PHONE_INPUT = (By.ID, "reg-phone")
    EMAIL_INPUT = (By.ID, "reg-email")
    PASSWORD_INPUT = (By.ID, "reg-password")
    PLATE_INPUT = (By.ID, "reg-plate")
    MODEL_INPUT = (By.NAME, "vehicle_model")
    COLOR_INPUT = (By.NAME, "vehicle_color")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    AUTH_ERROR = (By.CSS_SELECTOR, ".auth-error")
    SIGN_IN_LINK = (By.LINK_TEXT, "Sign in")

    def open(self):
        self.navigate_to("/register")
        return self

    def register(self, full_name, phone, email, password, plate, model="", color=""):
        if full_name:
            self.type_text(self.NAME_INPUT, full_name)
        if phone:
            self.type_text(self.PHONE_INPUT, phone)
        if email:
            self.type_text(self.EMAIL_INPUT, email)
        if password:
            self.type_text(self.PASSWORD_INPUT, password)
        if plate:
            self.type_text(self.PLATE_INPUT, plate)
        if model:
            self.type_text(self.MODEL_INPUT, model)
        if color:
            self.type_text(self.COLOR_INPUT, color)
        self.click(self.SUBMIT_BUTTON)

    def get_error_message(self):
        if self.is_visible(self.AUTH_ERROR, timeout=3):
            return self.get_text(self.AUTH_ERROR)
        return None

