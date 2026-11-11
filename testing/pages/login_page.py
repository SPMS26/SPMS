from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class LoginPage(BasePage):
    EMAIL_INPUT = (By.ID, "login-email")
    PASSWORD_INPUT = (By.ID, "login-password")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    AUTH_ERROR = (By.CSS_SELECTOR, ".auth-error")
    DEMO_TOGGLE = (By.CSS_SELECTOR, ".auth-demo-toggle")
    DEMO_ITEMS = (By.CSS_SELECTOR, ".auth-demo-item")
    CREATE_ACCOUNT_LINK = (By.LINK_TEXT, "Create an account")

    def open(self):
        self.navigate_to("/login")
        return self

    def login(self, email, password):
        self.type_text(self.EMAIL_INPUT, email)
        self.type_text(self.PASSWORD_INPUT, password)
        self.click(self.SUBMIT_BUTTON)

    def get_error_message(self):
        if self.is_visible(self.AUTH_ERROR, timeout=3):
            return self.get_text(self.AUTH_ERROR)
        return None

    def click_create_account(self):
        self.click(self.CREATE_ACCOUNT_LINK)

