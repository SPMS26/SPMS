from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from utils.wait_utils import WaitUtils
from utils.helpers import Helpers
from config import config

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WaitUtils(driver)

    def navigate_to(self, path=""):
        url = f"{config.BASE_URL}{path}"
        self.driver.get(url)

    def find(self, locator):
        return self.wait.wait_for_visible(locator)

    def find_all(self, locator):
        return self.driver.find_elements(*locator)

    def click(self, locator):
        el = self.find(locator)
        self.driver.execute_script("arguments[0].scrollIntoView(true);", el)
        try:
            el.click()
        except Exception:
            self.driver.execute_script("arguments[0].click();", el)

    def type_text(self, locator, text, clear=True):
        el = self.wait.wait_for_visible(locator)
        if clear:
            el.send_keys(Keys.CONTROL + "a")
            el.send_keys(Keys.BACKSPACE)
            el.clear()
        el.send_keys(text)

    def get_text(self, locator):
        return self.find(locator).text

    def is_visible(self, locator, timeout=2):
        return self.wait.is_visible(locator, timeout=timeout)

    def get_toast_message(self, timeout=5):
        """React Hot Toast message locator"""
        try:
            toast = self.wait.wait_for_visible((By.CSS_SELECTOR, "div[role='status'], .react-hot-toast, div[style*='background: rgb(17, 17, 20)']"))
            return toast.text
        except Exception:
            return None

    def handle_confirm(self, accept=True):
        return Helpers.handle_confirm_dialog(self.driver, accept=accept)

    def get_current_url(self):
        return self.driver.current_url
