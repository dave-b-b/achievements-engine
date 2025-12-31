import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/builder-api',
        'guides/direct-updates',
        'guides/event-based-tracking',
        'guides/error-handling',
        'guides/data-portability',
        'guides/storage',
      ],
    },
  ],
};

export default sidebars;
