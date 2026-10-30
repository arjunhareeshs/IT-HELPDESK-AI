import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parent
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

expected_app_init = str(SERVER_ROOT / "app" / "__init__.py")
if "app" in sys.modules and getattr(sys.modules["app"], "__file__", None) != expected_app_init:
    sys.modules.pop("app", None)
