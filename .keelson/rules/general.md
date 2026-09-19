# General conventions

- `npm test` and `node bin/keelson.js validate` pass before a change lands.
- Behaviour changes update the matching docs page and CHANGELOG.md in the same change.
- No dated model IDs anywhere; `keelson validate` enforces this for `.keelson/`, review enforces it elsewhere.
