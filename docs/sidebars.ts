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
        'guides/simple-api',
        'guides/error-handling',
        'guides/data-portability',
        'guides/storage',
        'guides/events',
      ],
    },
  ],
};

export default sidebars;
