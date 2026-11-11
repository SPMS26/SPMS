# SPMS — Complete Selenium Automation Testing Framework

An end-to-end automated testing framework built using **Python**, **Selenium WebDriver**, **pytest**, and the **Page Object Model (POM)** pattern to rigorously validate the Smart Parking Management System (SPMS).

---

## 1. Architecture & Design Principles

The automation suite adheres to enterprise QA automation standards:

- **Page Object Model (POM)**: Every React page/view is modeled as a reusable Page Object (`testing/pages/`), isolating locators and UI interaction logic from test assertions.
- **Explicit Synchronization**: Eliminates brittle fixed sleep calls by leveraging `WebDriverWait` and `expected_conditions` (`testing/utils/wait_utils.py`).
- **SPA Resilience**: Configured with `page_load_strategy = "eager"` to eliminate indefinite hang-ups caused by persistent WebSocket/Socket.io channels in Vite + React.
- **Custom React Modal Handlers**: Seamlessly interacts with custom React components, including the promise-based `.confirm-box` dialog (`testing/utils/helpers.py`).
- **Fail-Safe Screenshots**: Automatically captures and timestamps full-browser screenshots upon any assertion or driver failure (`testing/screenshots/`).
- **Detailed Multi-Format Reporting**: Generates interactive standalone HTML reports (`pytest-html`), structured Markdown executive reports, and machine-readable JSON metrics.

---

## 2. Directory Structure

```text
SPMS/testing/
├── README.md                           # Framework documentation & run instructions
├── requirements.txt                    # Python dependencies
├── pytest.ini                          # Test configuration & markers
├── generate_report.py                  # Report generator (HTML -> MD & JSON)
│
├── config/
│   ├── config.py                       # Base URLs, timeouts, headless toggles
│   └── test_data.py                    # Seeded users, dynamic unique data generators
│
├── utils/
│   ├── driver_factory.py               # Chrome WebDriver options & lifecycle
│   ├── helpers.py                      # Screenshots, React modal confirmation handler
│   └── wait_utils.py                   # Explicit wait wrappers (EC)
│
├── pages/
│   ├── base_page.py                    # Base class with core driver interactions
│   ├── login_page.py                   # /login page
│   ├── registration_page.py            # /register page
│   ├── dashboard_page.py               # /dashboard (live user slots & summary)
│   ├── profile_page.py                 # /profile (identity card, vehicles, password)
│   ├── bookings_page.py                # /bookings (pre-booking modal & pass card)
│   ├── qr_scanner_page.py              # /admin/scanner (staff camera & manual scanner)
│   ├── report_issue_page.py            # /report-issue (incident submission form)
│   ├── admin_dashboard_page.py         # /admin (KPIs, active vehicle metrics)
│   ├── admin_lots_page.py              # /admin/lots (lot creation, pricing, bulk slots)
│   ├── admin_reports_page.py           # /admin/reports (revenue & occupancy analytics)
│   └── admin_security_page.py          # /admin/security (security guard registration)
│
├── tests/
│   ├── conftest.py                     # Fixtures: driver, user_driver, admin_driver, hook
│   ├── authentication/
│   │   └── test_authentication.py      # AUTH-01 through AUTH-08
│   ├── profile_vehicle/
│   │   └── test_profile_vehicle.py     # PROF-01 to PROF-04, VEH-01 to VEH-04
│   ├── parking_slots/
│   │   └── test_parking_slots.py       # SLOT-01 through SLOT-07
│   ├── pre_booking/
│   │   └── test_pre_booking.py         # BOOK-01 through BOOK-07
│   ├── qr_entry_exit/
│   │   └── test_qr_entry_exit.py       # QR-01 through QR-09
│   ├── parking_charges/
│   │   └── test_parking_charges.py     # PAY-01 through PAY-05
│   ├── booking_history/
│   │   └── test_booking_history.py     # HIST-01 through HIST-04
│   ├── incident_reporting/
│   │   └── test_incident_reporting.py  # INC-01 through INC-04
│   ├── admin_management/
│   │   └── test_admin_management.py    # ADM-01 through ADM-11
│   ├── analytics/
│   │   └── test_analytics.py           # ANA-01 through ANA-06
│   └── test_missing_features.py        # SRS Missing Features (Accurately Skipped)
│
├── reports/
│   ├── report.html                     # Self-contained visual HTML report
│   ├── test_execution_report.md        # Formatted Markdown report for lab/viva
│   └── test_execution_report.json      # Structured test metrics
│
└── screenshots/                        # Diagnostic screenshots on failure
```

