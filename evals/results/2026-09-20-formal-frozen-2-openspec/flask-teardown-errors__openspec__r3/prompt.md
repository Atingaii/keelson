You are working in the Flask repository. Implement the following already-settled teardown behavior.

Decision D-17 (settled): during request and application-context teardown, Flask must attempt every registered teardown callback and teardown signal even when earlier callbacks raise. It must raise after cleanup finishes, preserving all collected teardown errors on Python versions that support exception groups; on older Python versions, raising the first collected error is acceptable. Context-local state must still be restored before the error leaves teardown.

Find the relevant teardown paths and existing test conventions. Implement the behavior with a maintainable shared mechanism where it earns its complexity, add or update tests if appropriate, and run useful public verification. Do not reopen D-17 or ask for clarification. At the end, state what you changed and exactly which verification commands you ran.
