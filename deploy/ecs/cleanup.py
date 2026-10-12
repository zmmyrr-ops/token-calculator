#!/usr/bin/env python3
"""Remove only obsolete Mendao image tags. Dry run unless --apply is supplied."""
import argparse
import fcntl
import json
import re
import subprocess
from pathlib import Path

ROOT = Path('/opt/mendao')
REPOS = {'mendao-frontend', 'mendao-backend'}
SHA = re.compile(r'^[a-f0-9]{40}$')


def docker(*args):
    return subprocess.check_output(['docker', *args], universal_newlines=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    with (ROOT / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        protected = set()
        for env in ('production', 'staging'):
            for suffix in ('', '.previous'):
                file = ROOT / env / ('release.env' + suffix)
                if not file.exists():
                    if not suffix:
                        raise RuntimeError('Missing current release config: ' + str(file))
                    continue
                releases = re.findall(r'^RELEASE_ID=([a-f0-9]{40})$', file.read_text(), re.M)
                if len(releases) != 1:
                    raise RuntimeError('Invalid release config: ' + str(file))
                protected.update(releases)
        container_ids = docker('ps', '-aq').split()
        active_images = set()
        if container_ids:
            active_images = {c['Image'] for c in json.loads(docker('inspect', *container_ids))}
        refs = sorted(set(docker('image', 'ls', '--format', '{{.Repository}}:{{.Tag}}').split()))
        refs = [r for r in refs if r.split(':')[0] in REPOS and SHA.fullmatch(r.split(':')[1])]
        images = json.loads(docker('image', 'inspect', *refs)) if refs else []
        dates = {}
        for ref, image in zip(refs, images):
            sha = ref.split(':')[1]
            dates[sha] = max(dates.get(sha, ''), image['Created'])
            if image['Id'] in active_images:
                protected.add(sha)
        protected.update(sorted(dates, key=lambda s: dates[s], reverse=True)[:3])
        candidates = [r for r in refs if r.split(':')[1] not in protected]
        print('Protected releases:', ', '.join(sorted(protected)), flush=True)
        print('Obsolete image tags:', len(candidates), flush=True)
        for ref in candidates:
            if not args.apply:
                print('Would remove', ref)
                continue
            # Never force removal: Docker retains any layers still needed by other images.
            result = subprocess.run(['docker', 'image', 'rm', ref], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)
            print(ref, 'removed' if result.returncode == 0 else 'retained: ' + result.stdout.strip(), flush=True)
        if args.apply:
            remaining = set(docker('image', 'ls', '--format', '{{.Repository}}:{{.Tag}}').split())
            for sha in dates:
                if sha not in protected and not any(repo + ':' + sha in remaining for repo in REPOS):
                    record = ROOT / 'verified' / sha
                    if record.exists():
                        record.unlink()
        print('Cleanup complete; volumes, containers, storage and unrelated images are untouched.', flush=True)


if __name__ == '__main__':
    main()
