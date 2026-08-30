import { ASTNode } from '../types/compiler';
import { ThemeGenerator, CustomPostTypeMeta, unescapeHtml } from './themeGenerator';

export type PreviewTemplateMode = 'front-page' | 'page-template' | 'fse' | 'archive';

interface PreviewRenderOptions {
  astRoot: ASTNode | null;
  themeName: string;
  themeSlug: string;
  templateMode: PreviewTemplateMode;
}

/**
 * Generates mock dynamic post items for Custom Post Types detected in the AST.
 */
function getMockCptItems(cptSlug: string, count: number = 3) {
  const isPortfolio = /(portfolio|project|work|case)/i.test(cptSlug);
  const isTeam = /(team|member|author|person|staff)/i.test(cptSlug);
  const isService = /(service|feature|solution)/i.test(cptSlug);
  const isReview = /(testimonial|review|quote)/i.test(cptSlug);

  const mockThumbnails = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
  ];

  const items = [];
  for (let i = 1; i <= count; i++) {
    let title = `${cptSlug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Item #${i}`;
    let excerpt = `High impact deliverable highlighting automated workflow integration, real-time analytics, and scalable architecture.`;
    let tag = 'Production';

    if (isPortfolio) {
      const pTitles = ['Enterprise Cloud Transformation', 'NextGen FinTech Design System', 'Global AI Integration Portal'];
      title = pTitles[(i - 1) % pTitles.length];
      excerpt = 'Complete end-to-end design tokenization and AST component compilation for multi-tenant microservices.';
      tag = 'Case Study';
    } else if (isTeam) {
      const tTitles = ['Sarah Chen • Principal Architect', 'Alex Rivera • VP of Product', 'Elena Rostova • Head of AI'];
      title = tTitles[(i - 1) % tTitles.length];
      excerpt = 'Leading technical compiler architecture and deterministic AST graph transformations.';
      tag = 'Leadership';
    } else if (isService) {
      const sTitles = ['Automated Code Generation', 'Deterministic Tokenization', 'WordPress Theme Bundling'];
      title = sTitles[(i - 1) % sTitles.length];
      excerpt = 'Instant zero-dependency compilation from Figma design objects into production-ready WordPress themes.';
      tag = 'Core Feature';
    } else if (isReview) {
      const rTitles = ['"Cut our theme delivery by 85%"', '"Zero syntax errors out of the box"', '"Flawless Gutenberg block generation"'];
      title = rTitles[(i - 1) % rTitles.length];
      excerpt = 'The AST compiler preserved 100% of our design intent, font styles, and responsive auto-layout structures.';
      tag = 'Verified Review';
    }

    items.push({
      id: i,
      title,
      excerpt,
      tag,
      date: 'August 2026',
      image: mockThumbnails[(i - 1) % mockThumbnails.length],
    });
  }

  return items;
}

/**
 * Recursively renders an AST node to clean semantic HTML with Tailwind CSS classes for live iframe preview.
 */
