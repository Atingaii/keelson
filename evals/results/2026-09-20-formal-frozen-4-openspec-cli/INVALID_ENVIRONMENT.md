# Invalid formal attempt

Invalid formal attempt: the OpenSpec CLI smoke used sh -c, but Codex command executions use /bin/bash -lc, whose login-shell PATH did not contain openspec. Raw events show openspec command-not-found. This attempt is retained and excluded.

Raw events and all resulting patches remain preserved. Do not use this directory in method comparison.
