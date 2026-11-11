import pytest
import os
import sys
from pathlib import Path

# Ensure testing folder is in sys.path
TESTING_DIR = Path(__file__).resolve().parent.parent
if str(TESTING_DIR) not in sys.path:
    sys.path.insert(0, str(TESTING_DIR))

from utils.driver_factory import DriverFactory
from utils.helpers import Helpers
from config.test_data import DEMO_USER, DEMO_ADMIN, DEMO_SECURITY
from config import config

# Store test execution records for summary report
test_results_collector = []

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        driver = item.funcargs.get("driver") or item.funcargs.get("user_driver") or item.funcargs.get("admin_driver") or item.funcargs.get("security_driver")
        screenshot_path = None
        if report.failed and driver:
            try:
                screenshot_path = Helpers.take_screenshot(driver, item.name)
            except Exception as e:
                print(f"Failed to capture screenshot: {e}")

        # Extract test case metadata
        scenario = getattr(item.function, "__doc__", item.name) or item.name
        test_results_collector.append({
            "nodeid": item.nodeid,
            "name": item.name,
            "scenario": scenario.strip(),
            "status": "PASS" if report.passed else ("FAIL" if report.failed else "SKIPPED"),
            "duration": report.duration,
            "screenshot": screenshot_path,
            "error": str(report.longrepr) if report.failed else None
        })

@pytest.fixture(scope="function")
def driver():
    drv = DriverFactory.create_driver()
    yield drv
    try:
        drv.quit()
    except Exception:
        pass

@pytest.fixture(scope="function")
def user_driver(driver):
    from pages.login_page import LoginPage
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(DEMO_USER["email"], DEMO_USER["password"])
    login_page.wait.wait_for_url_contains("/dashboard")
    return driver

@pytest.fixture(scope="function")
def admin_driver(driver):
    from pages.login_page import LoginPage
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(DEMO_ADMIN["email"], DEMO_ADMIN["password"])
    login_page.wait.wait_for_url_contains("/admin")
    return driver

@pytest.fixture(scope="function")
def security_driver(driver):
    from pages.login_page import LoginPage
    login_page = LoginPage(driver)
    login_page.open()
    login_page.login(DEMO_SECURITY["email"], DEMO_SECURITY["password"])
    login_page.wait.wait_for_url_contains("/admin/scanner")
    return driver