function renderAstToHtml(node: ASTNode | null, depth: number = 0): string {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  const nodeType = node.node_type || 'CONTAINER';
  const props = node.properties || {};
  const chars = props.characters || '';
  const cleanChars = unescapeHtml(chars);

  switch (nodeType) {
    case 'HEADING': {
      const fontSize = props.font_size || props.fontSize || 32;
      const tag = fontSize >= 36 ? 'h1' : fontSize >= 24 ? 'h2' : 'h3';
      const headingClass =
        tag === 'h1'
          ? 'text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight'
          : tag === 'h2'
          ? 'text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3 leading-snug'
          : 'text-xl font-semibold text-slate-100 mb-2 leading-snug';

      return `${indent}<${tag} class="${headingClass}">${cleanChars || 'SaaS Hero & Feature Architecture'}</${tag}>\n`;
    }

    case 'BUTTON': {
      const label = cleanChars || (node.children?.[0]?.properties?.characters) || 'Get Started Now';
      const cleanLabel = unescapeHtml(label);
      return `${indent}<div class="btn-wrapper inline-flex items-center gap-3 my-3">
${indent}  <a href="#cta" class="px-6 py-3.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5">
${indent}    <span>${cleanLabel}</span>
${indent}    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
${indent}  </a>
${indent}  <a href="#docs" class="px-5 py-3.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer">
${indent}    <span>Documentation</span>
${indent}  </a>
${indent}</div>\n`;
    }

    case 'IMAGE': {
      return `${indent}<div class="figma-media-frame relative rounded-2xl overflow-hidden my-6 border border-slate-800 bg-slate-900 shadow-2xl group">
${indent}  <div class="aspect-[16/9] w-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-8 relative overflow-hidden">
${indent}    <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]"></div>
${indent}    <div class="relative text-center z-10 space-y-3 max-w-md">
${indent}      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-1 shadow-inner">
${indent}        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
${indent}      </div>
${indent}      <h4 class="text-base font-semibold text-slate-200">Figma AST Media Asset</h4>
${indent}      <p class="text-xs text-slate-400">Integrated with WordPress Featured Thumbnail (<code class="text-indigo-300 font-mono text-[11px]">the_post_thumbnail('large')</code>)</p>
${indent}    </div>
${indent}  </div>
${indent}</div>\n`;
    }

    case 'NAV': {
      return `${indent}<nav class="site-navigation flex items-center justify-between py-4 border-b border-slate-800/80 bg-slate-950/40" aria-label="Primary Navigation">
${indent}  <div class="flex items-center gap-6">
${indent}    <a href="#" class="text-xs font-medium text-slate-300 hover:text-white transition">Home</a>
${indent}    <a href="#" class="text-xs font-medium text-slate-400 hover:text-white transition">Features</a>
${indent}    <a href="#" class="text-xs font-medium text-slate-400 hover:text-white transition">Solutions</a>
${indent}    <a href="#" class="text-xs font-medium text-slate-400 hover:text-white transition">Pricing</a>
${indent}    <a href="#" class="text-xs font-medium text-slate-400 hover:text-white transition">Changelog</a>
${indent}  </div>
${indent}</nav>\n`;
    }

    case 'CARD': {
      const cardChildren = (node.children || []).map((c) => renderAstToHtml(c, depth + 1)).join('');
      return `${indent}<article class="feature-card p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800/90 shadow-lg hover:border-slate-700 transition duration-300 space-y-3">
${cardChildren}${indent}</article>\n`;
    }

    case 'TEXT_BLOCK': {
      return `${indent}<p class="entry-description text-slate-300 text-base sm:text-lg leading-relaxed my-3 max-w-3xl">${cleanChars || 'Empower modern product engineering teams with automated design token classification, semantic IR nodes, and live theme synchronization.'}</p>\n`;
    }

    case 'CONTAINER':
    default: {
      const isLoop = props.post_type || node.semantic_role === 'dynamic_post_loop';
      if (isLoop) {
        const cptSlug = props.post_type || props.cpt_slug || 'portfolio_item';
        const mockPosts = getMockCptItems(cptSlug, 3);

        return `${indent}<!-- Section: Dynamic Custom Post Type Loop (${cptSlug}) -->
${indent}<section class="py-16 dynamic-cpt-section">
${indent}  <div class="container mx-auto px-4 sm:px-6">
${indent}    <div class="flex items-center justify-between mb-8">
${indent}      <div>
${indent}        <span class="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">WordPress WP_Query</span>
${indent}        <h3 class="text-2xl font-bold text-white mt-2 capitalize">${cptSlug.replace(/_/g, ' ')} Showcase</h3>
${indent}      </div>
${indent}      <a href="#all" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">View All &rarr;</a>
${indent}    </div>
${indent}    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
${mockPosts
  .map(
    (post) => `${indent}      <article class="cpt-card rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg hover:border-indigo-500/50 transition duration-300 flex flex-col justify-between group">
${indent}        <div>
${indent}          <div class="relative h-44 overflow-hidden bg-slate-800">
${indent}            <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80" />
${indent}            <span class="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur text-indigo-300 border border-indigo-500/30">${post.tag}</span>
${indent}          </div>
${indent}          <div class="p-6">
${indent}            <h4 class="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition">${post.title}</h4>
${indent}            <p class="text-slate-400 text-xs mt-2 leading-relaxed">${post.excerpt}</p>
${indent}          </div>
${indent}        </div>
${indent}        <div class="px-6 pb-6 pt-2 flex items-center justify-between border-t border-slate-800/60 text-xs text-slate-400">
${indent}          <span>${post.date}</span>
${indent}          <span class="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-1">Details &rarr;</span>
${indent}        </div>
${indent}      </article>`
  )
  .join('\n')}
${indent}    </div>
${indent}  </div>
${indent}</section>\n`;
      }

      const innerHtml = (node.children || []).map((c) => renderAstToHtml(c, depth + 1)).join('');
      return `${indent}<section class="section-block py-10">
${indent}  <div class="container mx-auto px-4 sm:px-6">
${innerHtml}${indent}  </div>
${indent}</section>\n`;
    }
  }
}

