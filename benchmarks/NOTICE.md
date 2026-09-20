# Benchmark source attribution

The benchmark runner and reporting code are Keelson work. The preserved task
fixtures, patches and raw tool transcripts may also contain third-party source
code, installed workflow text or model edits to that material. Those portions
retain their upstream notices and licenses; the repository's MIT license does
not replace them. Method installation is part of the experiment, not a runtime
dependency of Keelson.

| Project and pinned version | Material in the evidence | Upstream license | Corresponding source |
| --- | --- | --- | --- |
| Flask, three baseline commits | Task source, public-test output and proposed patches | [BSD-3-Clause notice](licenses/flask-LICENSE.txt) | [Autoescape baseline](https://github.com/pallets/flask/tree/06ea505ce2b2042af26e96d35ebf159af7c0869d), [IPv6 baseline](https://github.com/pallets/flask/tree/de8429ffda8cfb54db175529e2bae72a24e1fa7e), [teardown baseline](https://github.com/pallets/flask/tree/7b0088693ece1bd3a9238a6fdf56ed8df7a4d43b) |
| OpenSpec 1.13.1 | Installed skills and workflow artifacts | [MIT notice](licenses/openspec-LICENSE.txt) | [Release-tag source](https://github.com/Fission-AI/OpenSpec/tree/634c557bd0470eec37861b46172c3f503d283c1b) |
| Trellis 0.6.17 | Installed skills, scripts and workflow artifacts | [AGPL-3.0-only license](licenses/trellis-LICENSE.txt) | [Release-tag source](https://github.com/mindfold-ai/Trellis/tree/833a5846d18ad7a5ccd8c41c876d89cc936f5fd9), [complete source archive](https://github.com/mindfold-ai/Trellis/archive/833a5846d18ad7a5ccd8c41c876d89cc936f5fd9.tar.gz) |
| Superpowers `5bf4e78011075bcfc0dc295f0724994cd123ee71` | Installed skill text | [MIT notice](licenses/superpowers-LICENSE.txt) | [Pinned source](https://github.com/obra/superpowers/tree/5bf4e78011075bcfc0dc295f0724994cd123ee71) |

The OpenSpec and Trellis license files were extracted without modification from
the exact npm packages used in the comparison after checking their SHA-512
integrity. The Flask and Superpowers notices were fetched at the pinned commits.
[License provenance](licenses/provenance.json) records their sources and SHA-256
hashes. All three Flask baseline notices are byte-identical. Release-tag source
links identify the upstream source corresponding to the package version; the npm
tarball integrity remains the authority for the installed artifact.

The upstream projects have not endorsed Keelson or these measurements. Raw
evidence records what happened during a run; quotations in it are not Keelson's
own guidance or claims. Changes made by a treatment are preserved in that run's
patch and transcript, with the task baseline identified alongside them.
