You are working in the Flask repository. A template filename with an uppercase or mixed-case standard extension, such as `invoice.HTML` or `diagram.SvG`, currently does not enable Jinja autoescaping even though the same lowercase extension does.

Update the existing default autoescape behavior so standard supported extensions are recognized regardless of filename case. Preserve behavior for filenames without a supported extension and for `None`. Keep the change focused, add or update tests if appropriate, and run useful public verification. Do not ask for clarification: the behavior above is complete. At the end, state what you changed and exactly which verification commands you ran.


This is the bare treatment: execute the task directly with the repository and the task prompt.

The harness has provisioned this public-test command in the worktree: `PYTHONPATH=src:.bench-pydeps python3 -m pytest tests -q`. Use it or another useful public verification command as appropriate. Work only from the provided baseline source in this worktree. Do not search the network or upstream history for a patch or answer. Do not read agent instructions, skills, or configuration from paths outside this worktree.