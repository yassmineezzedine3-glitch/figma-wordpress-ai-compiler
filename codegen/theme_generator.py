"""
figma-wordpress-compiler: WordPress Theme Code Generator
Recursively traverses ASTNode intermediate representation trees and compiles
WordPress template files (page-template.php, functions.php with CPT registration,
style.css with theme header metadata, header.php, footer.php, index.php, theme.json)
using Jinja2 templates.
"""
import os
import re
import html
import zipfile
from typing import Dict, Any, List, Optional, Set
import jinja2

from ast.nodes import ASTNode, AstNode


class WordPressThemeGenerator:
    """
    WordPress theme generator engine that walks an ASTNode hierarchy
    and produces production-grade PHP templates and theme assets.
    """

    def __init__(
        self,
        ast_root: ASTNode,
        tokens: Optional[Dict[str, Any]] = None,
        theme_name: str = "Figma Generated Theme",
        theme_slug: str = "figma-theme",
        author: str = "Figma WordPress Compiler",
        version: str = "1.0.0",
        description: str = "Production-grade WordPress theme generated from Figma ASTNode tree.",
    ):
        self.ast_root = ast_root
        self.tokens = tokens or {}
        # Unescape HTML entities so theme name, author, description contain canonical characters (e.g. & instead of &amp;)
        self.theme_name = html.unescape(str(theme_name))
        self.theme_slug = theme_slug.lower().replace("_", "-").strip("-")
        self.function_prefix = self.theme_slug.replace("-", "_")
        self.author = html.unescape(str(author))
        self.version = str(version)
        self.description = html.unescape(str(description))

        # Set up Jinja2 environment pointing to /codegen/templates.
        # Disable autoescape so PHP templates and CSS style headers do not double-encode & into &amp;.
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(template_dir),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def generate_theme_files(self, export_format: str = "all") -> Dict[str, str]:
        """
        Generates WordPress theme files from the AST tree.

        Args:
            export_format: 'classic' (standard PHP templates + functions.php),
                           'fse' (Full Site Editing block theme templates + theme.json),
                           or 'all' (classic PHP templates + FSE theme.json option).
        """
        if export_format == "classic":
            return self.generate_classic_theme_files()
        elif export_format == "fse":
            return self.generate_fse_theme_files()
        else:
            files = self.generate_classic_theme_files()
            files["theme.json"] = self.generate_theme_json()
            return files

    def export_theme_zip(self, zip_path: str, export_format: str = "all") -> str:
        """
        Exports the rendered theme files into a ZIP archive placed FLAT at the root.
        This ensures WordPress immediately detects style.css and template files upon extraction.
        """
        files = self.generate_theme_files(export_format=export_format)
        os.makedirs(os.path.dirname(os.path.abspath(zip_path)), exist_ok=True)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for filename, content in files.items():
                zip_file.writestr(filename, content)
        return zip_path

    def generate_classic_theme_files(self) -> Dict[str, str]:
        """
        Generates classic WordPress PHP template files from the AST tree.
        Includes front-page.php and home.php so the activated theme immediately
        displays the AST-derived layout instead of the default WordPress post loop.
        """
        return {
            "front-page.php": self.generate_front_page_php(),
            "home.php": self.generate_home_php(),
            "page-template.php": self.generate_page_template(),
            "functions.php": self.generate_functions_php(),
            "style.css": self.generate_style_css(),
            "header.php": self.generate_header_php(),
            "footer.php": self.generate_footer_php(),
            "index.php": self.generate_index_php(),
        }

    def generate_fse_theme_files(self) -> Dict[str, str]:
        """
        Generates Full Site Editing (FSE) block theme files as an alternative export.
        """
        return {
            "theme.json": self.generate_theme_json(),
            "style.css": self.generate_style_css(),
            "templates/index.html": self.generate_fse_index_html(),
            "templates/page.html": self.generate_fse_page_html(),
            "parts/header.html": self.generate_fse_header_html(),
            "parts/footer.html": self.generate_fse_footer_html(),
        }

    def generate_fse_header_html(self) -> str:
        """Generates FSE header template part HTML."""
        return f'<!-- wp:group {{"tagName":"header","align":"full","className":"site-header"}} -->\n<header class="wp-block-group alignfull site-header">\n  <!-- wp:site-title /-->\n  <!-- wp:navigation /-->\n</header>\n<!-- /wp:group -->'

    def generate_fse_footer_html(self) -> str:
        """Generates FSE footer template part HTML."""
        return f'<!-- wp:group {{"tagName":"footer","align":"full","className":"site-footer"}} -->\n<footer class="wp-block-group alignfull site-footer">\n  <!-- wp:paragraph {{"align":"center"}} -->\n  <p class="has-text-align-center">&copy; {self.theme_name}. All rights reserved.</p>\n  <!-- /wp:paragraph -->\n</footer>\n<!-- /wp:group -->'

    def generate_fse_page_html(self) -> str:
        """Generates FSE page template HTML."""
        return '<!-- wp:template-part {"slug":"header","tagName":"header"} /-->\n<!-- wp:post-content {"layout":{"type":"constrained"}} /-->\n<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->'

    def generate_fse_index_html(self) -> str:
        """Generates FSE index template HTML."""
        return '<!-- wp:template-part {"slug":"header","tagName":"header"} /-->\n<!-- wp:query {"queryId":1,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->\n<div class="wp-block-query"><!-- wp:post-template -->\n<!-- wp:post-title {"isLink":true} /-->\n<!-- wp:post-excerpt /-->\n<!-- /wp:post-template --></div>\n<!-- /wp:query -->\n<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->'

    def _escape_php_string(self, text: str) -> str:
        """
        Unescapes any HTML entities (e.g. &amp; -> &) and escapes backslashes
        and single quotes for PHP single-quoted string literals.
        This prevents double-encoding HTML entities while ensuring valid PHP syntax.
        """
        if not text:
            return ""
        raw_text = html.unescape(str(text))
        return raw_text.replace("\\", "\\\\").replace("'", "\\'")

    def generate_page_template(self, template_name: Optional[str] = None) -> str:
        """
        Recursively compiles the ASTNode tree into a page-template.php file.
        """
        tpl_name = template_name or f"{self.theme_name} Template"
        tpl_name = html.unescape(str(tpl_name))
        template = self.jinja_env.get_template("page-template.php.j2")

        # Recursively render body HTML/PHP from AST root
        body_content = self._render_node(self.ast_root, depth=1)

        return template.render(
            template_name=tpl_name,
            theme_slug=self.theme_slug,
            main_class=f"{self.theme_slug}-page",
            body_content=body_content,
        )

    def generate_functions_php(self) -> str:
        """
        Compiles functions.php registering required features and any Custom Post Types
        discovered during AST traversal.
        """
        template = self.jinja_env.get_template("functions.php.j2")
        custom_post_types = self._extract_custom_post_types(self.ast_root)

        return template.render(
            theme_name=self.theme_name,
            theme_slug=self.theme_slug,
            theme_version=self.version,
            function_prefix=self.function_prefix,
            custom_post_types=custom_post_types,
        )

    def generate_style_css(self) -> str:
        """
        Compiles style.css with WordPress theme header comments and preset styles.
        """
        template = self.jinja_env.get_template("style.css.j2")
        colors = self._extract_color_presets()
        typography = self._extract_typography_presets()

        return template.render(
            theme_name=self.theme_name,
            theme_slug=self.theme_slug,
            author=self.author,
            version=self.version,
            description=self.description,
            colors=colors,
            typography=typography,
        )

    def generate_front_page_php(self) -> str:
        """
        Renders front-page.php template compiling the AST intermediate representation
        directly into the primary homepage template.
        """
        template = self.jinja_env.get_template("front-page.php.j2")
        body_content = self._render_node(self.ast_root, depth=1)
        return template.render(
            theme_slug=self.theme_slug,
            main_class=f"{self.theme_slug}-front-page",
            body_content=body_content,
        )

    def generate_home_php(self) -> str:
        """
        Renders home.php template rendering the AST layout for WordPress home queries.
        """
        template = self.jinja_env.get_template("home.php.j2")
        body_content = self._render_node(self.ast_root, depth=1)
        return template.render(
            theme_slug=self.theme_slug,
            main_class=f"{self.theme_slug}-home-page",
            body_content=body_content,
        )

    def generate_header_php(self) -> str:
        """Renders header.php template."""
        template = self.jinja_env.get_template("header.php.j2")
        return template.render(theme_slug=self.theme_slug)

    def generate_footer_php(self) -> str:
        """Renders footer.php template."""
        template = self.jinja_env.get_template("footer.php.j2")
        return template.render(theme_slug=self.theme_slug)

    def generate_index_php(self) -> str:
        """Renders index.php fallback template."""
        template = self.jinja_env.get_template("index.php.j2")
        return template.render(theme_slug=self.theme_slug)

    def generate_theme_json(self) -> str:
        """Generates WordPress Full Site Editing theme.json."""
        return f"""{{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "title": "{self.theme_name}",
  "settings": {{
    "appearanceTools": true,
    "layout": {{
      "contentSize": "840px",
      "wideSize": "1200px"
    }},
    "color": {{
      "palette": [
        {{
          "slug": "primary",
          "color": "#0F172A",
          "name": "Primary"
        }},
        {{
          "slug": "accent",
          "color": "#2563EB",
          "name": "Accent"
        }},
        {{
          "slug": "background",
          "color": "#FFFFFF",
          "name": "Background"
        }}
      ]
    }}
  }}
}}
"""

    def _render_node(self, node: ASTNode, depth: int = 0) -> str:
        """
        Recursively traverses ASTNode and emits semantic WordPress HTML/PHP structure.
        """
        if not node:
            return ""

        indent = "  " * depth
        node_type = getattr(node, "node_type", "CONTAINER").upper()
        role = getattr(node, "semantic_role", "") or ""
        props = getattr(node, "properties", {}) or {}
        name = props.get("name", "")
        chars = props.get("characters", "")
        css_id = props.get("id", "").replace(":", "-")

        # 1. NAV / Site Header
        if node_type == "NAV" or role in ("site_header", "navigation_menu"):
            return (
                f"{indent}<header class=\"site-header\" id=\"{css_id or 'masthead'}\">\n"
                f"{indent}  <div class=\"site-branding\">\n"
                f"{indent}    <?php if ( has_custom_logo() ) : the_custom_logo(); else : ?>\n"
                f"{indent}      <a href=\"<?php echo esc_url( home_url( '/' ) ); ?>\" rel=\"home\"><?php bloginfo( 'name' ); ?></a>\n"
                f"{indent}    <?php endif; ?>\n"
                f"{indent}  </div>\n"
                f"{indent}  <nav class=\"main-navigation\" aria-label=\"<?php esc_attr_e( 'Primary Menu', '{self.theme_slug}' ); ?>\">\n"
                f"{indent}    <?php wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false ) ); ?>\n"
                f"{indent}  </nav>\n"
                f"{indent}</header>"
            )

        # 2. HEADING
        if node_type == "HEADING":
            heading_tag = self._get_heading_tag(node)
            classes = ["heading", f"heading-{heading_tag}"]
            if role:
                classes.append(role.replace("_", "-"))

            class_str = " ".join(classes)
            if chars:
                safe_text = self._escape_php_string(chars)
                return f"{indent}<{heading_tag} class=\"{class_str}\"><?php echo esc_html( '{safe_text}' ); ?></{heading_tag}>"
            elif role in ("post_title", "card_title", "dynamic_title"):
                return f"{indent}<{heading_tag} class=\"{class_str}\"><?php the_title(); ?></{heading_tag}>"
            else:
                return f"{indent}<{heading_tag} class=\"{class_str}\"><?php the_title(); ?></{heading_tag}>"

        # 3. BUTTON
        if node_type == "BUTTON":
            btn_label = chars or props.get("label", "")
            if not btn_label and node.children:
                for child in node.children:
                    child_chars = child.properties.get("characters")
                    if child_chars:
                        btn_label = child_chars
                        break
                    if child.children:
                        for sub_child in child.children:
                            sub_chars = sub_child.properties.get("characters")
                            if sub_chars:
                                btn_label = sub_chars
                                break
                        if btn_label:
                            break
            if not btn_label:
                btn_label = "Read More"

            safe_label = self._escape_php_string(btn_label)
            classes = ["btn", "btn-primary"]
            if role:
                classes.append(role.replace("_", "-"))
            class_str = " ".join(classes)
            return (
                f"{indent}<a href=\"<?php echo esc_url( home_url( '/' ) ); ?>\" class=\"{class_str}\">"
                f"<?php echo esc_html( '{safe_label}' ); ?></a>"
            )

        # 4. IMAGE
        if node_type == "IMAGE":
            classes = ["theme-image"]
            if role:
                classes.append(role.replace("_", "-"))
            class_str = " ".join(classes)
            alt_text = name or "Featured Graphic"
            safe_alt = self._escape_php_string(alt_text)

            if role in ("featured_image", "post_thumbnail", "card_image"):
                return (
                    f"{indent}<?php if ( has_post_thumbnail() ) : ?>\n"
                    f"{indent}  <?php the_post_thumbnail( 'large', array( 'class' => '{class_str}' ) ); ?>\n"
                    f"{indent}<?php else : ?>\n"
                    f"{indent}  <img src=\"<?php echo esc_url( get_template_directory_uri() . '/assets/placeholder.png' ); ?>\" alt=\"<?php echo esc_attr( '{safe_alt}' ); ?>\" class=\"{class_str}\" />\n"
                    f"{indent}<?php endif; ?>"
                )
            else:
                return (
                    f"{indent}<img src=\"<?php echo esc_url( get_template_directory_uri() . '/assets/placeholder.png' ); ?>\" "
                    f"alt=\"<?php echo esc_attr( '{safe_alt}' ); ?>\" class=\"{class_str}\" />"
                )

        # 5. TEXT_BLOCK
        if node_type == "TEXT_BLOCK":
            classes = ["text-block"]
            if role:
                classes.append(role.replace("_", "-"))
            class_str = " ".join(classes)

            if role in ("post_content", "body_content"):
                return f"{indent}<div class=\"entry-content\"><?php the_content(); ?></div>"
            elif role in ("post_excerpt", "card_excerpt"):
                return f"{indent}<div class=\"entry-excerpt\"><?php the_excerpt(); ?></div>"
            elif chars:
                safe_text = self._escape_php_string(chars)
                return f"{indent}<p class=\"{class_str}\"><?php echo esc_html( '{safe_text}' ); ?></p>"
            else:
                return f"{indent}<p class=\"{class_str}\"><?php the_content(); ?></p>"

        # 6. CARD
        if node_type == "CARD":
            classes = ["card", "theme-card"]
            if role:
                classes.append(role.replace("_", "-"))
            class_str = " ".join(classes)

            children_html = "\n".join(
                self._render_node(child, depth + 1) for child in node.children
            )
            return (
                f"{indent}<article class=\"{class_str} <?php echo esc_attr( join( ' ', get_post_class() ) ); ?>\">\n"
                f"{indent}  <div class=\"card-body\">\n"
                f"{children_html}\n"
                f"{indent}  </div>\n"
                f"{indent}</article>"
            )

        # 7. Dynamic Loop / CPT Query Container
        if role in ("dynamic_post_loop", "cpt_loop") or props.get("post_type"):
            post_type = props.get("post_type", "post")
            posts_per_page = int(props.get("posts_per_page", 6))
            children_html = "\n".join(
                self._render_node(child, depth + 1) for child in node.children
            )
            return (
                f"{indent}<?php\n"
                f"{indent}$query_{post_type} = new WP_Query( array(\n"
                f"{indent}  'post_type'      => '{post_type}',\n"
                f"{indent}  'posts_per_page' => {posts_per_page},\n"
                f"{indent}) );\n"
                f"{indent}if ( $query_{post_type}->have_posts() ) : \n"
                f"{indent}  while ( $query_{post_type}->have_posts() ) : $query_{post_type}->the_post();\n"
                f"{indent}?>\n"
                f"{children_html}\n"
                f"{indent}<?php\n"
                f"{indent}  endwhile;\n"
                f"{indent}  wp_reset_postdata();\n"
                f"{indent}endif;\n"
                f"{indent}?>"
            )

        # 8. PHP HOOK
        if node_type == "HOOK" or role == "php_hook":
            hook_name = props.get("hook_name", f"{self.function_prefix}_custom_hook")
            return f"{indent}<?php do_action( '{hook_name}' ); ?>"

        # 9. CONTAINER / SECTION / Default recursive container
        container_tag = "section" if (role in ("hero_section", "section", "feature_section") or "section" in name.lower()) else "div"
        classes = []
        if container_tag == "section":
            classes.append("section")
        else:
            classes.append("container")

        if role:
            classes.append(role.replace("_", "-"))
        if props.get("layoutMode") in ("HORIZONTAL", "VERTICAL"):
            classes.append(f"layout-{props['layoutMode'].lower()}")

        class_str = " ".join(classes)
        id_attr = f" id=\"{css_id}\"" if css_id else ""

        rendered_children = [
            self._render_node(child, depth + 1) for child in node.children
        ]
        children_html = "\n".join(rc for rc in rendered_children if rc)

        if not children_html:
            return f"{indent}<{container_tag} class=\"{class_str}\"{id_attr}></{container_tag}>"

        return (
            f"{indent}<{container_tag} class=\"{class_str}\"{id_attr}>\n"
            f"{children_html}\n"
            f"{indent}</{container_tag}>"
        )

    def _get_heading_tag(self, node: ASTNode) -> str:
        """Determines h1-h6 tag for a HEADING ASTNode."""
        role = getattr(node, "semantic_role", "") or ""
        props = getattr(node, "properties", {}) or {}
        style = props.get("style", {}) if isinstance(props.get("style"), dict) else {}
        font_size = float(style.get("fontSize", 0) or 0)

        if role in ("hero_title", "page_title", "site_title"):
            return "h1"
        if role in ("section_title", "hero_subtitle"):
            return "h2"
        if role in ("card_title", "feature_title"):
            return "h3"

        if font_size >= 36:
            return "h1"
        if font_size >= 28:
            return "h2"
        if font_size >= 20:
            return "h3"
        if font_size >= 16:
            return "h4"

        level = props.get("heading_level", 2)
        return f"h{level}"

    def _extract_custom_post_types(self, root: ASTNode) -> List[Dict[str, Any]]:
        """
        Recursively scans the AST tree for custom post type definitions.
        """
        cpts: List[Dict[str, Any]] = []
        seen_slugs: Set[str] = set()

        def _scan(node: ASTNode):
            if not node:
                return

            props = getattr(node, "properties", {}) or {}
            role = getattr(node, "semantic_role", "") or ""

            # Check explicit post_type property or CPT loop role
            post_type_slug = props.get("post_type") or props.get("cpt") or props.get("custom_post_type")
            if not post_type_slug and role in ("dynamic_post_loop", "cpt_loop"):
                post_type_slug = props.get("cpt_slug", "portfolio")
            elif not post_type_slug and role.startswith("cpt_"):
                post_type_slug = role.replace("cpt_", "")

            if post_type_slug and post_type_slug not in ("post", "page", "attachment"):
                slug = str(post_type_slug).lower().replace(" ", "_")
                if slug not in seen_slugs:
                    seen_slugs.add(slug)
                    singular = props.get("singular_name") or slug.replace("_", " ").replace("-", " ").title()
                    plural = props.get("plural_name") or f"{singular}s"
                    
                    # Contextual Dashicon assignment
                    menu_icon = props.get("menu_icon")
                    if not menu_icon:
                        if any(k in slug for k in ("portfolio", "project", "work", "case")):
                            menu_icon = "dashicons-portfolio"
                        elif any(k in slug for k in ("team", "member", "author", "person", "staff")):
                            menu_icon = "dashicons-groups"
                        elif any(k in slug for k in ("testimonial", "review", "quote")):
                            menu_icon = "dashicons-testimonial"
                        elif any(k in slug for k in ("service", "feature", "product")):
                            menu_icon = "dashicons-admin-tools"
                        elif any(k in slug for k in ("faq", "help", "question")):
                            menu_icon = "dashicons-editor-help"
                        elif any(k in slug for k in ("event", "schedule")):
                            menu_icon = "dashicons-calendar-alt"
                        else:
                            menu_icon = "dashicons-admin-post"

                    cpts.append(
                        {
                            "slug": slug,
                            "singular_name": singular,
                            "plural_name": plural,
                            "public": props.get("public", True),
                            "has_archive": props.get("has_archive", True),
                            "menu_icon": menu_icon,
                            "menu_position": props.get("menu_position", 20),
                            "supports": props.get(
                                "supports",
                                ["title", "editor", "thumbnail", "excerpt", "custom-fields"],
                            ),
                        }
                    )

            for child in getattr(node, "children", []):
                _scan(child)

        _scan(root)
        return cpts

    def _extract_color_presets(self) -> Dict[str, str]:
        """Extracts color presets from tokens or AST properties."""
        return {
            "primary": self.tokens.get("colors", {}).get("primary", "#0f172a"),
            "secondary": self.tokens.get("colors", {}).get("secondary", "#334155"),
            "accent": self.tokens.get("colors", {}).get("accent", "#2563eb"),
            "background": self.tokens.get("colors", {}).get("background", "#ffffff"),
            "surface": self.tokens.get("colors", {}).get("surface", "#f8fafc"),
            "text": self.tokens.get("colors", {}).get("text", "#0f172a"),
            "muted": self.tokens.get("colors", {}).get("muted", "#64748b"),
        }

    def _extract_typography_presets(self) -> Dict[str, str]:
        """Extracts typography presets from tokens."""
        return {
            "font_family": self.tokens.get("typography", {}).get(
                "font_family", "system-ui, -apple-system, sans-serif"
            ),
        }


