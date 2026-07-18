import "dotenv/config";

const config = {
  server_port: Number(process.env.SERVER_PORT) || 8000,
  client_url: process.env.CLIENT_URL,
  db: {
    url: process.env.DB_URL,
  },
  node_env: process.env.NODE_ENV,
  jwt_secret: process.env.JWT_SECRET,
};

export default config;
