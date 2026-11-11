import os
import time
from pathlib import Path
from config import config
from selenium.webdriver.common.by import By

class Helpers:
    @staticmethod
    def take_screenshot(driver, name):
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = config.SCREENSHOTS_DIR / filename
        driver.save_screenshot(str(filepath))
        return str(filepath)

    @staticmethod
    def handle_confirm_dialog(driver, accept=True, timeout=5):
        """
        Handles the SPMS custom React ConfirmProvider modal:
        .confirm-box with .confirm-actions .confirm-btn.primary / .confirm-btn.danger
        """
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        
        wait = WebDriverWait(driver, timeout)
        try:
            modal = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".confirm-box")))
            if accept:
                # Look for the confirm action button (primary or danger)
                confirm_btn = modal.find_element(By.CSS_SELECTOR, ".confirm-actions .confirm-btn.primary, .confirm-actions .confirm-btn.danger")
                confirm_btn.click()
            else:
                cancel_btn = modal.find_element(By.CSS_SELECTOR, ".confirm-actions .confirm-btn")
                cancel_btn.click()
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".confirm-box")))
            return True
        except Exception:
            return False

    @staticmethod
    def clear_auth_and_reload(driver):
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get(f"{config.BASE_URL}/login")

