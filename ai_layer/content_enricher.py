"""
figma-wordpress-compiler: Claude AI Content Enrichment Layer
Takes an ASTNode tree and calls the Claude API (model: claude-sonnet-4-5) to:
1. Generate descriptive, accessibility-compliant alt text for IMAGE nodes missing descriptions.
2. Generate SEO-friendly meta description text based on page content.
3. Detect and flag TEXT_BLOCK nodes containing placeholder / Lorem Ipsum content.
Returns an updated ASTNode with enriched properties.
"""
import os
import re
import json
from typing import Dict, Any, List, Optional, Tuple, Union
import requests

from ast.nodes import ASTNode


class ContentEnrichmentError(Exception):
    """Base exception for content enrichment failures."""
    pass


class ClaudeAPIError(ContentEnrichmentError):
    """Exception raised when Claude API returns an error or invalid response."""
    pass


class ContentEnricher:
    """
    Enriches an AST intermediate representation tree with accessibility alt text,
    SEO metadata, and placeholder content detection using the Claude API.
    """

    DEFAULT_MODEL = "claude-sonnet-4-5"
    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    # Known patterns for placeholder / dummy text
    LOREM_IPSUM_REGEX = re.compile(
        r"(lorem\s+ipsum|dolor\s+sit\s+amet|consectetur\s+adipiscing|nullam\s+quis|"
        r"sample\s+text|placeholder\s+text|your\s+text\s+here|insert\s+copy|"
        r"tempus\s+imperdiet|vestibulum\s+ante|sed\s+do\s+eiusmod|duis\s+aute|"
        r"adipiscing\s+elit|lorem\s+ipsum\s+dolor|ipsum\s+quia\s+dolor|"
        r"text\s+placeholder|headline\s+goes\s+here|lorem)",
        re.IGNORECASE,
    )

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        base_url: Optional[str] = None,
        client: Optional[Any] = None,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY") or ""
        self.model = model or self.DEFAULT_MODEL
        self.base_url = base_url or self.ANTHROPIC_API_URL
        self.client = client

    def enrich(self, ast_root: ASTNode) -> ASTNode:
        """
        Enriches the given ASTNode hierarchy.
        
        1. Identifies IMAGE nodes missing descriptions and generates alt text.
        2. Synthesizes an SEO meta description on the root ASTNode.
        3. Identifies and flags TEXT_BLOCK nodes containing placeholder copy.
        
        Returns the updated root ASTNode.
        """
        if not ast_root:
            return ast_root

        # 1. Extract AST context, image nodes missing descriptions, and text nodes
        image_nodes, text_nodes, page_context = self._extract_ast_context(ast_root)

        # 2. Build prompt payload
        prompt_payload = self._build_prompt_payload(page_context, image_nodes, text_nodes)

        # 3. Call Claude API (model: claude-sonnet-4-5)
        enrichment_data = self._call_claude_api(prompt_payload)

        # 4. Apply enriched properties to AST nodes
        self._apply_enrichments(ast_root, enrichment_data, image_nodes, text_nodes)

        return ast_root

    def _extract_ast_context(
        self, root: ASTNode
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Traverses the AST tree and collects IMAGE nodes missing alt text,
        TEXT_BLOCK nodes, and overall page context.
        """
        image_nodes: List[Dict[str, Any]] = []
        text_nodes: List[Dict[str, Any]] = []
        headings: List[str] = []
        all_text_snippets: List[str] = []

        def _traverse(node: ASTNode, parent_name: str = ""):
            if not node:
                return

            node_type = getattr(node, "node_type", "").upper()
            role = getattr(node, "semantic_role", "") or ""
            props = getattr(node, "properties", {}) or {}
            node_id = str(props.get("id", props.get("figma_node_id", f"node_{id(node)}")))
            name = props.get("name", "")
            chars = props.get("characters", "")

            # Check for IMAGE nodes missing descriptions
            if node_type == "IMAGE" or role in ("featured_image", "post_thumbnail", "card_image", "image"):
                existing_alt = props.get("alt") or props.get("alt_text") or props.get("description")
                if not existing_alt or str(existing_alt).strip() == "" or self.LOREM_IPSUM_REGEX.search(str(existing_alt)):
                    image_nodes.append({
                        "node_id": node_id,
                        "name": name,
                        "parent_section": parent_name,
                        "semantic_role": role,
                        "node_ref": node,
                    })

            # Check for HEADING nodes for page context
            if node_type == "HEADING" or "title" in role or "heading" in role:
                if chars:
                    headings.append(chars)
                    all_text_snippets.append(chars)

            # Check for TEXT_BLOCK / TEXT nodes
            if node_type in ("TEXT_BLOCK", "TEXT") or role in ("post_content", "post_excerpt", "card_excerpt", "hero_subtitle", "text_block"):
                if chars:
                    all_text_snippets.append(chars)
                    text_nodes.append({
                        "node_id": node_id,
                        "name": name,
                        "characters": chars,
                        "semantic_role": role,
                        "parent_section": parent_name,
                        "node_ref": node,
                    })

            curr_section = name if (node_type in ("CONTAINER", "SECTION") or "section" in name.lower()) else parent_name

            for child in getattr(node, "children", []):
                _traverse(child, curr_section)

        _traverse(root, "Root")

        page_name = getattr(root, "properties", {}).get("name", "WordPress Landing Page")
        page_context = {
            "page_title": page_name,
            "headings": headings,
            "text_content": " | ".join(all_text_snippets[:12]),
        }

        return image_nodes, text_nodes, page_context

    def _build_prompt_payload(
        self,
        page_context: Dict[str, Any],
        image_nodes: List[Dict[str, Any]],
        text_nodes: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Constructs the JSON request payload for Claude.
        """
        return {
            "page_context": page_context,
            "images_needing_alt_text": [
                {
                    "node_id": img["node_id"],
                    "name": img["name"],
                    "semantic_role": img["semantic_role"],
                    "parent_section": img["parent_section"],
                }
                for img in image_nodes
            ],
            "text_blocks_to_evaluate": [
                {
                    "node_id": txt["node_id"],
                    "name": txt["name"],
                    "characters": txt["characters"],
                    "semantic_role": txt["semantic_role"],
                    "parent_section": txt["parent_section"],
                }
                for txt in text_nodes
            ],
        }

    def _call_claude_api(self, prompt_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatches HTTP request to Claude API using model claude-sonnet-4-5.
        Returns parsed JSON enrichment dictionary.
        """
        # If a custom client is provided with a messages.create method (like Anthropic SDK)
        if self.client and hasattr(self.client, "messages") and hasattr(self.client.messages, "create"):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=self._get_system_instructions(),
                messages=[
                    {
                        "role": "user",
                        "content": json.dumps(prompt_payload),
                    }
                ],
            )
            # Handle SDK response
            text_content = ""
            if hasattr(response, "content") and response.content:
                for block in response.content:
                    if hasattr(block, "text"):
                        text_content += block.text
            return self._parse_json_response(text_content, prompt_payload)

        # Standard HTTP request via requests
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        body = {
            "model": self.model,
            "max_tokens": 2048,
            "system": self._get_system_instructions(),
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps(prompt_payload),
                }
            ],
        }

        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=body,
                timeout=30,
            )

            if response.status_code != 200:
                # If unauthorized/missing key and in heuristic mode, fallback gracefully
                if response.status_code in (401, 403) and not self.api_key:
                    return self._generate_heuristic_fallback(prompt_payload)
                raise ClaudeAPIError(
                    f"Claude API request failed with status code {response.status_code}: {response.text}"
                )

            data = response.json()
            content_blocks = data.get("content", [])
            raw_text = ""
            for block in content_blocks:
                if block.get("type") == "text":
                    raw_text += block.get("text", "")

            return self._parse_json_response(raw_text, prompt_payload)

        except requests.exceptions.RequestException as e:
            # If network failed and no API key, use heuristic fallback
            if not self.api_key:
                return self._generate_heuristic_fallback(prompt_payload)
            raise ClaudeAPIError(f"Network error communicating with Claude API: {e}") from e

    def _get_system_instructions(self) -> str:
        """Returns the system prompt for Claude."""
        return (
            "You are an expert WordPress SEO, accessibility (WCAG AA), and UX copy engineer.\n"
            "Analyze the AST intermediate representation tokens of a web page and output a strictly valid JSON object with the following schema:\n"
            "{\n"
            '  "meta_description": "SEO-friendly meta description (140-160 characters) summarizing the page content.",\n'
            '  "image_alt_texts": {\n'
            '    "<node_id>": "Concise, descriptive accessibility alt text for this image based on its role and section."\n'
            "  },\n"
            '  "placeholder_flags": {\n'
            '    "<node_id>": {\n'
            '      "is_placeholder": true | false,\n'
            '      "reason": "Explanation of placeholder or dummy content detected (e.g., Lorem Ipsum)."\n'
            "    }\n"
            "  }\n"
            "}\n"
            "Output ONLY valid JSON. No conversational commentary or extra markdown formatting outside JSON."
        )

    def _parse_json_response(self, raw_text: str, prompt_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cleans and parses Claude's response into a valid dictionary.
        """
        if not raw_text or not raw_text.strip():
            return self._generate_heuristic_fallback(prompt_payload)

        cleaned = raw_text.strip()
        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        return self._generate_heuristic_fallback(prompt_payload)

    def _generate_heuristic_fallback(self, prompt_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministic fallback when API is unavailable or response is invalid.
        """
        page_ctx = prompt_payload.get("page_context", {})
        title = page_ctx.get("page_title", "WordPress Site")
        headings = page_ctx.get("headings", [])
        top_heading = headings[0] if headings else title

        meta_desc = (
            f"Discover {top_heading}. Modern WordPress experience optimized for high performance, accessibility, and SEO."
        )
        if len(meta_desc) > 160:
            meta_desc = meta_desc[:157] + "..."

        image_alt_texts: Dict[str, str] = {}
        for img in prompt_payload.get("images_needing_alt_text", []):
            node_id = img["node_id"]
            name = img.get("name", "Visual graphic")
            role = img.get("semantic_role", "")
            section = img.get("parent_section", "")
            
            clean_name = re.sub(r"[_\-:]", " ", name).title()
            if role == "featured_image":
                alt = f"Featured illustration for {section or top_heading}"
            elif "logo" in name.lower():
                alt = f"{title} official brand logo"
            elif section:
                alt = f"{clean_name} representation in {section}"
            else:
                alt = f"Illustration displaying {clean_name}"
            image_alt_texts[node_id] = alt

        placeholder_flags: Dict[str, Any] = {}
        for txt in prompt_payload.get("text_blocks_to_evaluate", []):
            node_id = txt["node_id"]
            chars = txt.get("characters", "")
            is_lorem = bool(self.LOREM_IPSUM_REGEX.search(chars))
            placeholder_flags[node_id] = {
                "is_placeholder": is_lorem,
                "reason": "Lorem Ipsum / dummy text detected" if is_lorem else "Production copy",
            }

        return {
            "meta_description": meta_desc,
            "image_alt_texts": image_alt_texts,
            "placeholder_flags": placeholder_flags,
        }

    def _apply_enrichments(
        self,
        root: ASTNode,
        enrichment_data: Dict[str, Any],
        image_nodes: List[Dict[str, Any]],
        text_nodes: List[Dict[str, Any]],
    ) -> None:
        """
        Updates ASTNode properties in-place with generated alt texts, SEO metadata, and placeholder flags.
        """
        # 1. Apply SEO Meta Description to Root
        meta_desc = enrichment_data.get("meta_description", "")
        if meta_desc:
            root.properties["meta_description"] = meta_desc
            root.properties["seo_meta_description"] = meta_desc
            root.properties["seo"] = {
                "meta_description": meta_desc,
                "title": root.properties.get("name", ""),
            }

        # 2. Apply Alt Texts to IMAGE nodes
        image_alt_map = enrichment_data.get("image_alt_texts", {})
        for img_item in image_nodes:
            node_id = img_item["node_id"]
            node: ASTNode = img_item["node_ref"]
            generated_alt = image_alt_map.get(node_id)
            if not generated_alt:
                # Check by node name or index
                generated_alt = f"Illustration for {img_item.get('name', 'visual component')}"

            node.properties["alt"] = generated_alt
            node.properties["alt_text"] = generated_alt
            node.properties["description"] = generated_alt

        # 3. Apply Placeholder Flags to TEXT_BLOCK nodes
        placeholder_map = enrichment_data.get("placeholder_flags", {})
        for txt_item in text_nodes:
            node_id = txt_item["node_id"]
            node: ASTNode = txt_item["node_ref"]
            flag_info = placeholder_map.get(node_id, {})
            chars = txt_item.get("characters", "")

            # Check if flagged by Claude or regex
            is_placeholder = False
            reason = ""
            if isinstance(flag_info, dict):
                is_placeholder = bool(flag_info.get("is_placeholder", False))
                reason = flag_info.get("reason", "")
            elif isinstance(flag_info, bool):
                is_placeholder = flag_info
                reason = "Placeholder copy detected" if is_placeholder else ""

            # Double check with regex to ensure accuracy
            if not is_placeholder and self.LOREM_IPSUM_REGEX.search(chars):
                is_placeholder = True
                reason = "Lorem Ipsum / dummy text detected"

            if is_placeholder:
                node.properties["is_placeholder"] = True
                node.properties["placeholder"] = True
                node.properties["placeholder_flag"] = True
                node.properties["placeholder_reason"] = reason or "Dummy placeholder text detected"
            else:
                node.properties["is_placeholder"] = False


# Convenience functions
def enrich_ast_content(
    ast_root: ASTNode,
    api_key: Optional[str] = None,
    model: str = ContentEnricher.DEFAULT_MODEL,
    client: Optional[Any] = None,
) -> ASTNode:
    """
    Convenience function to enrich an ASTNode tree using Claude (claude-sonnet-4-5).
    """
    enricher = ContentEnricher(api_key=api_key, model=model, client=client)
    return enricher.enrich(ast_root)


def enrich_ast(
    ast_root: ASTNode,
    api_key: Optional[str] = None,
    model: str = ContentEnricher.DEFAULT_MODEL,
) -> ASTNode:
    """
    Alias for enrich_ast_content.
    """
    return enrich_ast_content(ast_root, api_key=api_key, model=model)


# Direct function alias
enrich = enrich_ast_content
