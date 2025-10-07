module.exports = {
  apps: [
    {
      name: "adminpanel-api",
      script: "server.js",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 5000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      pid_file: "./logs/app.pid",
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      ignore_watch: [
        "node_modules",
        "logs",
        ".git"
      ],
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 5
      },
      min_uptime: "5s",
      max_restarts: 10,
      autorestart: true,
      cron_restart: "0 0 * * *",
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      pmx: true,
      automation: false,
      vizion: false,
      post_update: ["npm install"],
      source_map_support: false,
      disable_trace: false,
      instance_var: "INSTANCE_ID",
      log_type: "json"
    }
  ],
  deploy: {
    production: {
      user: "deploy",
      host: ["server1.example.com", "server2.example.com"],
      ref: "origin/main",
      repo: "git@github.com:username/adminpanel.git",
      path: "/var/www/adminpanel",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "apt update && apt install git -y"
    },
    staging: {
      user: "deploy",
      host: "staging.example.com",
      ref: "origin/develop",
      repo: "git@github.com:username/adminpanel.git",
      path: "/var/www/adminpanel-staging",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env staging"
    }
  }
};