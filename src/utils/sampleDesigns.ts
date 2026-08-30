import { SamplePreset } from '../types/compiler';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'agency-portfolio',
    name: 'SaaS Agency & Portfolio',
    description: 'Modern agency landing page with hero CTA, dynamic portfolio post loop, team cards, and contact form.',
    category: 'Full Website',
    figmaData: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '1:1',
          name: 'Hero Section Frame',
          type: 'FRAME',
          layoutMode: 'VERTICAL',
          paddingTop: 80,
          paddingBottom: 80,
          children: [
            {
              id: '1:2',
              name: 'Main Top Navigation',
              type: 'FRAME',
              layoutMode: 'HORIZONTAL',
              children: [
                { id: '1:3', name: 'Site Logo', type: 'VECTOR' },
                { id: '1:4', name: 'Home Link', type: 'TEXT', style: { fontSize: 15, fontWeight: 500 }, characters: 'Home' },
                { id: '1:5', name: 'Work Link', type: 'TEXT', style: { fontSize: 15, fontWeight: 500 }, characters: 'Portfolio' },
                { id: '1:6', name: 'Contact Link', type: 'TEXT', style: { fontSize: 15, fontWeight: 500 }, characters: 'Contact' },
              ],
            },
            {
              id: '1:7',
              name: 'Hero Title',
              type: 'TEXT',
              style: { fontSize: 44, fontWeight: 800 },
              characters: 'Architecting Scalable Web Experiences from Figma',
            },
            {
              id: '1:8',
              name: 'Hero Description Subtitle',
              type: 'TEXT',
              style: { fontSize: 18, fontWeight: 400 },
              characters: 'Automatically compile Figma design tokens and nested components into production-grade WordPress themes.',
            },
            {
              id: '1:9',
              name: 'Primary CTA Button',
              type: 'FRAME',
              layoutMode: 'HORIZONTAL',
              cornerRadius: 8,
              children: [
                {
                  id: '1:10',
                  name: 'Button Label',
                  type: 'TEXT',
                  style: { fontSize: 16, fontWeight: 600 },
                  characters: 'Explore Portfolio Projects',
                },
              ],
            },
          ],
        },
        {
          id: '2:1',
          name: 'Portfolio Grid Section',
          type: 'FRAME',
          layoutMode: 'VERTICAL',
          post_type: 'portfolio_item',
          singular_name: 'Portfolio Item',
          plural_name: 'Portfolio Items',
          menu_icon: 'dashicons-portfolio',
          children: [
            {
              id: '2:2',
              name: 'Section Heading',
              type: 'TEXT',
              style: { fontSize: 32, fontWeight: 700 },
              characters: 'Featured Case Studies',
            },
            {
              id: '2:3',
              name: 'Portfolio Card 1',
              type: 'FRAME',
              cornerRadius: 12,
              paddingTop: 24,
              children: [
                { id: '2:4', name: 'Project Thumbnail', type: 'FRAME', fills: [{ type: 'IMAGE' }] },
                { id: '2:5', name: 'Card Title', type: 'TEXT', style: { fontSize: 20, fontWeight: 700 }, characters: 'Fintech Cloud Dashboard' },
                { id: '2:6', name: 'Card Description', type: 'TEXT', style: { fontSize: 14, fontWeight: 400 }, characters: 'Interactive analytics platform built with React and custom REST API.' },
              ],
            },
            {
              id: '2:7',
              name: 'Portfolio Card 2',
              type: 'FRAME',
              cornerRadius: 12,
              paddingTop: 24,
              children: [
                { id: '2:8', name: 'Project Thumbnail', type: 'FRAME', fills: [{ type: 'IMAGE' }] },
                { id: '2:9', name: 'Card Title', type: 'TEXT', style: { fontSize: 20, fontWeight: 700 }, characters: 'AI Design System 2026' },
                { id: '2:10', name: 'Card Description', type: 'TEXT', style: { fontSize: 14, fontWeight: 400 }, characters: 'Automated tokenization and component generation toolkit.' },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'creator-blog',
    name: 'Editorial Magazine & Blog',
    description: 'Clean editorial magazine layout with article cards, category badges, and author bios.',
    category: 'Blog / Media',
    figmaData: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '10:1',
          name: 'Magazine Header Frame',
          type: 'FRAME',
          layoutMode: 'HORIZONTAL',
          children: [
            { id: '10:2', name: 'Brand Logo', type: 'VECTOR' },
            { id: '10:3', name: 'Articles Menu', type: 'TEXT', style: { fontSize: 14, fontWeight: 600 }, characters: 'Articles' },
            { id: '10:4', name: 'Newsletter Menu', type: 'TEXT', style: { fontSize: 14, fontWeight: 600 }, characters: 'Newsletter' },
          ],
        },
        {
          id: '10:5',
          name: 'Editorial Headline',
          type: 'TEXT',
          style: { fontSize: 40, fontWeight: 800 },
          characters: 'The Future of AI-Assisted Front-End Compilers',
        },
        {
          id: '10:6',
          name: 'Articles Grid',
          type: 'FRAME',
          layoutMode: 'VERTICAL',
          post_type: 'article',
          singular_name: 'Article',
          plural_name: 'Articles',
          menu_icon: 'dashicons-admin-post',
          children: [
            {
              id: '10:7',
              name: 'Article Card',
              type: 'FRAME',
              cornerRadius: 8,
              paddingTop: 16,
              children: [
                { id: '10:8', name: 'Article Title', type: 'TEXT', style: { fontSize: 22, fontWeight: 700 }, characters: 'Bridging Figma Design and Headless WordPress' },
                { id: '10:9', name: 'Article Excerpt', type: 'TEXT', style: { fontSize: 15, fontWeight: 400 }, characters: 'How AST trees preserve semantic hierarchies from design tokens to PHP templates.' },
              ],
            },
          ],
        },
      ],
    },
  },
];
