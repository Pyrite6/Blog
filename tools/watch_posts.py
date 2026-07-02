from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "posts"
BUILD_SCRIPT = ROOT / "tools" / "build_posts.py"
POLL_SECONDS = 1.0


def snapshot_files() -> dict[str, tuple[int, int]]:
    state: dict[str, tuple[int, int]] = {}
    for path in POSTS_DIR.rglob("*.md"):
        stat = path.stat()
        state[str(path.relative_to(ROOT))] = (stat.st_mtime_ns, stat.st_size)
    return state


def run_build() -> bool:
    print("[watch] rebuilding post data...")
    result = subprocess.run(
      [sys.executable, str(BUILD_SCRIPT)],
      cwd=ROOT,
      check=False,
    )
    if result.returncode == 0:
      print("[watch] rebuild complete.")
      return True

    print(f"[watch] rebuild failed with exit code {result.returncode}.")
    return False


def main() -> None:
    print(f"[watch] watching {POSTS_DIR} for Markdown changes")
    previous = snapshot_files()
    run_build()

    try:
        while True:
            time.sleep(POLL_SECONDS)
            current = snapshot_files()
            if current == previous:
                continue

            added = sorted(set(current) - set(previous))
            removed = sorted(set(previous) - set(current))
            changed = sorted(
                path for path in current.keys() & previous.keys() if current[path] != previous[path]
            )

            for path in added:
                print(f"[watch] added: {path}")
            for path in changed:
                print(f"[watch] changed: {path}")
            for path in removed:
                print(f"[watch] removed: {path}")

            previous = current
            run_build()
    except KeyboardInterrupt:
        print("\n[watch] stopped.")


if __name__ == "__main__":
    main()
