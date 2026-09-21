# Tier resolution order

## Requirement: Tier resolution order

`keelson models --resolve <tier>` SHALL resolve in the order explicit, project config, user overrides, registry, platform rank fallback.

### Scenario: User override
- WHEN `~/.keelson/models.yaml` maps `claude.deep` to an alias and the project config does not
- THEN `--resolve deep` prints that alias
