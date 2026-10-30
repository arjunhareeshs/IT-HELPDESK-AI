"""
Test all project requirements are installed and importable in server/.venv
"""

modules_to_test = [
    # 1. FastAPI Backend & DB
    ("FastAPI", "fastapi"),
    ("Uvicorn", "uvicorn"),
    ("Pydantic", "pydantic"),
    ("Pydantic Settings", "pydantic_settings"),
    ("SQLAlchemy", "sqlalchemy"),
    ("Psycopg2 (PostgreSQL)", "psycopg2"),
    ("AsyncPG (Async DB)", "asyncpg"),
    ("Alembic (DB Migrations)", "alembic"),
    ("HTTPX", "httpx"),
    ("Requests", "requests"),
    ("Python-Dotenv", "dotenv"),
    ("Python-Multipart (File Uploads)", "multipart"),
    ("Pillow (Image Processing)", "PIL"),

    # 2. ML Classifier & Transformers
    ("PyTorch", "torch"),
    ("Transformers", "transformers"),
    ("Tokenizers", "tokenizers"),
    ("SentencePiece", "sentencepiece"),
    ("SafeTensors", "safetensors"),
    ("Accelerate (HF)", "accelerate"),
    ("NumPy", "numpy"),

    # 3. LangChain & Groq AI
    ("LangChain", "langchain"),
    ("LangChain Core", "langchain_core"),
    ("LangChain Community", "langchain_community"),
    ("LangChain Groq", "langchain_groq"),
    ("Groq SDK", "groq"),
    ("SQLGlot", "sqlglot"),

    # 4. Email Connection & Processing
    ("IMAPlib (Standard Library)", "imaplib"),
    ("SMTPClient (Standard Library)", "smtplib"),
    ("Email (Standard Library)", "email"),
    ("AioSMTPClient (Async SMTP)", "aiosmtplib"),
    ("Email Validator", "email_validator"),
    ("BeautifulSoup4 (HTML Email Parser)", "bs4"),

    # 5. Testing
    ("Pytest", "pytest"),
    ("Pytest-AsyncIO", "pytest_asyncio"),
]

all_passed = True
print("=" * 65)
print("TESTING ALL REQUIRED PACKAGES IN SERVER VIRTUAL ENVIRONMENT")
print("=" * 65)

for label, mod_name in modules_to_test:
    try:
        mod = __import__(mod_name)
        ver = getattr(mod, "__version__", "Built-in / Available")
        print(f"  [OK] {label:<35} (Version: {ver})")
    except Exception as e:
        all_passed = False
        print(f"  [FAIL] {label:<35} -> {e}")

print("=" * 65)
if all_passed:
    print("ALL 28 REQUIREMENTS SUCCESSFULLY VERIFIED IN SERVER ENVIRONMENT!")
else:
    print("SOME REQUIREMENTS FAILED!")
print("=" * 65)

