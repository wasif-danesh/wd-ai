"""The README's URL table is generated from scripts/urls.py; this fails when they drift apart."""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def test_the_readme_url_table_matches_the_script():
    expected = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "urls.py"), "--markdown"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()  # fmt: skip
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    block = re.search(r"<!-- urls:start -->\n(.*?)\n<!-- urls:end -->", readme, re.S)
    assert block, "README.md lost its <!-- urls:start --> block"
    assert block.group(1).strip() == expected, (
        "run: python scripts/urls.py --markdown and paste it in the README"
    )


def test_every_service_has_a_name_and_a_url_in_some_mode():
    sys.path.insert(0, str(ROOT / "scripts"))
    import urls

    for name, _what, compose, cmd, kind_url, _notes in urls.SERVICES:
        assert name and (compose or kind_url), name
        assert not cmd or kind_url, f"{name}: a port-forward needs the URL it opens"
