from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from config import config

class WaitUtils:
    def __init__(self, driver, timeout=None):
        self.driver = driver
        self.timeout = timeout or config.DEFAULT_TIMEOUT
        self.wait = WebDriverWait(driver, self.timeout, poll_frequency=config.POLL_FREQUENCY)

    def wait_for_visible(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def wait_for_presence(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def wait_for_clickable(self, locator):
        return self.wait.until(EC.element_to_be_clickable(locator))

    def wait_for_invisible(self, locator):
        return self.wait.until(EC.invisibility_of_element_located(locator))

    def wait_for_text(self, locator, text):
        return self.wait.until(EC.text_to_be_present_in_element(locator, text))

    def wait_for_url_contains(self, fragment):
        return self.wait.until(EC.url_contains(fragment))

    def is_visible(self, locator, timeout=2):
        try:
            WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False

