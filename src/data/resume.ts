// Content for /resume, in the "1a Editorial" design direction.
//
// Positioning: founder-forward, aimed at FrontSail's investors, customers and
// early hires. The spine is one idea with an eighteen-year receipt: whoever ships
// a feature owns the whole of it. Technical depth and leadership read as
// consequences of a single habit rather than two separate claims.
//
// Copy style: no em or en dashes, and the ownership rule is stated once, in the
// masthead. Everywhere else has to earn its place with new information.

/** A run of blurb text, optionally linked. Avoids raw HTML in the page. */
export interface Segment {
  text: string;
  href?: string;
}

export interface Bullet {
  text: string;
  /** Renders in the accent colour, reserved for the one line that matters most. */
  accent?: boolean;
}

export interface Role {
  /** Anchor id, also the target of the matching chapter in the strip. */
  id: string;
  title: string;
  company: string;
  companyHref: string;
  period: string;
  /** ISO dates for the JSON-LD; `end` omitted while the role is current. */
  start: string;
  end?: string;
  blurb: Segment[];
  bullets: Bullet[];
  /** Bullets shown before the reader expands the entry. Defaults to 2. */
  leadCount?: number;
}

export const PROFILE = {
  name: 'Dmitri Kochelorov',
  location: 'Kitchener, ON · Canada',
  currentRole: {
    title: 'CEO & Co-founder',
    company: 'FrontSail AI',
    href: 'https://frontsail.ai/',
  },
  headline: 'Zero to one, four times over.',
  /** Rendered in the accent colour, continuing the headline sentence. */
  headlineAccent:
    'Firmware, a cloud platform, AI agents. Now an agentic OS for small business.',
  doctrine:
    'Whoever ships a feature owns the whole of it, from the first bit of research out to production. I learned that at Jungo, where there was nobody else to do the work, and later built a 20-person R&D org around it. Eighteen years on, I still write code most days.',
};

export const NAV = [
  { href: '#work', label: 'work' },
  { href: '#chapters', label: 'chapters' },
  { href: '#what', label: 'what I do' },
  { href: '#education', label: 'education' },
];

// Labels carry the handle, not just the platform. On paper a link is not
// clickable, so "LinkedIn" alone tells a reader nothing they can act on.
export const LINKS = [
  { label: '@kochelorov on LinkedIn', href: 'https://www.linkedin.com/in/kochelorov/' },
  { label: '@korya on GitHub', href: 'https://github.com/korya' },
  { label: 'Blog (korya.dev)', href: '/' },
];

// Deliberately not part of LINKS: those feed schema.org `sameAs`, which is for
// profiles that identify the same person, not for documents.
export const RESUME_PDF = {
  href: '/resume/offline.pdf',
  label: 'Download PDF',
};

/** The four numbers that carry the argument, read before anything else. */
export const OUTCOMES = [
  {
    figure: '4×',
    label: 'zero to one',
    note: 'firmware, cloud platform, AI agents, agentic OS',
  },
  {
    figure: '1 → 20+',
    label: 'engineers',
    note: 'hired and led. The org still runs without me',
  },
  {
    figure: '2 months',
    label: 'to a shipped agent',
    note: 'clients were using it daily by month six',
  },
  {
    figure: 'SOC 2',
    label: 'at enterprise scale',
    note: 'and no dedicated ops team to lean on',
  },
];

/** Chronological chapters. Widths are equal by design. Scaling them by duration
 *  buries the recent AI work under a decade of Planitar, and the years are printed
 *  on each one, so nothing is hidden by dropping the proportional axis. */
export const CHAPTERS = {
  eyebrow: 'Eighteen years, five chapters',
  items: [
    {
      href: '#jungo',
      label: 'Firmware',
      years: '2008 to 2013',
      note: 'bootloader up to the web UI',
      highlight: false,
    },
    {
      href: '#planitar',
      label: 'Platform & org',
      years: '2014 to 2024',
      note: '1 → 20+ engineers',
      highlight: false,
    },
    {
      href: '#klue',
      label: 'Data',
      years: '2024 to 2025',
      note: 'AI pipeline, back to being an IC',
      highlight: false,
    },
    {
      href: '#starboard',
      label: 'Agents',
      years: '2025',
      note: 'zero to daily use in six months',
      highlight: false,
    },
    {
      href: '#frontsail',
      label: 'Founder',
      years: '2025 to now',
      note: 'agentic OS for small business',
      highlight: true,
    },
  ],
};

