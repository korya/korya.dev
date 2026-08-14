// Site-wide configuration
export const SITE_CONFIG = {
  // Google Analytics 4 Measurement ID
  // Format: G-XXXXXXXXXX
  // Find this in Google Analytics Admin > Data Streams
  GA_MEASUREMENT_ID: 'G-DXHD6BHKK1',
  SITE_TITLE: 'Tech Scrolls',
  SITE_DESCRIPTION: 'Personal blog on software engineering, tools, and workflows',
  SITE_URL: 'https://korya.dev',
  AUTHOR: {
    name: '@korya',
    url: 'https://korya.dev/about',
    /** Canonical JSON-LD node id for Dmitri. Pages that name him as author reference
     *  this id instead of describing a fresh Person, so a crawler reading several
     *  pages sees one node rather than a pile of lookalikes. The full description,
     *  affiliations included, lives on /about and /resume. */
    id: 'https://korya.dev/#person',
  },
  /** Organizations described elsewhere on the web. Reusing the id a site publishes
   *  for itself is what lets the two graphs join: cosmic-lift.com emits this exact
   *  id for its Organization node. FrontSail publishes no id, so it is referenced
   *  by url alone. */
  ORGS: {
    COSMIC_LIFT: {
      id: 'https://cosmic-lift.com/#organization',
      name: 'Cosmic Lift',
      url: 'https://cosmic-lift.com/',
    },
  },
  // Cusdis comment system App ID
  // Get yours at https://cusdis.com
  CUSDIS_APP_ID: 'ed2f966b-260b-4e2a-bec9-142e76f7ea6f',
} as const;
