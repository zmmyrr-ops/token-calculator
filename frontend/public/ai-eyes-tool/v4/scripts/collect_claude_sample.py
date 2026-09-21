#!/usr/bin/env python3
"""Read only supported Claude Code CLI transcripts; never evaluate transcript content."""
import argparse, hashlib, json, os, sys
from pathlib import Path
from collect_sample import stamp, clean, select_samples

def collect(home, start, end, current=None):
    root = Path(home).resolve()
    folder = root / 'projects'
    if not folder.is_dir() or folder.is_symlink():
        raise ValueError('unsupported')
    sources = []
    recognized = False
    # Only primary CLI session files. Subagents, memory and config are out of scope.
    for project in folder.iterdir():
        if not project.is_dir() or project.is_symlink(): continue
        for path in project.glob('*.jsonl'):
            if path.is_symlink() or root not in path.resolve().parents: continue
            messages = []
            try:
                if path.stat().st_size > 32*1024*1024: continue
                with path.open(encoding='utf8') as stream:
                    for line in stream:
                        if len(line) > 1024*1024: continue
                        try: event = json.loads(line)
                        except json.JSONDecodeError: continue
                        if not isinstance(event, dict): continue
                        session = event.get('sessionId')
                        message = event.get('message')
                        if not isinstance(session, str) or not isinstance(message, dict): continue
                        recognized = True
                        if current and session == current:
                            messages = []; break
                        if event.get('isSidechain') or event.get('isMeta'): continue
                        if event.get('type') != 'user' or message.get('role') != 'user': continue
                        content = message.get('content')
                        if isinstance(content, list):
                            # Tool results and mixed tool messages are not human prompts.
                            if any(not isinstance(b, dict) or b.get('type') != 'text' for b in content): continue
                            content = '\n'.join(b.get('text', '') for b in content if isinstance(b.get('text'), str))
                        if not isinstance(content, str): continue
                        # Always exclude this tool's execution sessions, including when no session ID is exposed.
                        if 'AI_EYES_EXECUTION_V4' in content:
                            messages = []; break
                        timestamp = stamp(event.get('timestamp'))
                        if timestamp is None or not start <= timestamp <= end: continue
                        if content.lstrip().startswith(('<', 'This session is being continued', 'This is a continuation')): continue
                        text = clean(content)
                        if not 2 <= len(text) <= 2000: continue
                        messages.append((timestamp, hashlib.sha256(text.encode()).hexdigest(), text))
            except (OSError, UnicodeError): continue
            if messages: sources.append((max(m[0] for m in messages), messages))
    if not recognized: raise ValueError('unsupported')
    return select_samples(sources)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--scope', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--current-thread')
    p.add_argument('--home', default=os.environ.get('CLAUDE_CONFIG_DIR', str(Path.home()/'.claude')))
    a = p.parse_args()
    scope = json.loads(Path(a.scope).read_text())
    if scope.get('source') != 'claude_code': raise ValueError('unsupported')
    start, end = stamp(scope['start']), stamp(scope['end'])
    if start is None or end is None or end < start or end-start > 30*86400+1: raise ValueError('invalid scope')
    result = collect(a.home, start, end, a.current_thread)
    fd = os.open(a.output, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f: json.dump(result, f, ensure_ascii=False)
    print(json.dumps({'ok': True, 'sessions': len(result['sessions'])}))

if __name__ == '__main__':
    try: main()
    except (ValueError, PermissionError) as e:
        print(json.dumps({'ok': False, 'code': 'permission_denied' if isinstance(e, PermissionError) else str(e)})); sys.exit(1)
