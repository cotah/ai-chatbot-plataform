# Security Checklist

## Environment Variables

- [ ] All secrets stored in environment variables
- [ ] `.env` file in `.gitignore`
- [ ] No API keys in code or version control
- [ ] Environment variables validated on startup
- [ ] Different keys for development/production

## API Security

- [ ] Rate limiting enabled on all endpoints
- [ ] CORS configured correctly (not `*` in production)
- [ ] Helmet security headers enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (if using database)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (if using cookies)

## Authentication & Authorization

- [ ] Session management implemented
- [ ] API key validation (if using)
- [ ] No sensitive data in session tokens
- [ ] Session expiration configured
- [ ] Secure session storage (Redis in production)

## Payment Security

- [ ] Stripe handled entirely server-side
- [ ] Payment Intents used (not direct charges)
- [ ] Webhook signature verification
- [ ] No card data in frontend or logs
- [ ] PCI compliance considerations

## Data Privacy

- [ ] No PII in logs
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policies
- [ ] Secure data transmission (HTTPS)
- [ ] Data encryption at rest (if storing sensitive data)

## External API Security

- [ ] API keys rotated regularly
- [ ] Least privilege access (minimal scopes)
- [ ] Webhook signature verification
- [ ] Timeout configuration for external calls
- [ ] Error handling doesn't expose sensitive info

## Infrastructure Security

- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] DDoS protection (if applicable)
- [ ] Backup encryption

## Logging & Monitoring

- [ ] Structured logging
- [ ] No secrets in logs
- [ ] Error tracking configured
- [ ] Security event monitoring
- [ ] Log retention policies

## Code Security

- [ ] Dependencies regularly updated
- [ ] Security audits (npm audit)
- [ ] No hardcoded credentials
- [ ] Code review process
- [ ] Dependency vulnerability scanning

## Deployment Security

- [ ] Production secrets in secure vault
- [ ] CI/CD pipeline security
- [ ] Deployment access control
- [ ] Rollback procedures
- [ ] Health check endpoints

## Incident Response

- [ ] Incident response plan
- [ ] Logging for forensics
- [ ] Alerting configured
- [ ] Backup and recovery tested

## Regular Security Tasks

- [ ] Monthly dependency updates
- [ ] Quarterly security review
- [ ] Annual penetration testing (if applicable)
- [ ] Regular API key rotation
- [ ] Security training for team

