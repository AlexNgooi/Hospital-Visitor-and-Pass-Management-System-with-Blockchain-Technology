"""Read-only checks for current planning routes; never starts applications or touches databases."""
from pathlib import Path
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
PLANNING = ROOT / "planning"
REQUIRED = ["README.md", "CONTEXT.md", "PROJECT_MAP.md", "01_DEVELOPMENT_PLAN.md", "02_TECHNICAL_ARCHITECTURE.md",
            "03_REQUIREMENTS_AND_TEST_PLAN.md", "04_DATA_MODEL_AND_API_PLAN.md", "05_RISK_REGISTER.md",
            "09_FOLDER_STRUCTURE.md", "10_BASELINE_REVIEW.md", "11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md", "SUI_TESTNET.md"]
errors = []
for name in REQUIRED:
    if not (PLANNING / name).is_file():
        errors.append(f"Missing current planning entry: {name}")

# Check every current Markdown route, including the active runtime/test documents it references.
files = list(PLANNING.rglob("*.md")) + [ROOT / name for name in [
    "AGENTS.md", "CONTEXT.md", "Implementation/CONTEXT.md", "Implementation/backend/README.md",
    "Implementation/backend/LOCAL_TESTING.md", "Implementation/frontend/README.md", "Implementation/infra/README.md",
    "Implementation/docs/runbooks/MANUAL_NATIVE.md", "Implementation/docs/runbooks/MANUAL_R01_R03.md"]]
for path in files:
    text = path.read_text(encoding="utf-8")
    for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)", text):
        if target.startswith(("https://", "http://", "mailto:", "#")):
            continue
        route = unquote(target.split("#", 1)[0].strip("<>"))
        if route and not (path.parent / route).exists():
            errors.append(f"Broken route in {path.relative_to(ROOT)}: {route}")
    if "planning/diagrams/v3/" in text or "Docker Engine" in text or "Testcontainers" in text:
        errors.append(f"Obsolete infrastructure/diagram instruction in {path.relative_to(ROOT)}")

# Explicit dependencies and launch commands are scanned separately from immutable historical evidence.
active = list((ROOT / "Implementation/backend/src").rglob("*.java"))
active += list((ROOT / "Implementation/frontend/tests").rglob("*.mjs"))
active += list((ROOT / "Implementation/scripts").glob("*.mjs"))
active += [ROOT / "Implementation/backend/pom.xml"]
for path in active:
    text = path.read_text(encoding="utf-8")
    if re.search(r"org\.testcontainers|(?:exec|spawn|execFile)\s*\(\s*['\"]docker['\"]|docker\s+compose", text):
        errors.append(f"Retired infrastructure dependency in {path.relative_to(ROOT)}")

if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(files)} current documents and {len(active)} source/config files checked; no service or database operations.")