# Alias for convenience
ThemeGenerator = WordPressThemeGenerator


def generate(
    ast_root: ASTNode,
    tokens: Optional[Dict[str, Any]] = None,
    theme_name: str = "Figma Generated Theme",
    theme_slug: str = "figma-theme",
    author: str = "Figma WordPress Compiler",
    version: str = "1.0.0",
    description: str = "Production-grade WordPress theme generated from Figma ASTNode tree.",
) -> Dict[str, str]:
    """
    Direct function alias to compile an ASTNode tree into WordPress theme files.
    """
    generator = WordPressThemeGenerator(
        ast_root=ast_root,
        tokens=tokens,
        theme_name=theme_name,
        theme_slug=theme_slug,
        author=author,
        version=version,
        description=description,
    )
    return generator.generate_theme_files()


generate_theme = generate


def generate_theme_from_ast(
    ast_root: ASTNode,
    tokens: Optional[Dict[str, Any]] = None,
    theme_name: str = "Figma Generated Theme",
    theme_slug: str = "figma-theme",
) -> Dict[str, str]:
    """
    Convenience function that generates all WordPress theme files from an ASTNode tree.
    """
    generator = WordPressThemeGenerator(
        ast_root=ast_root,
        tokens=tokens,
        theme_name=theme_name,
        theme_slug=theme_slug,
    )
    return generator.generate_theme_files()


def generate_template_from_ast(
    ast_root: ASTNode,
    template_name: str = "Figma Generated Page Template",
    theme_slug: str = "figma-theme",
) -> str:
    """
    Convenience function that generates page-template.php directly from an ASTNode tree.
    """
    generator = WordPressThemeGenerator(
        ast_root=ast_root,
        theme_slug=theme_slug,
    )
    return generator.generate_page_template(template_name=template_name)


def export_theme_zip(
    ast_root: ASTNode,
    zip_path: str,
    export_format: str = "all",
    theme_name: str = "Figma Generated Theme",
    theme_slug: str = "figma-theme",
) -> str:
    """
    Convenience function to package rendered WordPress theme files into a ZIP archive placed FLAT at the root.
    """
    generator = WordPressThemeGenerator(
        ast_root=ast_root,
        theme_name=theme_name,
        theme_slug=theme_slug,
    )
    return generator.export_theme_zip(zip_path=zip_path, export_format=export_format)

