
require('dotenv').config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('DATABASE_URL is not set');
} else {
  // Mask password: postgres://user:pass@host:port/db
  const masked = url.replace(/:([^:@]+)@/, ':****@');
  console.log('DATABASE_URL:', masked);
}
