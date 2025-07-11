module.exports = {
  apps: [{
    name: 'chatsg-mem0-python',
    script: 'uvicorn',
    args: 'src.main:app --host 0.0.0.0 --port 8001',
    cwd: '/path/to/chatSG/backend/python-mem0',
    interpreter: 'python3',
    env: {
      // Environment variables will be loaded from parent .env
    },
    error_file: '../logs/mem0-error.log',
    out_file: '../logs/mem0-out.log',
    log_file: '../logs/mem0-combined.log',
    time: true,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};