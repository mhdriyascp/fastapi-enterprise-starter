{

  "email": "john@example.com",

  "password": "MySecurePassword123!"

}


docker start crm-postgres crm-pgadmin

# project Tree View
tree -I '.git|.venv|__pycache__|.pytest_cache|.mypy_cache'

# File Indentation issue fix using ruff
uv run ruff check app/seeds/rbac -- checking 
uv run ruff check app/seeds/rbac/permissions.py --fix

# Seed Exicute Cmd
uv run python -m app.seeds

# Check any issues
uv run ruff check app


