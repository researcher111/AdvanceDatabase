#!/usr/bin/env python3
"""Verify website download links and, optionally, the files served by GitHub Pages.

    python3 scripts/check_downloads.py          # local links and tracked files
    python3 scripts/check_downloads.py --live   # also compare published bytes

The working tree is the expected content. Publish pending changes and wait for
the Pages deployment before expecting --live to pass. No files are modified.
"""
from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
from html.parser import HTMLParser
from pathlib import Path
import subprocess
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://researcher111.github.io/AdvanceDatabase/"


class DownloadLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "a" and "download" in attributes:
            self.links.append(attributes.get("href", ""))


def inventory():
    tracked = set(subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0"))
    pages, files, errors = set(), set(), []
    link_count = 0
    base = urlsplit(SITE)
    for name in sorted(tracked):
        if not name.endswith(".html"):
            continue
        page = ROOT / name
        parser = DownloadLinks()
        parser.feed(page.read_text(encoding="utf-8"))
        for href in parser.links:
            link_count += 1
            pages.add(name)
            url = urlsplit(urljoin(SITE + quote(name), href))
            if not href or url.netloc != base.netloc or not url.path.startswith(base.path):
                errors.append(f"{name}: download is not a file in this course repository: {href!r}")
                continue
            relative = unquote(url.path[len(base.path):])
            target = (ROOT / relative).resolve()
            if not target.is_relative_to(ROOT) or relative not in tracked or not target.is_file():
                errors.append(f"{name}: download is missing or untracked: {href!r}")
                continue
            files.add(relative)
    return link_count, pages, files, errors


def check_live(relative):
    request = Request(SITE + quote(relative), headers={"User-Agent": "course-download-check/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            actual = response.read()
        expected = (ROOT / relative).read_bytes()
        if actual != expected:
            digest = lambda data: hashlib.sha256(data).hexdigest()[:12]
            return (f"DIFF {relative}: website SHA256 {digest(actual)}, "
                    f"working tree {digest(expected)}")
    except (OSError, ValueError) as error:
        return f"ERROR {relative}: {error}"
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--live", action="store_true", help="fetch public downloads and their linking pages")
    args = parser.parse_args()
    count, pages, files, errors = inventory()
    print(f"{count} download links; {len(files)} distinct files; {len(pages)} linking pages.")
    if args.live and not errors:
        # Checking linking pages also detects a deployed page with stale links.
        with ThreadPoolExecutor(max_workers=6) as pool:
            errors.extend(result for result in pool.map(check_live, sorted(files | pages)) if result)
    if errors:
        for error in errors:
            print(error)
        raise SystemExit(1)
    print("All download targets exist and are tracked in this repository.")
    if args.live:
        print("All published downloads and linking pages match the working tree byte-for-byte.")


if __name__ == "__main__":
    main()
