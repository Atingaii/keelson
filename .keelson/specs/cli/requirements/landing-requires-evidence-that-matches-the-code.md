# Landing requires evidence that matches the code

## Requirement: Landing requires evidence that matches the code

Normal landing SHALL require completed acceptance, resolved decisions/questions/dependencies, reconciled contracts, required rollout, current required independent review and fresh complete signed evidence. Task checkboxes are advisory. An authorized --force requires a reason and archives a signed override without converting failed evidence to success. For a change requiring independent review, force SHALL NOT bypass review or verification gates.

### Scenario: Prose forgery
- WHEN a user writes a passing Verify paragraph without valid structured evidence
- THEN normal landing fails

### Scenario: Changed acceptance or review
- WHEN request, acceptance, decision records, declared context or review changes after a check
- THEN verification is stale until the full suite is rerun

### Scenario: Forced behavioral landing
- WHEN a spec, delta-bearing or explicitly independent-review change lacks current review or full checks
- THEN --force also refuses without folding or archiving the change
