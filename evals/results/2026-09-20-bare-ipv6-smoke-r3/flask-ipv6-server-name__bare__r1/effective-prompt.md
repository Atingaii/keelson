You are working in the Flask repository. Fix this reported regression:

`SERVER_NAME` accepts the documented host:port form, but an IPv6 literal such as `[::1]:8080` is parsed as though its first colon ended the hostname. When `app.run()` uses that configuration without an explicit host or port, it must pass host `::1` and port `8080` to the development server. Preserve existing hostname and port-zero behavior.

Make the smallest maintainable change consistent with this repository. Inspect the relevant implementation and existing tests, implement the fix, and run useful public verification. Do not ask for clarification: the requested behavior above is complete. At the end, state what you changed and exactly which verification commands you ran.


The harness has provisioned this public-test command in the worktree: `PYTHONPATH=src:.bench-pydeps python3 -m pytest <test-path> -q`. Use it or another useful public verification command as appropriate.