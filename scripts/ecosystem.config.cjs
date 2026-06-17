module.exports = {
  apps: [
    {
      name: "purchase-web-system",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "E:/Purchase_Web_System",
      instances: 1,
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NEXTAUTH_URL: "http://localhost:3000",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