export const ROLES: Role[] = [
  {
    id: 'frontsail',
    title: 'CEO & Co-founder',
    company: 'FrontSail AI',
    companyHref: 'https://frontsail.ai/',
    period: 'Nov 2025 to now',
    start: '2025-11-01',
    blurb: [
      {
        text:
          'An agentic operating system for small business. It takes the repetitive back-office work off the owner’s plate so they can get back to running the place.',
      },
    ],
    bullets: [
      {
        text:
          'Founded with two partners. The platform is live, with small businesses using it across Canada and the US.',
      },
      {
        text:
          'Two product lines out in seven months: an AI phone receptionist in January 2026, back-office automation in June 2026.',
      },
      {
        text:
          'Still early. We are building for the segment most software companies skip, because the contracts look too small to bother with.',
      },
    ],
  },
  {
    id: 'starboard',
    title: 'Founding Software Engineer',
    company: 'Starboard',
    companyHref: 'https://www.starboard.biz/',
    period: 'Feb to Dec 2025',
    start: '2025-02-01',
    end: '2025-12-01',
    blurb: [
      {
        text:
          'AI agents that let freight forwarders run and scale operations without adding headcount.',
      },
    ],
    bullets: [
      {
        text:
          'Joined when the company was three people. Shipped the first freight-forwarder agent in two months, and clients were using it daily by month six.',
      },
      {
        text:
          'This was March 2025, before the primitives existed. Session handling, auth, security, reliability: we worked out our own answers to all of it, on models that would cheerfully hallucinate in front of a paying customer.',
      },
      {
        text:
          'Shipped an Outlook add-in that reads rate sheets, pulls data out of PDFs and spreadsheets, and drafts replies to RFQs. Python and GCP behind it.',
      },
      {
        text:
          'Stack: OpenAI and Gemini, Agent SDK, Python, TypeScript, React, Supabase, Upstash Redis, Elasticsearch, GCP.',
      },
    ],
  },
  {
    id: 'klue',
    title: 'Staff Software Engineer',
    company: 'Klue',
    companyHref: 'https://klue.com/',
    period: 'Sep 2024 to Feb 2025',
    start: '2024-09-01',
    end: '2025-02-01',
    blurb: [
      {
        text:
          'Data quality for the AI pipeline behind competitive insights. A deliberate step back into an IC role.',
      },
    ],
    bullets: [
      {
        text:
          'Integrated CRM and public web sources, then redesigned the core data models and pipelines so the ML models had wider and cleaner input to work from.',
      },
      {
        text:
          'Stack: Python, TypeScript, React, OpenAI, Perplexity, Elasticsearch, Kubernetes, GCP.',
      },
    ],
    leadCount: 1,
  },
  {
    id: 'planitar',
    title: 'Technical R&D Director',
    company: 'Planitar',
    companyHref: 'https://goiguide.com/',
    period: 'Jun 2014 to Aug 2024',
    start: '2014-06-01',
    end: '2024-08-01',
    blurb: [
      { text: 'First engineer → 20+ person R&D org behind the ' },
      { text: 'iGUIDE', href: 'https://goiguide.com/' },
      { text: ', Canada’s leading 3D virtual tour platform.' },
    ],
    bullets: [
      {
        text:
          'Hired as the first engineer to turn a prototype into a product. Built the image-processing pipeline, the cloud infrastructure and the customer portal that became iGUIDE.',
      },
      {
        text:
          'Grew and ran the whole R&D org, 20+ engineers across several teams. Hiring was the hard part: Kitchener-Waterloo during COVID, competing with American companies who had no budget ceiling, while I very much did.',
      },
      {
        text:
          'Owned product direction alongside architecture until we hired our first product manager in 2022.',
      },
      {
        text:
          'Stood up a UX design function, and an ML research team of scientists and engineers who automated our internal drafting work with deep learning.',
      },
      {
        text:
          'Go and Node microservices on AWS, orchestrated with Docker, CoreOS, Nomad and Terraform. We reached SOC 2 and high availability for enterprise customers: BGIS, who manage facilities for the Government of Canada, insurance partners SeekNow and Colonial Claims, and municipalities across the US and Canada.',
      },
      {
        text:
          'Ran the org on the same rule I grew up with at Jungo, which mostly meant hiring people willing to learn a domain rather than specialists who wanted a lane.',
      },
      {
        text:
          'The org still runs today, two years after I left. That is the part I am proudest of.',
        accent: true,
      },
    ],
  },
  {
    id: 'jungo',
    title: 'Embedded Software Engineer',
    company: 'Jungo',
    companyHref: 'https://jungo.com/',
    period: 'Sep 2008 to Dec 2013',
    start: '2008-09-01',
    end: '2013-12-01',
    blurb: [
      {
        text:
          'Portable, hardware-agnostic firmware for residential routers. Netanya, Israel; later acquired by Cisco.',
      },
    ],
    bullets: [
      {
        text:
          'Everyone did everything. Bootloaders one week, Wi-Fi kernel drivers the next, then the orchestration logic, then the HTML and JavaScript config UI. This is where the habit comes from.',
      },
      {
        text:
          'Led the Vodafone 3G/LTE module, which was territory nobody at the company had touched. I researched the domain, turned Vodafone’s requirements into an architecture that fit our hardware-agnostic firmware, and shipped it.',
      },
      {
        text:
          'It brought connectivity to mountainous and rural regions, Italy among them, where fixed infrastructure was thin. It shipped in VOX 1.5 and 2.0 gateways across Europe.',
      },
      {
        text: 'Stack: C/C++, JavaScript, Linux kernel, drivers, bootloaders.',
      },
    ],
  },
];

