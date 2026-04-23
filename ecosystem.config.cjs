module.exports = {
  apps: [
    {
      name: "ubuntu-web",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "ubuntu-reminders",
      script: "npm",
      args: "run cron:reminders",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
