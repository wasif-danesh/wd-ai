# Tests run without sign-in unless a test asks for it (ADR-0030); the API default is "jwt".
import os

os.environ.setdefault("AUTH_MODE", "stub")