/** Kept deliberately compact: real and findable, without competing with FrontSail. */
export const ALONGSIDE = {
  eyebrow: 'Alongside',
  name: 'Cosmic Lift',
  href: 'https://cosmic-lift.com/',
  period: 'Jan 2025 to now',
  description:
    'My consulting practice. Fractional CTO work, training, and product architecture and development for companies going AI-first, or making what they already have AI-ready.',
};

export const TOOLBELT = {
  eyebrow: 'Tools I’m fluent in',
  groups: [
    {
      label: 'AI',
      items:
        'OpenAI and Gemini, Agent SDKs, retrieval, document extraction, evals, agent reliability.',
    },
    { label: 'Languages', items: 'Go, Python, TypeScript/JavaScript, C/C++, Bash.' },
    {
      label: 'Infra',
      items:
        'AWS, GCP, Docker, Nomad, Kubernetes, Terraform, Postgres, Redis, Elasticsearch.',
    },
    { label: 'Front end', items: 'React, Vue, AngularJS.' },
  ],
};

/** Method, not achievements. The achievements live in the role bullets, and the
 *  ownership rule is already stated in the masthead, so none of these repeat it. */
export const PRACTICES = {
  eyebrow: 'How I work',
  items: [
    'Range beats specialization on a small team. I hire for curiosity and let people pick up the domain on the job.',
    'I stay in the code. That did not change when I started running an org, and it has not changed now.',
    'Learning a new domain is part of the job, not a prerequisite for it. Firmware, 3D imaging, freight, agents: none of them were mine to start with.',
    'I would rather ship something small that works than something large that demos well.',
  ],
};

export const EDUCATION = {
  degree: 'B.Sc. Computer Software Engineering',
  school: 'Technion, Israel Institute of Technology',
  schoolHref: 'https://www.technion.ac.il/en/',
  location: 'Haifa',
  period: '2006 to 2012',
};

export const FOOTER_LINKS = [
  { prefix: 'Building at', label: 'frontsail.ai', href: 'https://frontsail.ai/' },
  {
    prefix: 'More detail on',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/kochelorov/',
  },
  { prefix: 'More evidence on', label: 'GitHub', href: 'https://github.com/korya' },
  { prefix: 'More recursion', label: 'in here', href: '/resume' },
];
