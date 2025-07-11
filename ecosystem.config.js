module.exports = {
  apps: [{
    name: 'chatsg-backend',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      // NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 5000,
    
    // Restart delay
    restart_delay: 5000,
    
    // Crash handling
    min_uptime: '10s',
    max_restarts: 10,
    
    // Environment specific settings
    env_production: {
      // NODE_ENV: 'production',
      exec_mode: 'cluster',
      instances: 'max'
    },
    
    // Health check
    health_check: {
      interval: 30000,
      timeout: 5000,
      max_consecutive_failures: 3
    }
  }, {
    name: 'chatsg-mem0-python',
    script: 'uvicorn',
    args: 'src.main:app --host 0.0.0.0 --port 8001',
    cwd: './python-mem0',
    interpreter: 'python3',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      // Inherits from parent .env automatically
    },
    error_file: './logs/mem0-error.log',
    out_file: './logs/mem0-out.log',
    log_file: './logs/mem0-combined.log',
    time: true,
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 5000,
    
    // Crash handling
    min_uptime: '10s',
    max_restarts: 10,
    
    // Environment specific settings
    env_production: {
      // NODE_ENV: 'production',
    }
  }],

  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.gov',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/chatsg.git',
      path: '/opt/chatsg',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};