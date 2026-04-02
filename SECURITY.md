# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email the maintainer directly
3. Include: description, steps to reproduce, potential impact

## Security Measures

- All API keys stored in environment variables, never committed
- JWT-based authentication with token rotation
- Rate limiting on all endpoints
- Input validation on all user-facing endpoints
- HTTPS enforced in production
- Dependencies regularly audited with `pip-audit` and `npm audit`
