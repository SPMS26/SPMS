import pytest
import time
import os
from pages.report_issue_page import ReportIssuePage
from selenium.webdriver.common.by import By

@pytest.mark.incident
class TestIncidentReporting:

    def test_inc_01_submit_valid_incident(self, user_driver):
        """INC-01: Submit a valid incident."""
        report_page = ReportIssuePage(user_driver).open()
        time.sleep(1)

        desc = f"Automated Selenium Test Incident - Blocked Slot {int(time.time())}"
        report_page.submit_report(description=desc, category="Blocked Slot")
        time.sleep(2)

        # Verify new report appears in list
        assert report_page.is_visible((By.XPATH, f"//*[contains(text(), '{desc[:30]}')]"), timeout=6)

    def test_inc_02_submit_incident_missing_description(self, user_driver):
        """INC-02: Submit an incident with missing description."""
        report_page = ReportIssuePage(user_driver).open()
        time.sleep(1)

        report_page.submit_report(description="")
        time.sleep(1)

        # Textarea remains on page, form not cleared
        assert report_page.is_visible(report_page.DESCRIPTION_TEXTAREA)

    def test_inc_03_submit_incident_with_image(self, user_driver, tmp_path):
        """INC-03: Submit an incident with an image attachment."""
        report_page = ReportIssuePage(user_driver).open()
        time.sleep(1)

        # Create a temporary dummy image file
        img_file = tmp_path / "test_proof.jpg"
        img_file.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00")

        desc = f"Incident with photo proof {int(time.time())}"
        report_page.submit_report(description=desc, category="Damaged Slot", image_path=str(img_file))
        time.sleep(2)

        assert report_page.is_visible((By.XPATH, f"//*[contains(text(), '{desc[:25]}')]"), timeout=6)

    def test_inc_04_verify_submitted_incident_details(self, user_driver):
        """INC-04: Verify submitted incident details."""
        report_page = ReportIssuePage(user_driver).open()
        time.sleep(1)

        # Verify report list cards render status badges (Pending, Resolved, etc.)
        status_badges = report_page.find_all((By.XPATH, "//*[contains(text(), 'Pending') or contains(text(), 'Resolved')]"))
        assert len(status_badges) > 0, "Incident reports should render status badge"

