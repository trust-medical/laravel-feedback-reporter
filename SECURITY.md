# Security Policy

## Supported Versions

We actively provide security patches and dependency updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within `laravel-feedback-reporter`, please report it responsibly:

1. **GitHub Private Vulnerability Reporting**: Use the "Report a vulnerability" button under the **Security** tab of the repository.
2. **Email**: Alternatively, send an email to `dev@trustmedical.example.com` with:
   - A clear description of the vulnerability.
   - Step-by-step instructions or a minimal proof of concept (PoC) to reproduce the issue.
   - Affected versions and environments.

### Response Timeline
- **Acknowledgement**: Within 48 hours.
- **Assessment & Triage**: Within 5 business days.
- **Fix & Advisory Release**: Coordinated release with CVE assignment where appropriate.

## Supply Chain Security Practices

To safeguard users and downstream applications from supply chain attacks, this project enforces:
- **Dependency Auditing**: Automated `composer audit` and `npm audit` on every commit and pull request.
- **CI/CD Least Privilege**: GitHub Actions runs with read-only permissions (`permissions: contents: read`) by default.
- **Action Pinning**: All third-party GitHub Actions are pinned to immutable commit SHAs.
- **Strict Plugin Allowlisting**: Composer plugins are strictly allowlisted; unauthorized plugin execution is denied.
- **Continuous Monitoring**: Dependabot automates security advisory monitoring and timely dependency updates across Composer, npm, and GitHub Actions.
