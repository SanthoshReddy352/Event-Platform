# EventX — Test Results & Template (Copy‑Paste Ready)

## Summary
This document contains test results and an easy-to-update YAML block for CI/test agents.

## Latest run
```
date: 2025-11-11
environment: local
status: partial
total_tests: 0
passed: 0
failed: 0
notes: "Use CI to run full test suite"
```

## Test template (paste into automation)
```yaml
metadata:
  created_by: "ci_pipeline"
  version: "1.0"
  run_at: 2025-11-11T00:00:00+05:30

test_plan:
  unit_tests:
    - path: app/tests/
    - command: python -m pytest
  integration_tests:
    - path: frontend/tests/
    - command: npm test --prefix frontend

test_results:
  - name: "auth tests"
    status: "unknown"
    comment: "Run in CI"
```

---
_Last updated: 2025-11-11