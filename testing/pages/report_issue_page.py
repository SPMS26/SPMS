from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class ReportIssuePage(BasePage):
    LOT_SELECT = (By.XPATH, "(//select)[1]")
    CATEGORY_SELECT = (By.XPATH, "(//select)[2]")
    DESCRIPTION_TEXTAREA = (By.CSS_SELECTOR, "textarea")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    REPORT_CARDS = (By.CSS_SELECTOR, ".card")
    IMAGE_INPUT = (By.CSS_SELECTOR, "input[type='file']")

    def open(self):
        self.navigate_to("/report-issue")
        return self

    def submit_report(self, description, category=None, image_path=None):
        if category:
            el = self.find(self.CATEGORY_SELECT)
            el.send_keys(category)
        if description:
            self.type_text(self.DESCRIPTION_TEXTAREA, description)
        if image_path:
            file_input = self.find(self.IMAGE_INPUT)
            file_input.send_keys(image_path)
        self.click(self.SUBMIT_BUTTON)
