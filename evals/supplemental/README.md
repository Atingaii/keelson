# Supplemental D-17 coverage audit

Frozen on 2026-09-20 after the formal matrix began, before replaying any candidate
against this additional test. The original task prompt already requires all
teardown errors to survive and context-local state to be restored. Its original
hidden test only checks four callback invocations, leaving those requirements
uncovered. This file documents that coverage gap rather than rewriting history.

`test_teardown_contract.py` checks multiple callbacks, both teardown signals,
the context-popped signal, exception-group leaves and restoration of a nested
outer context. It runs under the same pinned Python 3.11 environment. Older
Python fallback behavior is not measured by this audit.

First require the unchanged baseline to fail and the pinned upstream fix to
pass. Then replay every method's three saved teardown patches against the
same baseline and locked dependencies. Save raw outputs separately from the
original run. Do not modify original `acceptance_pass`, prompts or patches;
report both results, including every supplemental failure. Do not select only
successful patches or give any coding agent this test before its run finishes.
