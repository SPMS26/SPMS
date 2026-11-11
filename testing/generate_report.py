import json
import re
import html
from pathlib import Path
from datetime import datetime

REPORTS_DIR = Path(__file__).resolve().parent / "reports"
HTML_REPORT = REPORTS_DIR / "report.html"
MD_REPORT = REPORTS_DIR / "test_execution_report.md"
JSON_REPORT = REPORTS_DIR / "test_execution_report.json"

def generate():
    if not HTML_REPORT.exists():
        print(f"Error: {HTML_REPORT} does not exist.")
        return

    content = HTML_REPORT.read_text(encoding="utf-8")
    m = re.search(r'data-jsonblob="([^"]+)"', content)
    if not m:
        print("Could not find data-jsonblob in report.html")
        return

    data = json.loads(html.unescape(m.group(1)))
    tests = data.get("tests", {})

    total = len(tests)
    passed = 0
    failed = 0
    skipped = 0

    module_stats = {}
    details = []

    for test_id, results in tests.items():
        res = results[0]
        status = res.get("result", "Unknown")
        duration = res.get("duration", "0s")
        log = res.get("log", "")

        if status == "Passed":
            passed += 1
        elif status == "Failed":
            failed += 1
        elif status == "Skipped":
            skipped += 1

        # Extract module
        parts = test_id.split("::")
        file_path = parts[0]
        test_func = parts[-1]
        
        # Categorize
        if "authentication" in file_path:
            mod = "Module 1: Authentication"
        elif "profile_vehicle" in file_path:
            mod = "Module 2: Profile & Vehicle"
        elif "parking_slots" in file_path:
            mod = "Module 3: Parking Lots & Slots"
        elif "pre_booking" in file_path:
            mod = "Module 4: Pre-booking"
        elif "qr_entry_exit" in file_path:
            mod = "Module 5: QR Entry & Exit"
        elif "parking_charges" in file_path:
            mod = "Module 6: Parking Charges"
        elif "booking_history" in file_path:
            mod = "Module 7: History"
        elif "incident_reporting" in file_path:
            mod = "Module 8: Incident Reporting"
        elif "admin_management" in file_path:
            mod = "Module 9: Admin Management"
        elif "analytics" in file_path:
            mod = "Module 10: Analytics & Reports"
        elif "missing_features" in file_path:
            mod = "SRS Missing Features (Tracked)"
        else:
            mod = "Other"

        if mod not in module_stats:
            module_stats[mod] = {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
        module_stats[mod]["total"] += 1
        if status == "Passed":
            module_stats[mod]["passed"] += 1
        elif status == "Failed":
            module_stats[mod]["failed"] += 1
        elif status == "Skipped":
            module_stats[mod]["skipped"] += 1

        details.append({
            "test_id": test_id,
            "module": mod,
            "name": test_func,
            "status": status,
            "duration": duration,
            "log": log.strip() if status != "Passed" else ""
        })

    summary = {
        "timestamp": datetime.now().isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "pass_rate": f"{(passed / (total - skipped) * 100):.1f}%" if (total - skipped) > 0 else "0%",
        "modules": module_stats,
        "details": details
    }

    JSON_REPORT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote JSON report to {JSON_REPORT}")

    # Build Markdown report
    md = []
    md.append("# SPMS — Automation Testing Execution Summary Report")
    md.append(f"\n**Execution Date & Time:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`  ")
    md.append(f"**Test Framework:** Python + pytest + Selenium WebDriver (Page Object Model)  ")
    md.append(f"**Application URL Under Test:** `http://localhost:5173` (Frontend) / `http://localhost:5000` (Backend API)  ")
    md.append(f"**Database:** PostgreSQL (`spms` schema)  \n")
    md.append("## 1. Executive Summary Table\n")
    md.append("| Metric | Count | Percentage |")
    md.append("|---|---|---|")
    md.append(f"| **Total Test Cases** | {total} | 100.0% |")
    md.append(f"| **Passed** | {passed} | {(passed/total*100):.1f}% |")
    md.append(f"| **Failed** | {failed} | {(failed/total*100):.1f}% |")
    md.append(f"| **Skipped / Blocked (SRS Gaps)** | {skipped} | {(skipped/total*100):.1f}% |")
    md.append(f"| **Effective Pass Rate (Implemented)** | **{passed}/{total - skipped}** | **{(passed/(total - skipped)*100):.1f}%** |\n")

    md.append("## 2. Module Breakdown Table\n")
    md.append("| Module | Total | Passed | Failed | Skipped | Status |")
    md.append("|---|---|---|---|---|---|")
    for mod, s in module_stats.items():
        status_badge = "✅ PASS" if s["failed"] == 0 else "❌ FAIL"
        md.append(f"| {mod} | {s['total']} | {s['passed']} | {s['failed']} | {s['skipped']} | {status_badge} |")

    md.append("\n## 3. Implemented vs. Non-Implemented Analysis (SRS Gaps)\n")
    md.append("The following features specified in the original SRS were accurately flagged as **SKIPPED (NOT IMPLEMENTED)** rather than producing false failures:\n")
    md.append("1. **BOOK-05 / Native Datetime picker**: Browser-native `<input type=\"datetime-local\">` enforces standard OS pickers; validated via standard backend conflict prevention instead.")
    md.append("2. **Real Razorpay Gateway Integration (Req-9)**: The application implements mock/base-fare simulated payments with QR passes; external bank gateway webhooks are not implemented.")
    md.append("3. **User Self-Service Live Booking (Req-6)**: Users pre-book passes and check-in via security QR scan; live instant slot booking at gate is handled via the QR scanner workflow.")
    md.append("4. **Advanced Parking Lot Search & Filters (Req-3)**: Current UI renders available lots directly in dashboard cards rather than via dedicated multi-criteria search filters.")
    md.append("5. **Automated Nightly Backups & 30-day Retention (SRS Section 5.5)**: Infrastructure/cron backup task is omitted from this application build.")
    md.append("6. **Direct Admin User Management (Req-13)**: The admin dashboard manages lots, slots, pricing, and incidents; direct editing/suspending of user accounts from UI is not implemented.\n")

    md.append("## 4. Test Execution Details\n")
    md.append("| Test Name | Module | Status | Duration |")
    md.append("|---|---|---|---|")
    for d in details:
        status_icon = "✅ Passed" if d["status"] == "Passed" else ("⏭️ Skipped" if d["status"] == "Skipped" else "❌ Failed")
        md.append(f"| `{d['name']}` | {d['module']} | {status_icon} | {d['duration']} |")

    MD_REPORT.write_text("\n".join(md), encoding="utf-8")
    print(f"Wrote Markdown report to {MD_REPORT}")

if __name__ == "__main__":
    generate()