---

## 3. Prerequisites & Setup

### Prerequisites
1. **Python 3.10+** (Tested on Python 3.12.5)
2. **Google Chrome** (Installed at standard OS location)
3. **SPMS Server & Client Running**:
   - Backend API running on `http://localhost:5000` (Node.js Express + PostgreSQL)
   - Frontend Vite application running on `http://localhost:5173` (React)

### Installation
Navigate to the `SPMS/testing` folder and install dependencies:

```bash
cd SPMS/testing
pip install -r requirements.txt
```

---

## 4. Execution Commands

### Run Full Test Suite with HTML Report
```bash
cd SPMS/testing
python -m pytest --html=reports/report.html --self-contained-html
```

### Run by Specific Module
```bash
# Authentication tests
python -m pytest tests/authentication/ -v

# Pre-booking tests
python -m pytest tests/pre_booking/ -v

# QR Entry & Exit tests
python -m pytest tests/qr_entry_exit/ -v

# Admin Management tests
python -m pytest tests/admin_management/ -v

# Analytics & Reports tests
python -m pytest tests/analytics/ -v
```

### Run in Headful (Visible Browser) Mode
By default, tests run in headless mode for CI/CD speed. To watch the browser interact with the UI:
1. Open `config/config.py`.
2. Set `HEADLESS = False`.
3. Run `python -m pytest ...`.

### Generate Markdown & JSON Summary Reports
After running pytest, convert the execution blob into executive reports:
```bash
python generate_report.py
```

---

## 5. Module Coverage & Test Cases

| Module | Test IDs | Description |
|---|---|---|
| **Module 1: Authentication** | `AUTH-01` to `AUTH-08` | User registration, duplicates, validation errors, valid login, invalid passwords, unknown emails, protected route access control. |
| **Module 2: Profile & Vehicles** | `PROF-01` to `PROF-04`, `VEH-01` to `VEH-04` | Profile view, phone/email editing, password change with custom modals, add vehicle, vehicle validation, delete vehicle, set default vehicle. |
| **Module 3: Parking Lots & Slots**| `SLOT-01` to `SLOT-07` | Lot listing, slot grid rendering, available/occupied/reserved/maintenance badge states, dynamic real-time slot state changes. |
| **Module 4: Pre-booking** | `BOOK-01` to `BOOK-07` | Slot reservation, overlap rejection, occupied slot protection, required field validation, simulated base-fare payment, parking pass activation. |
| **Module 5: QR Entry & Exit** | `QR-01` to `QR-09` | Pass QR generation, security scanner interface, vehicle check-in, checkout with fee calculation, invalid/tampered QR signature rejection. |
| **Module 6: Parking Charges** | `PAY-01` to `PAY-05` | Dynamic duration pricing formula, base fare deduction, remaining balance calculation, rate display validation. |
| **Module 7: History** | `HIST-01` to `HIST-04` | Pass history view, transaction log, empty state for fresh users, cross-user isolation verification. |
| **Module 8: Incident Reporting** | `INC-01` to `INC-04` | Incident ticket submission, validation, image file upload handling, submitted ticket verification. |
| **Module 9: Admin Management** | `ADM-01` to `ADM-11` | Create parking lot, edit lot, toggle lot status, bulk slot generation, enable/disable slot maintenance, rate updating, ticket resolution, staff creation, security access lockdown. |
| **Module 10: Analytics & Reports** | `ANA-01` to `ANA-06` | Total revenue KPI, total bookings, active vehicle counts, monthly revenue charts, occupancy heatmaps, daily breakdowns. |

---

## 6. Transparent Handling of SRS Missing Features

In accordance with strict QA integrity, features described in the original SRS that are not implemented in the current code build are **not faked as passed**. Instead, they are explicitly marked as **`SKIPPED (NOT IMPLEMENTED)`**:

1. **Real Razorpay Gateway Integration (Req-9)**: Implemented as mock base-fare checkout; real external webhooks are not present.
2. **User Self-Service Live Booking (Req-6)**: Current architecture requires pre-booking or gate entry check-in via security staff scanner.
3. **Advanced Lot Search/Filter (Req-3)**: Lots are presented directly in a responsive card grid rather than via multi-parameter search inputs.
4. **Automated Nightly Backups & 30-Day Retention (SRS Section 5.5)**: Infrastructure cron job not included in web app repository.
5. **Direct Admin User Management (Req-13)**: The admin dashboard manages operations, pricing, and staff, but does not provide direct user account editing/suspension.

