# FAQ

**Must I ignore .keelson?**
No. Commit project facts, decisions and reviewable evidence. Keys, trust and session state live outside tracked project data. Keelson does not edit .gitignore.

**Does a signature prove correctness?**
It binds a record and its logs under the local key. It does not prove adequate tests, benign commands, author identity, or resistance to another process with the same user's privileges. See [verification](verification.md).

**Why are passed checks stale?**
Code, acceptance, decisions, configuration, specs or rules changed. Rerun the complete suite. Handwritten Verify prose cannot clear the gate.

**Do decisions need repeating?**
Ask records answers, basis and dependencies. Settled questions remain settled until reopened with a reason. Facts the agent can investigate do not belong in the user queue.

**What if nobody can answer?**
Continue independent work. Record a reversible assumption if appropriate; unresolved or assumed structured decisions block normal landing. Existing explicit authorization remains valid.

**Are all adapters equally tested?**
No. Codex is the target of this repository's local model evaluation. Other adapters have capability metadata and fixture tests, not an established real-host end-to-end result. See [platforms](platforms.md).

**What happens with a tiny change?**
Trivial edits need no workspace. Other changes get the smallest useful acceptance contract. Guidance loads from the package on demand; vendor is optional.

**Can I retain existing documentation?**
Yes. Use refs or paths.specs. Writable specs must remain inside the project without symlink traversal. See [existing projects](existing-projects.md).

**Does landing publish or deploy?**
No. It merges local contracts, archives evidence and updates local work state. Pushes, package publication and deployment are separate authorized actions.

**Where are archived logs?**
Signed changes remain in changes/archive with public keys and logs. Review logs before committing. Private keys stay outside project data.

**How do I remove it?**
Uninstall removes owned integration and retains facts. Purge explicitly removes project data. Ablate/restore provide a reversible comparison workflow.

**Does it outperform other workflows?**
That requires identical models and budgets, actual activation, repeated runs and full failure reporting. See [benchmarks](../benchmarks/README.md); a small local benchmark does not establish universal superiority.
