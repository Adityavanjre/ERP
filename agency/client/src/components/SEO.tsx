import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  type?: string;
  schema?: object;
  noindex?: boolean;
}

const SEO = ({
  title,
  description,
  keywords = "boutique digital agency, premium web design, high-performance systems, MERN stack experts, Klypso agency, strategic IT services, brand identity design, enterprise intelligence, bespoke software development",
  canonical,
  image = "/og-image.png",
  type = "website",
  schema,
  noindex = false
}: SEOProps) => {
  const siteUrl = 'https://klypso.agency';
  const fullUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const fullImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Klypso",
    "url": siteUrl,
    "logo": `${siteUrl}/favicon.svg`,
    "sameAs": [
      "https://linkedin.com/company/klypso",
      "https://twitter.com/klypso"
    ],
    "description": "Boutique digital agency crafting high-performance systems and bespoke brand identities."
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title.includes("|") ? title : `${title} | Klypso`}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="Klypso" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@klypso" />

      {/* Theme Control */}
      <meta name="theme-color" content="#0A0A0B" />
      <meta name="msapplication-TileColor" content="#0A0A0B" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema || defaultSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
