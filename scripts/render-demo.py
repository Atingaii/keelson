#!/usr/bin/env python3
"""Render a recorded agent conversation; never execute an agent or demo project.

Usage: python3 scripts/render-demo.py --source docs/assets/demo-session.json
Development dependencies: Python 3, Pillow; Ubuntu fonts-dejavu-core and
fonts-wqy-zenhei. Override font paths with KEELSON_DEMO_FONT_LATIN,
KEELSON_DEMO_FONT_BOLD and KEELSON_DEMO_FONT_ZH when using another system.

Source schema:
  {"locales": {"zh": {"scenes": [{"label": "...", "user": "...",
    "assistant": "...", "activity": "...", "result": "..."}], "note": "..."},
    "en": {"scenes": [...], "note": "English translation of ..."}},
   "provenance": {"...": "source session and evidence references"}}

user/assistant are verbatim excerpts, or explicitly disclosed translations.
An empty user/assistant string continues the existing conversation. Optional
activity/result fields contain evidence-backed summaries (strings or lists),
rendered distinctly from quoted messages. The order is user, assistant,
activity, result. Excerpt selection and truthfulness belong to the source;
the renderer neither invents nor summarizes text. It only wraps and scrolls
complete lines. All waiting and typing durations are edited playback.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import uuid

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1160, 800
LEFT, TEXT_WIDTH = 66, 1026
BODY_TOP, LINE_HEIGHT, VISIBLE_ROWS = 165, 41, 13
COLORS = {
    'paper': '#f6f1e8', 'ink': '#172b40', 'copper': '#ad7149',
    'terminal': '#112235', 'rule': '#34465a', 'muted': '#a3b1c0',
    'user': '#f0c2a0', 'assistant': '#f2eee8', 'activity': '#acbdcb',
    'result': '#bbd8c4', 'footer': '#74706a',
}
FONT_LATIN = os.environ.get('KEELSON_DEMO_FONT_LATIN', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
FONT_BOLD = os.environ.get('KEELSON_DEMO_FONT_BOLD', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
FONT_ZH = os.environ.get('KEELSON_DEMO_FONT_ZH', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc')


def load_source(path):
    source = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(source.get('provenance'), dict) or not source['provenance']:
        raise ValueError('Source must include nonempty provenance; this renderer does not create a session.')
    locales = source.get('locales', {})
    if set(locales) != {'en', 'zh'}:
        raise ValueError('Source must contain both locales.en and locales.zh.')
    for lang, locale in locales.items():
        scenes = locale.get('scenes')
        if not isinstance(scenes, list) or not scenes:
            raise ValueError(f'{lang}: provide at least one scene.')
        if not isinstance(locale.get('note', ''), str):
            raise ValueError(f'{lang}.note must be a string.')
        for index, scene in enumerate(scenes):
            for key in ('label', 'user', 'assistant'):
                if not isinstance(scene.get(key), str):
                    raise ValueError(f'{lang}.scenes[{index}].{key} must be a string (empty is allowed for continuation).')
            for key in ('activity', 'result'):
                value = scene.get(key, '')
                if not isinstance(value, str) and not (isinstance(value, list) and all(isinstance(v, str) for v in value)):
                    raise ValueError(f'{lang}.scenes[{index}].{key} must be a string or a list of strings.')
            if not any(scene.get(key) for key in ('user', 'assistant', 'activity', 'result')):
                raise ValueError(f'{lang}.scenes[{index}] has no content.')
    return source


def fonts_for(lang):
    family = FONT_ZH if lang == 'zh' else FONT_LATIN
    return {
        'body': ImageFont.truetype(family, 30),
        'small': ImageFont.truetype(family, 23),
        'label': ImageFont.truetype(family, 19),
        'footer': ImageFont.truetype(family, 15),
        'brand': ImageFont.truetype(FONT_BOLD, 31),
    }


def wrap(text, font, width):
    """Preserve explicit line breaks and all non-whitespace characters."""
    rows = []
    for paragraph in text.split('\n'):
        if not paragraph:
            rows.append('')
            continue
        remaining = paragraph
        while font.getlength(remaining) > width:
            low, high = 1, len(remaining)
            while low < high:
                middle = (low + high + 1) // 2
                if font.getlength(remaining[:middle]) <= width:
                    low = middle
                else:
                    high = middle - 1
            cut = low
            space = remaining.rfind(' ', 0, cut + 1)
            if space > cut // 2:
                cut = space
            if cut < 1 or font.getlength(remaining[:cut]) > width:
                raise ValueError('A glyph is wider than the text area.')
            rows.append(remaining[:cut])
            remaining = remaining[cut:].lstrip(' ')
        rows.append(remaining)
    return rows


def rows_for(blocks, fonts, lang):
    rows = []
    for kind, text in blocks:
        if rows:
            rows.append(('', 'gap', 0))
        if kind == 'assistant':
            rows.append(('Agent', 'label', 0))
        elif kind == 'activity':
            rows.append(('工作记录（摘要）' if lang == 'zh' else 'Activity summary', 'label', 0))
        elif kind == 'result':
            rows.append(('结果（摘要）' if lang == 'zh' else 'Result summary', 'label', 0))
        font = fonts['small'] if kind in ('activity', 'result') else fonts['body']
        indent = 35 if kind == 'user' else 0
        for index, row in enumerate(wrap(text, font, TEXT_WIDTH - indent)):
            rows.append((('> ' if index == 0 else '  ') + row if kind == 'user' else row, kind, 0))
    return rows


def events_for(locale, lang):
    """Progressively append messages to one continuous conversation."""
    events, completed = [], []
    for scene_index, scene in enumerate(locale['scenes']):
        for kind in ('user', 'assistant', 'activity', 'result'):
            value = scene.get(kind, '')
            text = '\n'.join(value) if isinstance(value, list) else value
            if not text:
                continue
            # Around 100 text updates per language: natural progression without
            # thousands of nearly identical GIF frames or single-letter flicker.
            chunk = 7 if lang == 'zh' else 14
            if kind in ('activity', 'result'):
                chunk *= 2
            for end in range(chunk, len(text), chunk):
                events.append({'scene': scene_index, 'blocks': completed + [(kind, text[:end])],
                               'weight': 1.0, 'typing': kind in ('user', 'assistant')})
            completed = completed + [(kind, text)]
            hold = {'user': 14, 'assistant': 23, 'activity': 12, 'result': 26}[kind]
            events.append({'scene': scene_index, 'blocks': completed.copy(), 'weight': hold, 'typing': False})
    events[-1]['weight'] += 24
    return events


def duration_list(events, seconds):
    ticks = round(seconds * 100)
    total = sum(event['weight'] for event in events)
    durations = [max(5, round(ticks * event['weight'] / total)) for event in events]
    difference = ticks - sum(durations)
    longest = max(range(len(events)), key=lambda i: durations[i])
    durations[longest] += difference
    if durations[longest] < 5:
        raise ValueError('Too much text for this duration; use shorter faithful excerpts or a longer duration.')
    return [value * 10 for value in durations]


def draw_frame(locale, lang, event, fonts):
    canvas = Image.new('RGB', (WIDTH, HEIGHT), COLORS['paper'])
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((34, 26, 44, 59), radius=4, fill=COLORS['copper'])
    draw.text((58, 23), 'keelson', font=fonts['brand'], fill=COLORS['ink'])
    tagline = '在仓库里，对话就能开始。' if lang == 'zh' else 'Start with a conversation in your repo.'
    draw.text((WIDTH - 35 - fonts['label'].getlength(tagline), 36), tagline,
              font=fonts['label'], fill=COLORS['footer'])
    draw.rounded_rectangle((32, 90, 1128, 725), radius=18, fill=COLORS['terminal'])
    for x in (58, 76, 94):
        draw.ellipse((x, 113, x + 7, 120), fill='#728398')
    panel_label = '当前仓库' if lang == 'zh' else 'workspace'
    draw.text((121, 104), panel_label, font=fonts['label'], fill=COLORS['muted'])
    label = locale['scenes'][event['scene']]['label']
    if fonts['label'].getlength(label) > 650:
        raise ValueError(f'Scene label is too wide: {label}')
    draw.text((1092 - fonts['label'].getlength(label), 104), label,
              font=fonts['label'], fill=COLORS['user'])
    draw.line((56, 143, 1104, 143), fill=COLORS['rule'], width=1)
    rows = rows_for(event['blocks'], fonts, lang)
    start = max(0, len(rows) - VISIBLE_ROWS)
    # Scroll only by complete rows. No raster clipping or cut-off glyphs.
    visible = rows[start:]
    if start:
        draw.text((1076, 141), '↑', font=fonts['label'], fill=COLORS['muted'])
    for index, (line, kind, _) in enumerate(visible):
        if kind == 'gap':
            continue
        font = fonts['label'] if kind == 'label' else fonts['small'] if kind in ('activity', 'result') else fonts['body']
        color = COLORS['muted'] if kind == 'label' else COLORS[kind]
        x, y = LEFT, BODY_TOP + index * LINE_HEIGHT
        bbox = draw.textbbox((x, y), line, font=font)
        if bbox[2] > 1102 or bbox[3] > 711:
            raise ValueError(f'Text would exceed the conversation viewport: {line!r}, bbox={bbox}')
        draw.text((x, y), line, font=font, fill=color)
        if event['typing'] and index == len(visible) - 1 and font.getlength(line) < TEXT_WIDTH - 22:
            caret_x = x + font.getlength(line) + 5
            draw.rectangle((caret_x, y + 10, caret_x + 2, y + 33), fill=COLORS['user'])
    footer = ('真实 Agent 会话回放 · 等待已压缩' if lang == 'zh'
              else 'Real agent session replay · waits shortened')
    if locale.get('note'):
        footer += ' · ' + locale['note']
    footer_rows = wrap(footer, fonts['footer'], 1092)
    if len(footer_rows) > 2:
        raise ValueError(f'{lang}: source note is too long for the footer.')
    for index, row in enumerate(footer_rows):
        draw.text((34, 750 + index * 21), row, font=fonts['footer'], fill=COLORS['footer'])
    return canvas


def render(locale, lang, destination, evidence, seconds):
    fonts = fonts_for(lang)
    events = events_for(locale, lang)
    durations = duration_list(events, seconds)
    frames = [draw_frame(locale, lang, event, fonts) for event in events]
    palette_sheet = Image.new('RGB', (580 * 4, 400 * 4))
    for index in range(16):
        frame_index = round(index * (len(frames) - 1) / 15)
        palette_sheet.paste(frames[frame_index].resize((580, 400)), ((index % 4) * 580, (index // 4) * 400))
    palette = palette_sheet.quantize(colors=128, method=0)
    indexed = [frame.quantize(palette=palette, dither=0) for frame in frames]
    indexed[0].save(destination, save_all=True, append_images=indexed[1:], duration=durations,
                    optimize=True, loop=0, disposal=1)
    with Image.open(destination) as gif:
        actual_duration = 0
        sample_indices = {round(i * (gif.n_frames - 1) / 5) for i in range(6)}
        for index in range(gif.n_frames):
            gif.seek(index)
            actual_duration += gif.info['duration']
            if index in sample_indices:
                gif.convert('RGB').save(evidence / f'decoded-{lang}-{index:03d}.png')
        return {'path': str(destination), 'width': gif.width, 'height': gif.height,
                'frames': gif.n_frames, 'duration_seconds': actual_duration / 1000,
                'bytes': destination.stat().st_size,
                'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--source', required=True, type=Path, help='Committed JSON containing actual message excerpts and provenance.')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'docs/assets')
    parser.add_argument('--evidence-dir', type=Path, help='Preserve decoded samples and the render summary here.')
    parser.add_argument('--duration', type=float, default=40, help='Edited playback duration per language, 30–45 seconds.')
    parser.add_argument('--validate-only', action='store_true', help='Check every frame layout without writing GIFs.')
    args = parser.parse_args()
    if not 30 <= args.duration <= 45:
        parser.error('--duration must be between 30 and 45 seconds.')
    source = load_source(args.source)
    if args.validate_only:
        for lang, locale in source['locales'].items():
            fonts = fonts_for(lang)
            events = events_for(locale, lang)
            duration_list(events, args.duration)
            for event in events:
                draw_frame(locale, lang, event, fonts)
            print(f'{lang}: {len(events)} frames validated; all rows fit; no files written.')
        return
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:6]
    # No git or AI subprocess is needed; external users may choose another path.
    evidence = args.evidence_dir or ROOT / '.git/keelson-task-evidence/readme-demo' / ('conversation-' + run_id)
    evidence.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for lang in ('en', 'zh'):
        filename = 'keelson-demo-zh.gif' if lang == 'zh' else 'keelson-demo.gif'
        results.append(render(source['locales'][lang], lang, args.output_dir / filename, evidence, args.duration))
    summary = {'source': str(args.source.resolve()), 'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
               'provenance': source['provenance'], 'mode': 'Offline replay of selected real message excerpts; edited waiting and typing durations.',
               'artifacts': results, 'visual_review': 'Decoded samples provided; human review must be performed separately.'}
    (evidence / 'render-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'evidence': str(evidence), 'artifacts': results}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
