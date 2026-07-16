"""Encode/decode validation for the `icon` field on opponents, clubs, and tournaments.

Stores either ``"emoji:<emoji>"`` or ``"icon:<lucide-name>:<color-token>"``. A
mirror implementation lives in ``packages/core/src/entity-icon.ts``; the
curated name/token lists must stay identical on both sides.
"""

from __future__ import annotations

import re

# Curated lucide-react icon names available in the picker (kebab-case, matches
# lucide-react's own file names).
ENTITY_ICON_NAMES = frozenset(
    {
        "trophy",
        "award",
        "medal",
        "star",
        "crown",
        "flag",
        "target",
        "swords",
        "dumbbell",
        "gauge",
        "map-pin",
        "building-2",
        "landmark",
        "home",
        "globe",
        "compass",
        "mountain",
        "tree-pine",
        "waves",
        "palmtree",
        "sun",
        "cloud-sun",
        "umbrella",
        "snowflake",
        "zap",
        "flame",
        "shield",
        "rocket",
        "sparkles",
        "users",
    }
)

# Color tokens map 1:1 to the `--rg-*`-derived semantic tokens in index.css.
ENTITY_ICON_COLOR_TOKENS = frozenset(
    {
        "primary",
        "secondary",
        "win",
        "loss",
        "highlight",
        "destructive",
        "muted-foreground",
    }
)

_EMOJI_PATTERN = re.compile(r"^emoji:(.+)$", re.DOTALL)
_ICON_PATTERN = re.compile(r"^icon:([a-z0-9-]+):([a-z-]+)$")


def validate_entity_icon(value: str) -> str:
    """Validate a stored `icon` string, returning it unchanged if well-formed."""
    emoji_match = _EMOJI_PATTERN.match(value)
    if emoji_match:
        emoji = emoji_match.group(1)
        if not emoji or re.search(r"\s", emoji) or len(emoji) > 8:
            raise ValueError(f'Invalid emoji icon encoding: "{value}"')
        return value

    icon_match = _ICON_PATTERN.match(value)
    if icon_match:
        name, color = icon_match.groups()
        if name not in ENTITY_ICON_NAMES or color not in ENTITY_ICON_COLOR_TOKENS:
            raise ValueError(f'Invalid icon encoding: "{value}"')
        return value

    raise ValueError(f'Invalid icon encoding: "{value}"')
