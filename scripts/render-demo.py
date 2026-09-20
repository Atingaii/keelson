#!/usr/bin/env python3
"""Capture the current CLI in an isolated fixture and render both README GIFs.

Run from any directory: python3 scripts/render-demo.py
Requires Node, Git, Python 3 and Pillow (development tooling only).
Ubuntu fonts: fonts-dejavu-core and fonts-wqy-zenhei at the paths below.
No network, installed keelson executable, HOME override, or CLI mocks are used.
Timing is edited; terminal text comes from captured subprocess output.
The explicit fixture editor is not a Keelson implementation capability.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import uuid

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "bin/keelson.js"
ASSETS = ROOT / "docs/assets"
WIDTH, HEIGHT = 1160, 740
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_TEXT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_ZH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
CHANGE = "fix-empty-title"
ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def main():
    git_dir = subprocess.check_output(
        ["git", "rev-parse", "--absolute-git-dir"], cwd=ROOT, text=True
    ).strip()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6]
    evidence = Path(git_dir) / "keelson-task-evidence/readme-demo" / run_id
    evidence.mkdir(parents=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    records = []
    scenes = []
    env = os.environ.copy()
    env.update({"NO_COLOR": "1", "FORCE_COLOR": "0", "CI": "1"})
    for key in ("CODEX_THREAD_ID", "KEELSON_SESSION_ID", "PI_SESSION_ID", "CLAUDE_SESSION_ID"):
        env.pop(key, None)
    temp = Path(tempfile.mkdtemp(prefix="keelson-gif-capture-"))
    project = temp / "title-example"
    project.mkdir()
    (evidence / "temporary-directory.txt").write_text(str(temp) + "\n")

    def run(argv, expected=0, display=None):
        result = subprocess.run(argv, cwd=project, env=env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        output = ANSI.sub("", result.stdout).rstrip()
        record = {"argv": [str(x) for x in argv], "display": display or " ".join(argv),
                  "exit_code": result.returncode, "stdout_stderr": output}
        records.append(record)
        save_records()
        if result.returncode != expected:
            raise RuntimeError(f"Unexpected exit {result.returncode}: {record['display']}\n{output}")
        return record

    def save_records():
        (evidence / "transcript.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
        (evidence / "transcript.txt").write_text("\n\n".join(
            f"$ {r['display']}\n{r['stdout_stderr']}\n[exit {r['exit_code']}]" for r in records) + "\n")

    def keelson(args, expected=0):
        return run(["node", str(CLI), *args], expected, "keelson " + " ".join(args))

    try:
        run(["git", "init", "-q", "-b", "main"])
        run(["git", "config", "user.name", "Demo"])
        (project / ".keelson").mkdir()
        (project / ".keelson/config.yaml").write_text(
            'version: 4\nlang: en\ncheck:\n  - name: title-regression\n    command: node test.mjs\n')
        (project / ".keelson/INTENT.md").write_text("# Title example\nBlank titles need a stable fallback.\n")
        (project / ".keelson/NOW.md").write_text("# Now\nFix empty title handling.\n")
        (project / "title.mjs").write_text(
            "export function titleSlug(title) {\n  return title.trim().toLowerCase().replace(/\\s+/g, '-');\n}\n")
        (project / "test.mjs").write_text(textwrap.dedent('''\
            import assert from 'node:assert/strict';
            import { titleSlug } from './title.mjs';
            const cases = [['normal title', 'Hello Team', 'hello-team'], ['blank title', '   ', 'untitled']];
            let passed = 0;
            for (const [name, input, expected] of cases) {
              const actual = titleSlug(input);
              try {
                assert.equal(actual, expected);
                console.log(`PASS ${name}`);
                passed++;
              } catch (error) {
                if (error.code !== 'ERR_ASSERTION') throw error;
                console.log(`FAIL ${name}`);
                console.log(`  expected: ${JSON.stringify(expected)}`);
                console.log(`  received: ${JSON.stringify(actual)}`);
              }
            }
            console.log(`${passed}/${cases.length} assertions passed.`);
            process.exitCode = passed === cases.length ? 0 : 1;
            '''))
        (project / "describe-change.py").write_text(textwrap.dedent(f'''\
            from pathlib import Path
            p = Path('.keelson/changes/{CHANGE}/change.md')
            header = p.read_text().split('---', 2)[1]
            p.write_text('---' + header + '---\\n\\n# Fix empty title\\n\\n## Why\\nBlank input currently produces an empty slug.\\n\\n## What\\n- Add an untitled fallback.\\n\\n## Acceptance\\n- [ ] Blank title becomes untitled; normal titles still work. — check: `node test.mjs`\\n')
            print('Acceptance saved in change.md:')
            print('  [ ] Blank title becomes untitled; normal titles still work.')
            '''))
        (project / "apply-fix.py").write_text(textwrap.dedent('''\
            from pathlib import Path
            import difflib
            p = Path('title.mjs')
            before = p.read_text()
            after = before.replace("replace(/\\\\s+/g, '-');", "replace(/\\\\s+/g, '-') || 'untitled';")
            assert before != after, 'Expected the original bug'
            p.write_text(after)
            print('Explicit code edit by the fixture helper:')
            print(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='title.mjs (before)', tofile='title.mjs (after)')), end='')
            '''))
        (project / "accept-fix.py").write_text(textwrap.dedent(f'''\
            from pathlib import Path
            import subprocess
            subprocess.run(['node', 'test.mjs'], check=True)
            p = Path('.keelson/changes/{CHANGE}/change.md')
            p.write_text(p.read_text().replace('- [ ] Blank title', '- [x] Blank title'))
            print('Acceptance checked after the assertions passed.')
            '''))
        # Preserve exact source bytes as text; Node also discovers tests in .git.
        fixture = evidence / "fixture-inputs"
        fixture.mkdir()
        for name in ("title.mjs", "test.mjs", "describe-change.py", "apply-fix.py", "accept-fix.py"):
            shutil.copy2(project / name, fixture / (name + ".txt"))
        shutil.copy2(project / ".keelson/config.yaml", fixture / "config.yaml")

        created = keelson(["new", CHANGE, "--tier", "quick"])
        described = run(["python3", "describe-change.py"])
        scenes.append([created, described])
        failed = keelson(["check", "--trust", "--record"], 1)
        assert 'FAIL blank title' in failed['stdout_stderr']
        scenes.append([failed])
        blocked = keelson(["land", CHANGE], 1)
        assert 'cannot land' in blocked['stdout_stderr'] and 'verification failed' in blocked['stdout_stderr']
        scenes.append([blocked])
        edited = run(["python3", "apply-fix.py"])
        scenes.append([edited])
        run(["python3", "accept-fix.py"])
        passed = keelson(["check", "--record"])
        assert 'ready' in passed['stdout_stderr'] and 'all checks passed' in passed['stdout_stderr']
        scenes.append([passed])
        status = keelson(["status", "--json"])
        status_data = json.loads(status['stdout_stderr'])
        (evidence / "status-ready.json").write_text(json.dumps(status_data, indent=2) + "\n")
        landed = keelson(["land", CHANGE, "--now", "No change in flight."])
        assert 'archived' in landed['stdout_stderr']
        scenes.append([landed])
        archive = list((project / ".keelson/changes/archive").glob("*-" + CHANGE))
        assert len(archive) == 1 and not (project / ".keelson/changes" / CHANGE).exists()
        shutil.copytree(archive[0], evidence / "archived-change")
        keelson(["status", "--json"])
        outputs = render(scenes, evidence)
        summary = {
            "source": "Current repository CLI; all terminal text is captured output, not fabricated.",
            "scope": "Preconfigured, isolated title example; explicit fixture helper edits code. Not an AI session recording.",
            "playback": "Edited timing; selected commands shown with complete output. Setup, status queries and the acceptance helper are retained in the transcript.",
            "cli_command_display": "keelson is displayed for node <repository>/bin/keelson.js; argv is retained in transcript.json.",
            "offscreen_action": "accept-fix.py reruns the real assertions and checks acceptance before the final recorded check; fully logged.",
            "results": {"failed_check_exit": failed['exit_code'], "blocked_land_exit": blocked['exit_code'],
                        "passed_check_exit": passed['exit_code'], "land_exit": landed['exit_code'],
                        "archive_created": True, "active_change_removed": True},
            "assets": outputs, "temporary_directory": str(temp), "temporary_directory_removed": False,
        }
        (evidence / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    finally:
        shutil.rmtree(temp)
        summary_path = evidence / "summary.json"
        if summary_path.exists():
            summary = json.loads(summary_path.read_text())
            summary['temporary_directory_removed'] = not temp.exists()
            summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
        (evidence / "cleanup.txt").write_text(f"Removed only this run's temporary directory: {temp}\nExists after cleanup: {temp.exists()}\n")
    print(json.dumps({"evidence": str(evidence), "assets": outputs}, ensure_ascii=False, indent=2))


def render(scenes, evidence):
    captions = {
        "en": [
            ("Make the finish line explicit.", "One small fix. One written acceptance criterion."),
            ("A failed check stays visible.", "The real regression fails, and its result is recorded."),
            ("Unfinished work cannot quietly land.", "Keelson refuses to archive this failing change."),
            ("Apply the actual code fix.", "An explicit editor adds the fallback. Keelson does not write it."),
            ("Fresh evidence makes it ready.", "After confirming acceptance, rerun and record the checks."),
            ("Close the change with its evidence.", "The verified change is archived, ready for the final commit."),
        ],
        "zh": [
            ("先把“怎样算完成”写清楚。", "一个小修复，一条明确的验收条件。"),
            ("测试失败，留下真实记录。", "回归用例发现问题，失败结果写入变更证据。"),
            ("未完成的变更，会被拦下来。", "检查失败时，Keelson 拒绝归档。"),
            ("实际修改代码，再往下走。", "独立编辑脚本补上默认值，代码并非由 CLI 自动修复。"),
            ("新验证通过，才进入 ready。", "确认验收项后，重新执行并记录检查。"),
            ("带着验证证据，完成归档。", "已验证的变更和记录一起归档，接下来可提交代码。"),
        ],
    }
    outputs = []
    mono = ImageFont.truetype(FONT_MONO, 22)
    mono_small = ImageFont.truetype(FONT_MONO, 17)
    text_font = ImageFont.truetype(FONT_TEXT, 20)
    bold = ImageFont.truetype(FONT_BOLD, 29)
    for lang in ("en", "zh"):
        title_font = ImageFont.truetype(FONT_ZH, 33) if lang == "zh" else bold
        caption_font = ImageFont.truetype(FONT_ZH, 23) if lang == "zh" else text_font
        footer_font = ImageFont.truetype(FONT_ZH, 18) if lang == "zh" else ImageFont.truetype(FONT_TEXT, 16)
        frames, durations = [], []
        for step, records in enumerate(scenes):
            terminal = []
            for record in records:
                if terminal:
                    terminal.append(("", "output"))
                command = record['display']
                # Quote the multiword --now value as a real shell command.
                if "--now No change in flight." in command:
                    command = command.replace("--now No change in flight.", '--now "No change in flight."')
                terminal.extend(wrap_line("$ " + command, mono, 1020, "command"))
                for line in record['stdout_stderr'].splitlines():
                    terminal.extend(wrap_line(line, mono, 1020, "output"))
            if len(terminal) > 13:
                raise RuntimeError(f"Scene {step + 1}: {len(terminal)} lines exceed terminal capacity")
            command_lines = 1
            while command_lines < len(terminal) and terminal[command_lines][1] == 'command':
                command_lines += 1
            for reveal, duration in ((command_lines, 650), (max(command_lines, len(terminal) // 2), 750), (len(terminal), 4100)):
                canvas = Image.new("RGB", (WIDTH, HEIGHT), "#f6f1e8")
                draw = ImageDraw.Draw(canvas)
                draw.rounded_rectangle((36, 27, 47, 56), radius=5, fill="#ad7149")
                draw.text((59, 24), "keelson", font=bold, fill="#182c40")
                top = "ONE FIX, FROM CHECK TO CLOSE" if lang == "en" else "一个修复，从检查到归档"
                top_font = ImageFont.truetype(FONT_ZH, 19) if lang == "zh" else ImageFont.truetype(FONT_TEXT, 15)
                draw.text((WIDTH - 38 - draw.textlength(top, font=top_font), 34), top, font=top_font, fill="#686b70")
                draw.rounded_rectangle((36, 86, 1124, 533), radius=17, fill="#112235")
                for x, color in ((62, "#788697"), (80, "#788697"), (98, "#788697")):
                    draw.ellipse((x, 106, x + 8, 114), fill=color)
                draw.text((125, 98), "title-example  /  recorded terminal output", font=mono_small, fill="#a8b4c2")
                label = f"{step + 1:02d} / 06"
                draw.text((1010, 98), label, font=mono_small, fill="#a8b4c2")
                draw.line((58, 132, 1102, 132), fill="#34465a", width=1)
                for index, (line, kind) in enumerate(terminal[:reveal]):
                    color = "#efc7a7" if kind == "command" else "#e6ece6"
                    if kind == "output" and ("FAIL" in line or "✗" in line or "cannot land" in line or "verification failed" in line):
                        color = "#f6b998"
                    if kind == "output" and ("PASS" in line or "✓" in line or "ready →" in line):
                        color = "#b5e8c6"
                    draw.text((59, 149 + index * 28), line, font=mono, fill=color)
                for i in range(6):
                    x = 37 + i * 183
                    draw.rounded_rectangle((x, 551, x + 169, 556), radius=2, fill="#ad7149" if i <= step else "#dbd3c7")
                title, subtitle = captions[lang][step]
                if draw.textlength(title, font=title_font) > 1088 or draw.textlength(subtitle, font=caption_font) > 1088:
                    raise RuntimeError("Caption exceeds canvas")
                draw.text((36, 577), title, font=title_font, fill="#182c40")
                draw.text((37, 627), subtitle, font=caption_font, fill="#5d646c")
                footer = ("Real CLI output · preconfigured example · code edited explicitly · playback timing edited"
                          if lang == "en" else "真实 CLI 输出 · 预配置示例 · 显式编辑代码 · 已调整播放节奏")
                draw.text((37, 693), footer, font=footer_font, fill="#73706b")
                frames.append(canvas)
                durations.append(duration)
            if step in (0, 2, 3, 4, 5):
                frames[-1].save(evidence / f"frame-{lang}-{step + 1}.png")
        filename = "keelson-demo.gif" if lang == "en" else "keelson-demo-zh.gif"
        destination = ASSETS / filename
        palette_source = Image.new("RGB", (290 * 6, 185 * 3))
        for index, frame in enumerate(frames):
            palette_source.paste(frame.resize((290, 185)), ((index % 6) * 290, (index // 6) * 185))
        palette = palette_source.quantize(colors=128, method=0)
        indexed = [frame.quantize(palette=palette, dither=0) for frame in frames]
        indexed[0].save(destination, save_all=True, append_images=indexed[1:], duration=durations,
                        loop=0, optimize=True, disposal=1)
        with Image.open(destination) as gif:
            actual_duration = 0
            for i in range(gif.n_frames):
                gif.seek(i)
                actual_duration += gif.info['duration']
            # Decode the final GIF itself for visual review, not only source frames.
            gif.seek(gif.n_frames - 1)
            gif.convert("RGB").save(evidence / f"decoded-final-{lang}.png")
            outputs.append({"path": str(destination.relative_to(ROOT)), "width": gif.width,
                            "height": gif.height, "frames": gif.n_frames, "duration_seconds": actual_duration / 1000,
                            "bytes": destination.stat().st_size})
    return outputs


def wrap_line(line, font, width, kind):
    if not line:
        return [("", kind)]
    remaining, lines = line, []
    while font.getlength(remaining) > width:
        count = int(width / font.getlength("M"))
        cut = remaining.rfind(" ", 0, count + 1)
        if cut < max(8, count // 2):
            cut = count
        lines.append((remaining[:cut], kind))
        remaining = "  " + remaining[cut:].lstrip()
    lines.append((remaining, kind))
    return lines


if __name__ == "__main__":
    main()
