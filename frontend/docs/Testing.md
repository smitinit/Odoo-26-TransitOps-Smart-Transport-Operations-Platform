The QA test

# ✅ TransitOps - Testing Checklist

## Testing Status

| Status | Meaning |
|--------|---------|
| ⬜     | Not Tested |
| 🟡     | In Progress |
| ✅     | Passed |
| ❌     | Failed |

---

# 1. Authentication

| Test Case                         | Expected Result             | Status |
|------------                       |-----------------            |--------|
| Login with valid credentials      | User logged in successfully | ⬜ |
| Login with invalid password       | Error message displayed     | ⬜ |
| Login with unregistered email     | User not allowed            | ⬜ |
| Access dashboard without login    | Redirect to login page      | ⬜ |
| User accesses unauthorized module | Access denied               | ⬜ |

---

# 2. Dashboard

| Test Case                    | Expected Result           | Status |
|-----------                   |-----------------          |--------|
| Dashboard loads successfully | All KPIs displayed        | ⬜ |
| Active Vehicles count        | Correct value shown       | ⬜ |
| Active Trips count           | Correct value shown       | ⬜ |
| Fleet Utilization            | Correct percentage        | ⬜ |
| Filter by Vehicle Type       | Dashboard updates         | ⬜ |
| Filter by Status             | Correct results displayed | ⬜ |

---

# 3. Vehicle Management

| Test Case                     | Expected Result            | Status |
|-----------                    |-----------------           |--------|
| Add new vehicle               | Vehicle added successfully | ⬜ |
| Edit vehicle                  | Changes saved              | ⬜ |
| Delete vehicle                | Vehicle removed            | ⬜ |
| Duplicate Registration Number | Validation error           | ⬜ |
| Empty required fields         | Validation error           | ⬜ |
| Search vehicle                | Correct vehicle found      | ⬜ |
| Filter vehicles               | Correct list displayed     | ⬜ |

---

# 4. Driver Management

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Add driver | Driver added | ⬜ |
| Edit driver | Driver updated | ⬜ |
| Delete driver | Driver removed | ⬜ |
| Expired license | Driver cannot be assigned | ⬜ |
| Suspended driver | Driver cannot be assigned | ⬜ |
| Search driver | Correct driver displayed | ⬜ |

---

# 5. Trip Management

## Trip Creation

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Create valid trip | Trip created | ⬜ |
| Vehicle already on trip | Validation error | ⬜ |
| Driver already on trip | Validation error | ⬜ |
| Cargo exceeds vehicle capacity | Validation error | ⬜ |
| Vehicle in maintenance | Vehicle not selectable | ⬜ |
| Retired vehicle | Vehicle not selectable | ⬜ |
| Driver with expired license | Driver not selectable | ⬜ |
| Suspended driver | Driver not selectable | ⬜ |

---

## Trip Workflow

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Dispatch trip | Vehicle & Driver become "On Trip" | ⬜ |
| Complete trip | Vehicle & Driver become "Available" | ⬜ |
| Cancel trip | Vehicle & Driver restored | ⬜ |
| Enter final odometer | Saved successfully | ⬜ |
| Enter fuel consumed | Saved successfully | ⬜ |

---

# 6. Maintenance

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Create maintenance record | Vehicle becomes "In Shop" | ⬜ |
| Vehicle appears in maintenance list | Success | ⬜ |
| Vehicle hidden from dispatch | Success | ⬜ |
| Close maintenance | Vehicle becomes "Available" | ⬜ |

---

# 7. Fuel Management

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Add fuel log | Saved successfully | ⬜ |
| Fuel cost calculation | Correct | ⬜ |
| Fuel history displayed | Correct | ⬜ |

---

# 8. Expense Management

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Add expense | Saved successfully | ⬜ |
| Expense history | Correct | ⬜ |
| Total operational cost | Correct | ⬜ |

---

# 9. Reports & Analytics

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Fuel Efficiency | Correct calculation | ⬜ |
| Fleet Utilization | Correct percentage | ⬜ |
| Operational Cost | Correct calculation | ⬜ |
| Vehicle ROI | Correct calculation | ⬜ |
| Charts load | Display correctly | ⬜ |
| CSV Export | File downloads correctly | ⬜ |
| PDF Export (Optional) | File downloads correctly | ⬜ |

---

# 10. Business Rules Validation

| Rule | Expected Result | Status |
|------|-----------------|--------|
| Registration Number is unique | Duplicate rejected | ⬜ |
| Vehicle In Shop cannot be dispatched | Pass | ⬜ |
| Retired Vehicle cannot be dispatched | Pass | ⬜ |
| Expired License cannot be assigned | Pass | ⬜ |
| Suspended Driver cannot be assigned | Pass | ⬜ |
| Cargo > Capacity rejected | Pass | ⬜ |
| Dispatch updates Vehicle status | Pass | ⬜ |
| Dispatch updates Driver status | Pass | ⬜ |
| Complete Trip restores statuses | Pass | ⬜ |
| Cancel Trip restores statuses | Pass | ⬜ |
| Maintenance changes Vehicle to In Shop | Pass | ⬜ |
| Closing Maintenance restores Vehicle | Pass | ⬜ |

---

# 11. UI & Responsiveness

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Mobile view | Layout responsive | ⬜ |
| Tablet view | Layout responsive | ⬜ |
| Desktop view | Layout responsive | ⬜ |
| Navigation | All links work | ⬜ |
| Forms | Proper validation messages | ⬜ |
| Buttons | Working correctly | ⬜ |

---

# 12. Final Demo Checklist

| Item | Status |
|------|--------|
| Login works | ⬜ |
| Dashboard works | ⬜ |
| Vehicle CRUD works | ⬜ |
| Driver CRUD works | ⬜ |
| Trip Management works | ⬜ |
| Maintenance workflow works | ⬜ |
| Fuel & Expense Management works | ⬜ |
| Reports display correctly | ⬜ |
| Charts load | ⬜ |
| No major bugs | ⬜ |
| Demo ready | ⬜ |

---

# 📝 Bugs Found

| ID | Module | Description | Severity | Status |
|----|--------|-------------|----------|--------|
| BUG-001 | | | High / Medium / Low | Open |
| BUG-002 | | | High / Medium / Low | Open |
| BUG-003 | | | High / Medium / Low | Open |

---

# ✅ Final Verification

- [ ] All mandatory features completed
- [ ] All business rules validated
- [ ] Dashboard working
- [ ] No critical bugs
- [ ] README updated
- [ ] Screenshots captured
- [ ] Presentation ready
- [ ] Team ready for demo
