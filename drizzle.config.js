/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./electron/schema.js",
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    url: "postgres://devassist_admin:devassist_secure_pass@localhost:54325/devassist_vault",
  }
};
