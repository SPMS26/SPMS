from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from config import config

class DriverFactory:
    @staticmethod
    def create_driver():
        if config.BROWSER == "chrome":
            options = ChromeOptions()
            options.page_load_strategy = "eager"
            if config.HEADLESS:
                options.add_argument("--headless=new")
            options.add_argument(f"--window-size={config.WINDOW_WIDTH},{config.WINDOW_HEIGHT}")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--disable-search-engine-choice-screen")
            options.add_argument("--disable-notifications")
            options.add_argument("--ignore-certificate-errors")
            # Grant fake camera video stream for html5-qrcode camera compatibility
            options.add_argument("--use-fake-ui-for-media-stream")
            options.add_argument("--use-fake-device-for-media-stream")
            
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(45)
            return driver
        else:
            raise ValueError(f"Unsupported browser: {config.BROWSER}")
