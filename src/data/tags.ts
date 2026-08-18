const TAG_DESCRIPTIONS: Record<string, string> = {
  agents: 'How software changes when AI agents can plan, act, and collaborate on our behalf.',
  'coding agents': 'Practical patterns for delegating software work to coding agents.',
  efficiency: 'Tools and workflows that remove repetitive work and shorten feedback loops.',
  engineering: 'Principles for building reliable software and effective engineering teams.',
  future: 'Predictions and working theories about where software and the internet are heading.',
  howto: 'Hands-on guides for setting up tools, systems, and repeatable workflows.',
  llms: 'Notes on large language models, their capabilities, and their consequences.',
  macbook: 'From-scratch MacBook setup notes, updated as the development environment changes.',
  privacy: 'Ways AI systems change data privacy, security, and user control.',
  setup: 'Repeatable environment setup, configuration, and bootstrap workflows.',
  'software development': 'Engineering practices, tools, and ideas for shipping better software.',
  'tiki-toki': 'Short video essays about agents, LLMs, privacy, and the future of software.',
  tools: 'Software and utilities that make research and engineering work more effective.',
};

export function getTagDescription(tag: string): string {
  return TAG_DESCRIPTIONS[tag] ?? `Posts about ${tag}.`;
}
