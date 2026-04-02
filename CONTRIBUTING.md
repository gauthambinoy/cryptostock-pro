# Contributing to CryptoStock Pro

## Getting Started

1. Fork the repository
2. Clone: `git clone https://github.com/YOUR_USERNAME/cryptostock-pro.git`
3. Branch: `git checkout -b feature/your-feature`
4. Install dependencies:
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt
   # Frontend
   cd frontend && npm install
   ```
5. Start: `docker-compose up`

## Code Style

- **Python**: PEP 8, enforced by `ruff`
- **JavaScript/React**: ESLint + Prettier
- **Commits**: Conventional commits (feat:, fix:, docs:)

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure CI passes
4. Request review from maintainers