/**
 * Compiles a self-contained HTML string ready for rendering inside an <iframe>.
 */
export function compileWordPressThemeToPreviewHtml({
  astRoot,
  themeName,
  themeSlug,
  templateMode,
}: PreviewRenderOptions): string {
  const cleanThemeName = unescapeHtml(themeName);
  const cleanThemeSlug = unescapeHtml(themeSlug);

  // Extract CPTs for header badges and footer
  const cpts: CustomPostTypeMeta[] = ThemeGenerator.extractCustomPostTypes(astRoot);

  // Generate body content
  let bodyContent = '';

  if (templateMode === 'front-page' || templateMode === 'page-template') {
    bodyContent = astRoot
      ? renderAstToHtml(astRoot, 2)
      : `<div class="container mx-auto px-4 py-16 text-center text-slate-400"><p>No AST node tree available for preview.</p></div>`;
  } else if (templateMode === 'fse') {
    // FSE Block Theme Query Loop Preview
    bodyContent = `
    <div class="container mx-auto px-4 sm:px-6 py-12">
      <!-- wp:site-title and hero banner -->
      <div class="mb-12 pb-8 border-b border-slate-800">
        <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Full Site Editing (FSE) Block Template</span>
        <h1 class="text-4xl font-extrabold text-white mt-3">${cleanThemeName}</h1>
        <p class="text-slate-400 text-sm mt-2">Controlled via <code class="font-mono text-sky-300">theme.json</code> v3 color presets and Gutenberg block query loops.</p>
      </div>

      <!-- AST Rendered Hero Preview inside Block Theme -->
      <div class="mb-16">
        ${astRoot ? renderAstToHtml(astRoot, 3) : ''}
      </div>

      <!-- Simulated wp:query loop -->
      <div class="wp-block-query space-y-6">
        <h3 class="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>Recent Updates & Articles</span>
          <span class="text-xs font-normal text-slate-500">(wp:post-template)</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article class="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 class="text-lg font-bold text-slate-100 hover:text-sky-400 cursor-pointer">Compiling Figma Auto-Layout to CSS Grid</h4>
            <p class="text-slate-400 text-xs leading-relaxed">How our AST compiler maps nested flexbox constraints into modern responsive Tailwind layouts seamlessly.</p>
            <div class="text-[11px] text-slate-500 pt-2">Published by Admin • 5 min read</div>
          </article>
          <article class="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 class="text-lg font-bold text-slate-100 hover:text-sky-400 cursor-pointer">Building Custom Post Types with Zero PHP Code</h4>
            <p class="text-slate-400 text-xs leading-relaxed">Automatic generation of functions.php hooks, register_post_type definitions, and dynamic WP_Query loops.</p>
            <div class="text-[11px] text-slate-500 pt-2">Published by Admin • 4 min read</div>
          </article>
        </div>
      </div>
    </div>`;
  }

  return `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanThemeName} - Live Theme Preview</title>
  <!-- Tailwind CSS CDN for instant live preview -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>
  <style>
    /* Embedded WordPress theme.json & style.css variables */
    :root {
      --wp--preset--color--primary: #6366f1;
      --wp--preset--color--secondary: #8b5cf6;
      --wp--preset--color--background: #020617;
      --wp--preset--color--surface: #0f172a;
      --wp--preset--color--text: #f8fafc;
      --wp--preset--color--muted: #94a3b8;
      --wp--preset--color--border: #1e293b;
    }
    html, body {
      background-color: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      scroll-behavior: smooth;
      margin: 0;
      padding: 0;
    }
    ::selection {
      background: #6366f1;
      color: #ffffff;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  <!-- WordPress Simulated Admin Bar (for realistic WordPress feeling) -->
  <div class="h-8 bg-slate-900 border-b border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none">
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1.5 font-semibold text-slate-300">
        <svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
        <span>${cleanThemeName}</span>
      </span>
      <span class="text-slate-600">|</span>
      <span class="text-slate-400 flex items-center gap-1">
        <span>Template:</span>
        <code class="text-indigo-400 bg-slate-950 px-1 py-0.2 rounded font-mono text-[10px]">${templateMode === 'front-page' ? 'front-page.php' : templateMode === 'fse' ? 'templates/index.html' : 'page-template.php'}</code>
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">Live Theme Simulation</span>
    </div>
  </div>

  <!-- WordPress Theme Header (header.php) -->
  <header id="masthead" class="site-header border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
    <div class="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <!-- Site Branding -->
      <div class="site-branding flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/20">
          ${cleanThemeName.charAt(0)}
        </div>
        <div>
          <a href="#" class="site-title font-bold text-base text-white tracking-tight hover:text-indigo-300 transition">${cleanThemeName}</a>
          <p class="site-description text-[10px] text-slate-400 hidden sm:block">Transpiled from Figma AST IR</p>
        </div>
      </div>

      <!-- Navigation Menu (wp_nav_menu) -->
      <nav class="site-navigation hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
        <a href="#" class="hover:text-white text-indigo-400 font-semibold transition">Home</a>
        <a href="#features" class="hover:text-white transition">Features</a>
        ${cpts.map((c) => `<a href="#${c.slug}" class="hover:text-white transition">${c.plural_name}</a>`).join('\n        ')}
        <a href="#pricing" class="hover:text-white transition">Pricing</a>
        <a href="#contact" class="hover:text-white transition">Contact</a>
      </nav>

      <!-- Action Button -->
      <div class="flex items-center gap-3">
        <a href="#cta" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition cursor-pointer">
          Get Started
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content Area -->
  <main id="primary" class="site-main flex-1">
    ${bodyContent}
  </main>

  <!-- WordPress Theme Footer (footer.php) -->
  <footer id="colophon" class="site-footer border-t border-slate-800 bg-slate-900/90 py-12 text-slate-400 text-xs mt-auto">
    <div class="container mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800/80">
        <div class="space-y-2 md:col-span-2">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              ${cleanThemeName.charAt(0)}
            </div>
            <span class="font-bold text-sm text-white">${cleanThemeName}</span>
          </div>
          <p class="text-xs text-slate-400 max-w-sm leading-relaxed">
            High-performance WordPress theme compiled from Figma AST design representations with Full Site Editing and Classic PHP support.
          </p>
        </div>
        <div>
          <h5 class="text-slate-200 font-semibold mb-3">Navigation</h5>
          <ul class="space-y-2 text-xs">
            <li><a href="#" class="hover:text-white transition">Home</a></li>
            <li><a href="#features" class="hover:text-white transition">Features</a></li>
            <li><a href="#pricing" class="hover:text-white transition">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h5 class="text-slate-200 font-semibold mb-3">WordPress Stack</h5>
          <ul class="space-y-2 text-xs">
            <li><span class="text-slate-300">Text Domain:</span> <code class="text-indigo-400 font-mono text-[11px]">${cleanThemeSlug}</code></li>
            <li><span class="text-slate-300">Architecture:</span> Flat ZIP Root</li>
            <li><span class="text-slate-300">License:</span> GPL v2 or later</li>
          </ul>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>&copy; ${new Date().getFullYear()} ${cleanThemeName}. Built with Figma &rarr; WordPress AST Compiler.</p>
        <div class="flex items-center gap-4">
          <span>Tested on WordPress 6.7+</span>
          <span>&bull;</span>
          <span>Tailwind 3.4 CDN</span>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}
