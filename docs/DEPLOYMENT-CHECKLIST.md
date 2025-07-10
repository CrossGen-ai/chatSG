# ChatSG Deployment Checklist

## Pre-Deployment (Local)

- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Backend builds without errors: `npm run build`
- [ ] Frontend builds without errors: `npm run build`
- [ ] All tests pass: `npm test`

## Prepare for GitHub

- [ ] Remove all log files: `rm -rf **/logs/* *.log`
- [ ] Remove all database files: `rm -f **/*.db`
- [ ] No .env files in git: `git status`
- [ ] .gitignore updated with all sensitive files
- [ ] All changes committed

## GitHub Setup

- [ ] Repository created (private recommended)
- [ ] Code pushed to main branch
- [ ] Deploy keys added for VM access
- [ ] No secrets in repository

## VM Preparation

- [ ] VM provisioned with required specs (4GB RAM, 20GB disk)
- [ ] SSH access confirmed
- [ ] Domain name pointed to VM IP
- [ ] Firewall rules configured (22, 80, 443 only)

## Initial Setup

- [ ] Run setup-vm.sh script
- [ ] PostgreSQL password changed from default
- [ ] Database connection tested
- [ ] Application cloned to /opt/chatsg

## Configuration

- [ ] .env file created from template
- [ ] Azure AD credentials configured
- [ ] Authority URL updated for GCC High (.us domain)
- [ ] Database connection string updated
- [ ] Session secret generated (strong random value)

## SSL/TLS

- [ ] SSL certificates obtained
- [ ] Certificates installed in correct location
- [ ] nginx configured with SSL
- [ ] HTTPS redirect working

## Deployment

- [ ] Backend dependencies installed
- [ ] Frontend built successfully
- [ ] nginx configuration in place
- [ ] PM2 started and saved
- [ ] Application accessible via HTTPS

## Verification

- [ ] Frontend loads at https://your-domain.gov
- [ ] API health check passes: /api/health
- [ ] Authentication flow works
- [ ] Can create and send messages
- [ ] SSE streaming works

## Security

- [ ] All default passwords changed
- [ ] Firewall enabled and configured
- [ ] Security headers present (check with browser tools)
- [ ] No sensitive data in logs
- [ ] Audit logging enabled

## Post-Deployment

- [ ] Monitoring set up
- [ ] Backup process configured
- [ ] Documentation updated with production URLs
- [ ] Team notified of deployment

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Database backup taken
- [ ] Rollback script ready
- [ ] Team knows rollback procedure