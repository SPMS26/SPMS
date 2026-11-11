import os
from pathlib import Path

# Base Paths
TESTING_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = TESTING_DIR / "reports"
SCREENSHOTS_DIR = TESTING_DIR / "screenshots"

# Ensure directories exist
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Application URLs
BASE_URL = os.getenv("SPMS_BASE_URL", "http://localhost:5173")
API_URL = os.getenv("SPMS_API_URL", "http://localhost:5000/api")

# Selenium WebDriver Configuration
BROWSER = os.getenv("SELENIUM_BROWSER", "chrome").lower()
HEADLESS = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")
WINDOW_WIDTH = int(os.getenv("SELENIUM_WIDTH", "1440"))
WINDOW_HEIGHT = int(os.getenv("SELENIUM_HEIGHT", "900"))
DEFAULT_TIMEOUT = int(os.getenv("SELENIUM_TIMEOUT", "10"))
POLL_FREQUENCY = 0.5

