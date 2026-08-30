import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ASTNode } from '../types/compiler';

export interface GeneratedThemeFile {
  filename: string;
  path: string;
  category: 'classic' | 'fse' | 'codegen' | 'shared';
  language: 'php' | 'css' | 'json' | 'html' | 'python';
  content: string;
}

export interface CustomPostTypeMeta {
  slug: string;
  singular_name: string;
  plural_name: string;
  menu_icon: string;
  menu_position: number;
  supports: string[];
}

/**
 * Decodes common HTML entities (e.g. &amp; -> &, &lt; -> <) to their raw characters.
 */
export function unescapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Decodes any HTML entities and safely escapes backslashes and single quotes
 * for insertion into PHP single-quoted string literals.
 * This prevents double-encoding HTML entities while producing valid PHP.
 */
export function escapePhpString(text: string): string {
  const unescaped = unescapeHtml(text);
  return unescaped.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export class ThemeGenerator {
  public static extractCustomPostTypes(node: ASTNode | null): CustomPostTypeMeta[] {
    const cpts: CustomPostTypeMeta[] = [];
    const seen = new Set<string>();

    const walk = (n: ASTNode | null) => {
      if (!n) return;
      const props = n.properties || {};
      const role = String(n.semantic_role || '').toLowerCase();
      
      let postTypeSlug = props.post_type || props.cpt || props.custom_post_type;
      if (!postTypeSlug && (role === 'dynamic_post_loop' || role === 'cpt_loop')) {
        postTypeSlug = props.cpt_slug || 'portfolio_item';
      } else if (!postTypeSlug && role.startsWith('cpt_')) {
        postTypeSlug = role.replace('cpt_', '');
      }

      if (postTypeSlug && !['post', 'page', 'attachment'].includes(postTypeSlug)) {
        const slug = String(postTypeSlug).toLowerCase().replace(/\s+/g, '_');
        if (!seen.has(slug)) {
          seen.add(slug);
          const singular = props.singular_name || slug.replace(/[_\\-]/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase());
          const plural = props.plural_name || `${singular}s`;
          
          let menuIcon = props.menu_icon;
          if (!menuIcon) {
            if (/(portfolio|project|work|case)/i.test(slug)) menuIcon = 'dashicons-portfolio';
            else if (/(team|member|author|person|staff)/i.test(slug)) menuIcon = 'dashicons-groups';
            else if (/(testimonial|review|quote)/i.test(slug)) menuIcon = 'dashicons-testimonial';
            else if (/(service|feature|product)/i.test(slug)) menuIcon = 'dashicons-admin-tools';
            else if (/(article|blog|news)/i.test(slug)) menuIcon = 'dashicons-admin-post';
            else menuIcon = 'dashicons-admin-post';
          }

          cpts.push({
            slug,
            singular_name: singular,
            plural_name: plural,
            menu_icon: menuIcon,
            menu_position: props.menu_position || 20,
            supports: ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
          });
        }
      }

      if (Array.isArray(n.children)) {
        for (const child of n.children) {
          walk(child);
        }
      }
    };

    walk(node);

    // Fallback default CPT if none detected
    if (cpts.length === 0) {
      cpts.push({
        slug: 'portfolio_item',
        singular_name: 'Portfolio Item',
        plural_name: 'Portfolio Items',
        menu_icon: 'dashicons-portfolio',
        menu_position: 20,
        supports: ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
      });
    }

    return cpts;
  }

  public static renderNodeHtmlToPhp(
    node: ASTNode | null,
    depth: number = 2,
    cleanThemeSlug: string = 'figma-theme'
  ): string {
    if (!node) return '';
    const indent = '  '.repeat(depth);
    const nodeType = node.node_type || 'CONTAINER';
    const props = node.properties || {};
    const name = props.name || '';
    const chars = props.characters || '';

    switch (nodeType) {
      case 'HEADING': {
        const tag = (props.font_size && props.font_size >= 36) ? 'h1' : (props.font_size && props.font_size >= 24) ? 'h2' : 'h3';
        const safeChars = chars ? escapePhpString(chars) : '';
        return `${indent}<${tag} class="entry-title font-bold leading-tight">${safeChars ? `<?php echo esc_html( '${safeChars}' ); ?>` : '<?php the_title(); ?>'}</${tag}>\n`;
      }
      case 'BUTTON': {
        const label = chars || (node.children?.[0]?.properties?.characters) || 'Learn More';
        const safeLabel = escapePhpString(label);
        return `${indent}<div class="btn-wrapper inline-block my-2">\n${indent}  <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn-primary px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 transition">\n${indent}    <span><?php echo esc_html( '${safeLabel}' ); ?></span>\n${indent}  </a>\n${indent}</div>\n`;
      }
      case 'IMAGE': {
        return `${indent}<div class="figma-media-frame rounded-lg overflow-hidden my-4">\n${indent}  <?php if ( has_post_thumbnail() ) : ?>\n${indent}    <?php the_post_thumbnail( 'large', array( 'class' => 'w-full h-auto object-cover rounded-lg' ) ); ?>\n${indent}  <?php else : ?>\n${indent}    <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/placeholder.svg' ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" class="w-full h-auto rounded-lg" />\n${indent}  <?php endif; ?>\n${indent}</div>\n`;
      }
      case 'NAV': {
        return `${indent}<nav class="site-navigation flex items-center justify-between py-4" aria-label="<?php esc_attr_e( 'Primary Menu', '${cleanThemeSlug}' ); ?>">\n${indent}  <?php wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false, 'menu_class' => 'nav-links flex gap-6' ) ); ?>\n${indent}</nav>\n`;
      }
      case 'CARD': {
        const cardChildren = (node.children || []).map((c) => this.renderNodeHtmlToPhp(c, depth + 1, cleanThemeSlug)).join('');
        return `${indent}<article class="feature-card p-6 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm transition hover:border-slate-700">\n${cardChildren}${indent}</article>\n`;
      }
      case 'TEXT_BLOCK': {
        const safeChars = chars ? escapePhpString(chars) : '';
        return `${indent}<p class="entry-description text-slate-300 leading-relaxed my-2">${safeChars ? `<?php echo esc_html( '${safeChars}' ); ?>` : '<?php the_content(); ?>'}</p>\n`;
      }
      case 'CONTAINER':
      default: {
        const isLoop = props.post_type || node.semantic_role === 'dynamic_post_loop';
        if (isLoop) {
          const cptSlug = props.post_type || 'portfolio_item';
          return `${indent}<!-- Section: ${name || 'Dynamic Loop'} -->\n${indent}<section class="py-12 dynamic-cpt-section">\n${indent}  <div class="container mx-auto px-4">\n${indent}    <?php\n${indent}    $cpt_query = new WP_Query( array(\n${indent}        'post_type'      => '${cptSlug}',\n${indent}        'posts_per_page' => 6,\n${indent}    ) );\n${indent}    if ( $cpt_query->have_posts() ) : ?>\n${indent}      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n${indent}        <?php while ( $cpt_query->have_posts() ) : $cpt_query->the_post(); ?>\n${indent}          <article id="post-<?php the_ID(); ?>" <?php post_class( 'cpt-card p-6 rounded-xl border border-slate-800 bg-slate-900/80' ); ?>>\n${indent}            <?php if ( has_post_thumbnail() ) : ?>\n${indent}              <div class="mb-4 rounded-lg overflow-hidden">\n${indent}                <?php the_post_thumbnail( 'medium_large', array( 'class' => 'w-full h-48 object-cover' ) ); ?>\n${indent}              </div>\n${indent}            <?php endif; ?>\n${indent}            <h3 class="text-xl font-bold text-slate-100 mb-2"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>\n${indent}            <div class="text-slate-400 text-sm mb-4"><?php the_excerpt(); ?></div>\n${indent}            <a href="<?php the_permalink(); ?>" class="text-indigo-400 text-sm font-semibold hover:underline">View Details &rarr;</a>\n${indent}          </article>\n${indent}        <?php endwhile; wp_reset_postdata(); ?>\n${indent}      </div>\n${indent}    <?php endif; ?>\n${indent}  </div>\n${indent}</section>\n`;
        }

        const innerHtml = (node.children || []).map((c) => this.renderNodeHtmlToPhp(c, depth + 1, cleanThemeSlug)).join('');
        return `${indent}<section class="section-block py-8">\n${indent}  <div class="container mx-auto px-4">\n${innerHtml}${indent}  </div>\n${indent}</section>\n`;
      }
    }
  }

  public static generateClassicPageTemplate(
    astRoot: ASTNode | null,
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Generated Theme'
  ): string {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const bodyContent = astRoot ? this.renderNodeHtmlToPhp(astRoot, 1, cleanThemeSlug) : '  <p class="text-slate-400">Empty AST root</p>\n';

    return `<?php
/**
 * Template Name: ${cleanThemeName ? `${cleanThemeName} Template` : 'Figma Generated Page Template'}
 * Description: Clean classic WordPress page template compiled directly from Figma AST tree.
 *
 * @package ${cleanThemeSlug}
 */

get_header();
?>

<main id="primary" class="site-main page-template-container bg-slate-950 text-slate-100 min-h-screen">
${bodyContent}
</main><!-- #primary -->

<?php
get_footer();
`;
  }

  public static generateFrontPagePhp(
    astRoot: ASTNode | null,
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Generated Theme'
  ): string {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const bodyContent = astRoot ? this.renderNodeHtmlToPhp(astRoot, 1, cleanThemeSlug) : '  <p class="text-slate-400">Empty AST root</p>\n';

    return `<?php
/**
 * The front page / homepage template.
 * Displays the AST-derived SaaS Hero & Feature Section design directly
 * as the site's primary homepage upon theme activation.
 *
 * @package ${cleanThemeSlug}
 */

get_header();
?>

<main id="primary" class="site-main front-page-container bg-slate-950 text-slate-100 min-h-screen">
${bodyContent}
</main><!-- #primary -->

<?php
get_footer();
`;
  }

  public static generateHomePhp(
    astRoot: ASTNode | null,
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Generated Theme'
  ): string {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const bodyContent = astRoot ? this.renderNodeHtmlToPhp(astRoot, 1, cleanThemeSlug) : '  <p class="text-slate-400">Empty AST root</p>\n';

    return `<?php
/**
 * The home page template.
 * Displays the AST-derived SaaS Hero & Feature Section layout directly for homepage queries.
 *
 * @package ${cleanThemeSlug}
 */

get_header();
?>

<main id="primary" class="site-main home-page-container bg-slate-950 text-slate-100 min-h-screen">
${bodyContent}
</main><!-- #primary -->

<?php
get_footer();
`;
  }

  public static generateFunctionsPhp(
    astRoot: ASTNode | null,
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Theme'
  ): string {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const cpts = this.extractCustomPostTypes(astRoot);

    let cptRegistrationCode = '';
    for (const cpt of cpts) {
      const funcSlug = cpt.slug.replace(/[^a-zA-Z0-9_]/g, '_');
      const singName = escapePhpString(cpt.singular_name);
      const plurName = escapePhpString(cpt.plural_name);
      cptRegistrationCode += `
    // Register Custom Post Type: ${singName}
    $labels_${funcSlug} = array(
        'name'                  => _x( '${plurName}', 'Post Type General Name', '${cleanThemeSlug}' ),
        'singular_name'         => _x( '${singName}', 'Post Type Singular Name', '${cleanThemeSlug}' ),
        'menu_name'             => __( '${plurName}', '${cleanThemeSlug}' ),
        'all_items'             => __( 'All ${plurName}', '${cleanThemeSlug}' ),
        'add_new_item'          => __( 'Add New ${singName}', '${cleanThemeSlug}' ),
        'add_new'               => __( 'Add New', '${cleanThemeSlug}' ),
        'new_item'              => __( 'New ${singName}', '${cleanThemeSlug}' ),
        'edit_item'             => __( 'Edit ${singName}', '${cleanThemeSlug}' ),
        'update_item'           => __( 'Update ${singName}', '${cleanThemeSlug}' ),
        'view_item'             => __( 'View ${singName}', '${cleanThemeSlug}' ),
        'search_items'          => __( 'Search ${plurName}', '${cleanThemeSlug}' ),
        'not_found'             => __( 'No ${plurName.toLowerCase()} found.', '${cleanThemeSlug}' ),
        'not_found_in_trash'    => __( 'No ${plurName.toLowerCase()} found in Trash.', '${cleanThemeSlug}' ),
    );

    $args_${funcSlug} = array(
        'labels'             => $labels_${funcSlug},
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array( 'slug' => '${cpt.slug.replace(/_/g, '-')}' ),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => ${cpt.menu_position},
        'menu_icon'          => '${cpt.menu_icon}',
        'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
        'show_in_rest'       => true,
    );

    register_post_type( '${cpt.slug}', $args_${funcSlug} );
`;
    }

    const phpSlug = cleanThemeSlug.replace(/-/g, '_');

    return `<?php
/**
 * ${cleanThemeName} functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package ${cleanThemeSlug}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

if ( ! function_exists( '${phpSlug}_setup' ) ) :
    /**
     * Sets up theme defaults and registers support for various WordPress features.
     */
    function ${phpSlug}_setup() {
        // Add default RSS feed links to head.
        add_theme_support( 'automatic-feed-links' );

        // Let WordPress manage the document title.
        add_theme_support( 'title-tag' );

        // Enable support for Post Thumbnails on posts and pages.
        add_theme_support( 'post-thumbnails' );
        set_post_thumbnail_size( 1200, 630, true );

        // Switch default core markup for search form, comment form, and comments to output valid HTML5.
        add_theme_support(
            'html5',
            array(
                'search-form',
                'comment-form',
                'comment-list',
                'gallery',
                'caption',
                'style',
                'script',
            )
        );

        // Custom logo support.
        add_theme_support(
            'custom-logo',
            array(
                'height'      => 80,
                'width'       => 240,
                'flex-width'  => true,
                'flex-height' => true,
            )
        );

        // Register Primary and Footer Navigation Menus.
        register_nav_menus(
            array(
                'primary' => esc_html__( 'Primary Menu', '${cleanThemeSlug}' ),
                'footer'  => esc_html__( 'Footer Menu', '${cleanThemeSlug}' ),
            )
        );
    }
endif;
add_action( 'after_setup_theme', '${phpSlug}_setup' );

/**
 * Enqueue scripts and styles.
 */
function ${phpSlug}_scripts() {
    wp_enqueue_style( '${cleanThemeSlug}-style', get_stylesheet_uri(), array(), '1.0.0' );
    wp_enqueue_style( '${cleanThemeSlug}-tailwind-cdn', 'https://cdn.tailwindcss.com', array(), '3.4.1' );

    if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
        wp_enqueue_script( 'comment-reply' );
    }
}
add_action( 'wp_enqueue_scripts', '${phpSlug}_scripts' );

/**
 * Register Custom Post Types detected from Figma AST Tree.
 */
function ${phpSlug}_register_custom_post_types() {${cptRegistrationCode}}
add_action( 'init', '${phpSlug}_register_custom_post_types' );
`;
  }

  public static generateHeaderPhp(themeSlug: string = 'figma-theme', themeName: string = 'Figma Theme'): string {
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const cleanThemeName = unescapeHtml(themeName);
    return `<?php
/**
 * The header for ${cleanThemeName}
 *
 * @package ${cleanThemeSlug}
 */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>

<body <?php body_class( 'bg-slate-950 text-slate-100 antialiased' ); ?>>
<?php wp_body_open(); ?>

<div id="page" class="site min-h-screen flex flex-col justify-between">
    <header id="masthead" class="site-header border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
            <div class="site-branding flex items-center gap-3">
                <?php
                if ( function_exists( 'the_custom_logo' ) && has_custom_logo() ) {
                    the_custom_logo();
                } else {
                    ?>
                    <h1 class="site-title text-xl font-extrabold tracking-tight text-white">
                        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a>
                    </h1>
                    <?php
                }
                ?>
            </div>

            <nav id="site-navigation" class="main-navigation hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
                <?php
                wp_nav_menu(
                    array(
                        'theme_location' => 'primary',
                        'menu_id'        => 'primary-menu',
                        'container'      => false,
                        'fallback_cb'    => false,
                    )
                );
                ?>
            </nav>
        </div>
    </header><!-- #masthead -->
`;
  }

  public static generateFooterPhp(themeSlug: string = 'figma-theme', themeName: string = 'Figma Theme'): string {
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const cleanThemeName = unescapeHtml(themeName);
    return `<?php
/**
 * The footer for ${cleanThemeName}
 *
 * @package ${cleanThemeSlug}
 */
?>
    <footer id="colophon" class="site-footer border-t border-slate-800 bg-slate-900/90 py-8 text-center text-xs text-slate-400">
        <div class="container mx-auto px-4">
            <p>&copy; <?php echo date( 'Y' ); ?> <?php bloginfo( 'name' ); ?>. All rights reserved.</p>
            <p class="mt-1 text-slate-500">Compiled from Figma AST Compiler Pipeline</p>
        </div>
    </footer><!-- #colophon -->
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
`;
  }

  public static generateIndexPhp(themeSlug: string = 'figma-theme'): string {
    const cleanThemeSlug = unescapeHtml(themeSlug);
    return `<?php
/**
 * The main template file
 *
 * @package ${cleanThemeSlug}
 */

get_header();
?>

<main id="primary" class="site-main container mx-auto px-4 py-12 flex-1">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) :
            the_post();
            ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class( 'mb-8 p-6 rounded-xl bg-slate-900 border border-slate-800' ); ?>>
                <header class="entry-header mb-4">
                    <?php the_title( '<h2 class="entry-title text-2xl font-bold text-white"><a href="' . esc_url( get_permalink() ) . '" rel="bookmark">', '</a></h2>' ); ?>
                </header>
                <div class="entry-content text-slate-300 leading-relaxed">
                    <?php the_excerpt(); ?>
                </div>
            </article>
            <?php
        endwhile;
        the_posts_navigation();
    else :
        ?>
        <p class="text-slate-400"><?php esc_html_e( 'No posts found.', '${cleanThemeSlug}' ); ?></p>
        <?php
    endif;
    ?>
</main><!-- #primary -->

<?php
get_footer();
`;
  }

  public static generateStyleCss(themeName: string = 'Figma Theme', themeSlug: string = 'figma-theme'): string {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    return `/*
Theme Name: ${cleanThemeName}
Theme URI: https://github.com/figma-wordpress-compiler
Author: Figma WordPress AST Compiler
Author URI: https://developer.wordpress.org
Description: High-performance WordPress theme compiled from Figma AST design representations with Full Site Editing and Classic PHP support.
Version: 1.0.0
Requires at least: 6.2
Tested up to: 6.7
Requires PHP: 7.4
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${cleanThemeSlug}
Tags: block-patterns, custom-colors, full-site-editing, custom-post-types, responsive-layout
*/

:root {
  --wp--preset--color--primary: #6366f1;
  --wp--preset--color--secondary: #8b5cf6;
  --wp--preset--color--background: #020617;
  --wp--preset--color--surface: #0f172a;
  --wp--preset--color--text: #f8fafc;
  --wp--preset--color--muted: #94a3b8;
  --wp--preset--color--border: #1e293b;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--wp--preset--color--background);
  color: var(--wp--preset--color--text);
}
`;
  }

  public static generateThemeJson(themeName: string = 'Figma Theme'): string {
    const cleanThemeName = unescapeHtml(themeName);
    return JSON.stringify(
      {
        $schema: 'https://schemas.wp.org/trunk/theme.json',
        version: 3,
        title: cleanThemeName,
        settings: {
          appearanceTools: true,
          layout: {
            contentSize: '840px',
            wideSize: '1280px',
          },
          color: {
            palette: [
              { slug: 'primary', color: '#6366f1', name: 'Primary Indigo' },
              { slug: 'secondary', color: '#8b5cf6', name: 'Secondary Violet' },
              { slug: 'background', color: '#020617', name: 'Slate Dark' },
              { slug: 'surface', color: '#0f172a', name: 'Slate Surface' },
              { slug: 'text', color: '#f8fafc', name: 'Light Text' },
              { slug: 'muted', color: '#94a3b8', name: 'Muted Text' },
              { slug: 'accent', color: '#10b981', name: 'Accent Emerald' },
            ],
          },
          typography: {
            fontFamilies: [
              {
                fontFamily: 'Inter, system-ui, sans-serif',
                name: 'Inter',
                slug: 'inter',
              },
            ],
          },
        },
        styles: {
          color: {
            background: 'var(--wp--preset--color--background)',
            text: 'var(--wp--preset--color--text)',
          },
        },
      },
      null,
      2
    );
  }

  public static generateAllThemeFiles(
    astRoot: ASTNode | null,
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Generated Theme'
  ): GeneratedThemeFile[] {
    const frontPagePhp = this.generateFrontPagePhp(astRoot, themeSlug, themeName);
    const homePhp = this.generateHomePhp(astRoot, themeSlug, themeName);
    const classicPageTemplate = this.generateClassicPageTemplate(astRoot, themeSlug, themeName);
    const functionsPhp = this.generateFunctionsPhp(astRoot, themeSlug, themeName);
    const headerPhp = this.generateHeaderPhp(themeSlug, themeName);
    const footerPhp = this.generateFooterPhp(themeSlug, themeName);
    const indexPhp = this.generateIndexPhp(themeSlug);
    const styleCss = this.generateStyleCss(themeName, themeSlug);
    const themeJson = this.generateThemeJson(themeName);

    // FSE templates
    const fseIndexHtml = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:query {"queryId":1,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->
<div class="wp-block-query">
  <!-- wp:post-template -->
  <!-- wp:post-title {"isLink":true} /-->
  <!-- wp:post-excerpt /-->
  <!-- /wp:post-template -->
</div>
<!-- /wp:query -->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;

    const fsePageHtml = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;

    const fseHeaderHtml = `<!-- wp:group {"tagName":"header","align":"full","className":"site-header bg-slate-900"} -->
<header class="wp-block-group alignfull site-header">
  <!-- wp:site-title /-->
  <!-- wp:navigation /-->
</header>
<!-- /wp:group -->`;

    const fseFooterHtml = `<!-- wp:group {"tagName":"footer","align":"full","className":"site-footer bg-slate-900"} -->
<footer class="wp-block-group alignfull site-footer">
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">&copy; ${unescapeHtml(themeName)}. All rights reserved.</p>
  <!-- /wp:paragraph -->
</footer>
<!-- /wp:group -->`;

    // Codegen templates & Python generator
    const codegenPy = `"""
WordPress Theme Generator: Compiles AST intermediate representations into WordPress themes.
Supports both Classic PHP templates and FSE block themes.
"""
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader
from ast.nodes import ASTNode

class WordPressThemeGenerator:
    def __init__(self, ast_root: ASTNode, theme_name: str = "Figma Theme", theme_slug: str = "figma-theme"):
        self.ast_root = ast_root
        self.theme_name = theme_name
        self.theme_slug = theme_slug
        self.env = Environment(loader=FileSystemLoader("codegen/templates"), autoescape=False)

    def generate_theme_files(self, export_format: str = "all") -> Dict[str, str]:
        if export_format == "classic":
            return self.generate_classic_theme_files()
        elif export_format == "fse":
            return self.generate_fse_theme_files()
        else:
            files = self.generate_classic_theme_files()
            files["theme.json"] = self.generate_theme_json()
            return files
`;

    const pageTemplateJ2 = `<?php
/**
 * Template Name: {{ template_name | default('Figma Generated Page Template') }}
 * Description: Clean WordPress page template generated from AST intermediate representation.
 *
 * @package {{ theme_slug | default('figma-theme') }}
 */

get_header();
?>

<main id="primary" class="site-main {{ main_class | default('page-container') }}">
{{ body_content }}
</main><!-- #primary -->

<?php
get_footer();
`;

    const functionsPhpJ2 = `<?php
/**
 * {{ theme_name }} functions and definitions
 *
 * @package {{ theme_slug }}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function {{ php_slug }}_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    register_nav_menus( array( 'primary' => esc_html__( 'Primary Menu', '{{ theme_slug }}' ) ) );
}
add_action( 'after_setup_theme', '{{ php_slug }}_setup' );
`;

    return [
      // Rendered Classic WordPress Theme Files (Flat at theme root)
      { filename: 'front-page.php', path: 'front-page.php', category: 'classic', language: 'php', content: frontPagePhp },
      { filename: 'home.php', path: 'home.php', category: 'classic', language: 'php', content: homePhp },
      { filename: 'page-template.php', path: 'page-template.php', category: 'classic', language: 'php', content: classicPageTemplate },
      { filename: 'style.css', path: 'style.css', category: 'classic', language: 'css', content: styleCss },
      { filename: 'functions.php', path: 'functions.php', category: 'classic', language: 'php', content: functionsPhp },
      { filename: 'header.php', path: 'header.php', category: 'classic', language: 'php', content: headerPhp },
      { filename: 'footer.php', path: 'footer.php', category: 'classic', language: 'php', content: footerPhp },
      { filename: 'index.php', path: 'index.php', category: 'classic', language: 'php', content: indexPhp },

      // Rendered Full Site Editing (FSE) Block Theme Files
      { filename: 'theme.json', path: 'theme.json', category: 'fse', language: 'json', content: themeJson },
      { filename: 'templates/index.html', path: 'templates/index.html', category: 'fse', language: 'html', content: fseIndexHtml },
      { filename: 'templates/page.html', path: 'templates/page.html', category: 'fse', language: 'html', content: fsePageHtml },
      { filename: 'parts/header.html', path: 'parts/header.html', category: 'fse', language: 'html', content: fseHeaderHtml },
      { filename: 'parts/footer.html', path: 'parts/footer.html', category: 'fse', language: 'html', content: fseFooterHtml },
    ];
  }

  public static async bundleAndDownloadZip(
    astRoot: ASTNode | null,
    format: 'all' | 'classic' | 'fse' = 'all',
    themeSlug: string = 'figma-theme',
    themeName: string = 'Figma Generated Theme'
  ): Promise<void> {
    const cleanThemeName = unescapeHtml(themeName);
    const cleanThemeSlug = unescapeHtml(themeSlug);
    const zip = new JSZip();
    const allFiles = this.generateAllThemeFiles(astRoot, cleanThemeSlug, cleanThemeName);

    // All files are placed FLAT at the root of the ZIP archive
    // so WordPress immediately detects style.css and theme headers upon extraction / upload
    if (format === 'classic') {
      const classicFiles = allFiles.filter((f) => f.category === 'classic');
      for (const f of classicFiles) {
        zip.file(f.path, f.content);
      }
      zip.file(
        'README.md',
        `# ${cleanThemeName} - Classic WordPress Theme

Transpiled from Figma AST Intermediate Representation (IR).

## Installation:
1. Extract or upload this ZIP directly into \`/wp-content/themes/${cleanThemeSlug}/\`
2. \`style.css\` is placed flat at the theme root for immediate WordPress theme detection.
3. Activate via WordPress Admin -> Appearance -> Themes.
`
      );
    } else if (format === 'fse') {
      // FSE requires style.css and theme.json at root, plus templates/ and parts/
      const fseFiles = allFiles.filter((f) => f.category === 'fse');
      const styleCss = allFiles.find((f) => f.filename === 'style.css')?.content || '';
      zip.file('style.css', styleCss);
      for (const f of fseFiles) {
        zip.file(f.path, f.content);
      }
      zip.file(
        'README.md',
        `# ${cleanThemeName} - WordPress Full Site Editing (FSE) Theme

Transpiled from Figma AST Intermediate Representation (IR).

## Installation:
1. Extract or upload this ZIP into \`/wp-content/themes/${cleanThemeSlug}/\`
2. Includes \`theme.json\` v3, block templates in \`/templates/\`, and template parts in \`/parts/\`.
3. Activate via WordPress Admin -> Appearance -> Themes.
`
      );
    } else {
      // "all" / Default: Complete Hybrid Theme Package placed FLAT at the root
      // Contains both Classic PHP templates and Block Theme theme.json/templates
      for (const f of allFiles) {
        zip.file(f.path, f.content);
      }

      zip.file(
        'README.md',
        `# ${cleanThemeName} - WordPress Theme Package

Transpiled from Figma AST Intermediate Representation (IR).
All rendered files are placed FLAT at the root of this theme archive for instant WordPress activation.

## Files at Theme Root:
- \`style.css\` - Theme declaration header and preset CSS variables
- \`functions.php\` - Theme features, menu registration, and dynamic Custom Post Type (CPT) registrations
- \`page-template.php\` - Rendered AST page template
- \`header.php\` - Semantic site header and navigation
- \`footer.php\` - Semantic site footer
- \`index.php\` - Main template loop fallback
- \`theme.json\` - Full Site Editing configuration (palette, layout, typography)
- \`templates/\` - Block templates (index.html, page.html)
- \`parts/\` - Block template parts (header.html, footer.html)

## Installation:
1. Upload this ZIP directly via WordPress Admin -> Appearance -> Themes -> Add New -> Upload Theme
2. Or extract directly into \`/wp-content/themes/${cleanThemeSlug}/\`
3. Activate the theme!
`
      );
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const zipName =
      format === 'classic'
        ? `${cleanThemeSlug}-classic.zip`
        : format === 'fse'
        ? `${cleanThemeSlug}-fse.zip`
        : `${cleanThemeSlug}.zip`;
    saveAs(blob, zipName);
  }
}
