# Deployment Instructions

## Pre-Deployment Checklist

### 1. Environment Variables
- [ ] All API keys configured
- [ ] Google Service Account set up and shared with Calendar/Sheets
- [ ] Stripe webhook endpoint configured
- [ ] n8n webhook URL configured
- [ ] CORS origin set correctly
- [ ] Log level configured

### 2. Google Services Setup

#### Google Calendar
1. Create a Google Calendar
2. Share it with your service account email (read/write access)
3. Get the Calendar ID (found in calendar settings)
4. Set `GOOGLE_CALENDAR_ID` in environment variables

#### Google Sheets
1. Create a Google Sheet
2. Share it with your service account email (edit access)
3. Get the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
4. Set `GOOGLE_SHEETS_ID` in environment variables
5. Run sheet initialization (or manually add headers):
   - Timestamp
   - Name
   - Phone
   - Email
   - Intent
   - Notes
   - Metadata

### 3. Stripe Setup
1. Create Stripe account
2. Get API keys (use test keys for development)
3. Set up webhook endpoint in Stripe Dashboard
4. Configure webhook to point to: `https://your-domain.com/api/stripe/webhook`
5. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### 4. HeyGen Setup
1. Create HeyGen account
2. Get API key
3. Configure avatar ID (set `HEYGEN_AVATAR_ID` in env)
4. Set `HEYGEN_API_KEY`

### 5. n8n Setup
1. Set up n8n instance (cloud or self-hosted)
2. Create webhook workflow
3. Get webhook URL
4. Set `N8N_WEBHOOK_URL`

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo>
   cd ai-chatbot-platform/backend

   # Install dependencies
   npm install --production

   # Set up environment variables
   cp .env.example .env
   nano .env  # Edit with your values

   # Start with PM2
   pm2 start src/server.js --name chatbot-api
   pm2 save
   pm2 startup
   ```

3. **Nginx Reverse Proxy** (optional but recommended)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["node", "src/server.js"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     api:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env
       volumes:
         - ./logs:/app/logs
       restart: unless-stopped
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Option 3: Serverless (Vercel, AWS Lambda, etc.)

For serverless deployment, you'll need to:
1. Convert Express app to serverless functions
2. Use environment variables from platform
3. Handle cold starts
4. Configure API Gateway

## Post-Deployment

### 1. Health Check
```bash
curl https://your-domain.com/api/health
```

### 2. Test Endpoints
- Test chat endpoint
- Test reservation creation
- Test order creation
- Test video session creation

### 3. Monitor Logs
```bash
# PM2
pm2 logs chatbot-api

# Docker
docker-compose logs -f

# Direct
tail -f logs/combined.log
```

### 4. Set Up Monitoring
- Set up error tracking (Sentry, etc.)
- Configure uptime monitoring
- Set up log aggregation (if needed)

## Security Checklist

- [ ] All API keys in environment variables (never in code)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Logs don't contain PII
- [ ] Stripe webhook signature verification enabled

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, AWS ALB)
- Use Redis for session storage (instead of in-memory)
- Use database for conversation storage (instead of in-memory)
- Use message queue for webhooks (if needed)

### Performance Optimization
- Enable response caching where appropriate
- Use CDN for static assets
- Optimize database queries (when using database)
- Monitor API response times

## Backup Strategy

1. **Google Sheets**: Automatic (Google handles backups)
2. **Google Calendar**: Automatic (Google handles backups)
3. **Application Logs**: Rotate and archive
4. **Environment Variables**: Store securely (use secrets manager)

## Troubleshooting

### Common Issues

1. **Google API Errors**
   - Check service account permissions
   - Verify calendar/sheet sharing
   - Check API quotas

2. **Stripe Errors**
   - Verify API keys
   - Check webhook signature
   - Review Stripe dashboard logs

3. **HeyGen Errors**
   - Verify API key
   - Check avatar ID
   - Review API documentation

4. **n8n Webhook Failures**
   - Check webhook URL
   - Verify n8n workflow is active
   - Review n8n execution logs

## Maintenance

### Regular Tasks
- Monitor error logs
- Review API usage
- Update dependencies
- Review and rotate API keys
- Check disk space for logs
- Review rate limit effectiveness

### Updates
```bash
# Pull latest code
git pull

# Install new dependencies
npm install

# Restart application
pm2 restart chatbot-api
# or
docker-compose restart
```

