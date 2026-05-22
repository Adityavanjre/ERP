export const getAllowedOrigins = (): (string | RegExp)[] => {
  const allowedOrigins: (string | RegExp)[] = [
    'https://klypso.in',
    'https://www.klypso.in',
    /\.klypso\.in$/, // Trust all klypso.in subdomains
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    /^http:\/\/localhost:\d+$/, // Desktop app dynamic ports
    /^http:\/\/127\.0\.0\.1:\d+$/, // Desktop app dynamic ports
  ];

  const extraOrigins = [
    process.env.NEXUS_FRONTEND_URL, // Primary -- set this in Render env vars
    process.env.KLYPSO_FRONTEND_URL, // Legacy key (backwards compat)
    process.env.CORS_ORIGIN, // Escape hatch for additional origins
  ];

  for (const o of extraOrigins) {
    if (o && !allowedOrigins.includes(o)) allowedOrigins.push(o);
  }

  return allowedOrigins;
};
