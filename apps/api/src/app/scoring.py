"""Canonical tennis score-string parser.

Pure, dependency-free logic that turns a score string written from the user's
perspective (games won first) — e.g. ``"6-4"`` or ``"6-4 3-6 10-7"`` — into
per-set rows and derives the match result. No database access lives here.

A mirror implementation lives in ``packages/core/src/score.ts``; the two are
kept in exact behavioural parity by shared test suites.

Scoring model
-------------
* A match records 1, 3, or 5 sets. Even set counts cannot decide a winner and
  are rejected.
* A standard set is won 6-0 to 6-4, 7-5, or 7-6 (7-6 being a tiebreak set).
* The deciding (final) set may instead be a super-tiebreak — first to 10,
  win by two — written like ``10-7`` or ``12-10``.
* The player who wins the match must win the final set, and cannot have
  clinched before it (a best-of-``n`` match ends at ``n // 2 + 1`` sets won).
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Literal

SetResult = Literal["Win", "Loss"]
MatchResult = Literal["Win", "Loss"]

_SET_RE = re.compile(r"^(-?\d+)-(-?\d+)$")
_ALLOWED_SET_COUNTS = (1, 3, 5)
# For a match of N sets, the winner must take exactly one of these many sets:
# 3-set matches are ambiguous (best-of-3 decider = 2, best-of-5 sweep = 3).
_WINNING_SETS_BY_COUNT: dict[int, frozenset[int]] = {
    1: frozenset({1}),
    3: frozenset({2, 3}),
    5: frozenset({3}),
}


class InvalidScoreError(ValueError):
    """Raised when a score string cannot describe a real, completed match."""


@dataclass(frozen=True)
class ScoredSet:
    """A single set with its derived tiebreak flag and per-set result."""

    set_no: int
    games_won: int
    games_lost: int
    tiebreak: bool
    result: SetResult


def parse_score(score: str) -> list[ScoredSet]:
    """Parse a score string into per-set rows, validating it end to end.

    Raises :class:`InvalidScoreError` with a human-readable message for any
    score that cannot describe a real, completed match.
    """
    tokens = score.split()
    if not tokens:
        raise InvalidScoreError("Score string must contain at least one set.")

    count = len(tokens)
    if count not in _ALLOWED_SET_COUNTS:
        raise InvalidScoreError(_set_count_message(count))

    sets = [
        _parse_set(token, set_no=index + 1, is_last=index == count - 1)
        for index, token in enumerate(tokens)
    ]

    user_wins = sum(1 for scored in sets if scored.result == "Win")
    opponent_wins = count - user_wins
    match_result: MatchResult = "Win" if user_wins > opponent_wins else "Loss"

    if sets[-1].result != match_result:
        raise InvalidScoreError(
            "Inconsistent score: the player who wins the match must win the final set."
        )

    winner_wins = max(user_wins, opponent_wins)
    if winner_wins not in _WINNING_SETS_BY_COUNT[count]:
        raise InvalidScoreError(
            f"Inconsistent score: a best-of-{count} match is won by taking "
            f"{count // 2 + 1} sets, but this score has a player winning {winner_wins}."
        )

    return sets


def compute_match_result(sets: Sequence[ScoredSet]) -> MatchResult:
    """Aggregate the match result: whoever won the majority of sets."""
    user_wins = sum(1 for scored in sets if scored.result == "Win")
    return "Win" if user_wins * 2 > len(sets) else "Loss"


def format_score(sets: Iterable[ScoredSet]) -> str:
    """Reconstruct the ``"6-4 3-6 10-7"`` display string from parsed sets."""
    return " ".join(f"{scored.games_won}-{scored.games_lost}" for scored in sets)


def _set_count_message(count: int) -> str:
    if count % 2 == 0:
        return (
            f"A tennis match has an odd number of sets (1, 3, or 5); "
            f"{count} sets cannot decide a winner."
        )
    return f"A tennis match has at most 5 sets; got {count}."


def _parse_set(token: str, *, set_no: int, is_last: bool) -> ScoredSet:
    match = _SET_RE.match(token)
    if match is None:
        raise InvalidScoreError(
            f"Invalid set score '{token}': expected two whole numbers joined by '-', e.g. '6-4'."
        )

    games_won = int(match.group(1))
    games_lost = int(match.group(2))
    if games_won < 0 or games_lost < 0:
        raise InvalidScoreError(f"Set score '{token}' cannot contain negative numbers.")
    if games_won == games_lost:
        raise InvalidScoreError(f"'{token}' is not a completed set: a set cannot end level.")

    tiebreak = _classify_set(games_won, games_lost, token=token, is_last=is_last)
    result: SetResult = "Win" if games_won > games_lost else "Loss"
    return ScoredSet(
        set_no=set_no,
        games_won=games_won,
        games_lost=games_lost,
        tiebreak=tiebreak,
        result=result,
    )


def _classify_set(games_won: int, games_lost: int, *, token: str, is_last: bool) -> bool:
    """Validate a set and report whether it was decided by a tiebreak."""
    high = max(games_won, games_lost)
    low = min(games_won, games_lost)

    # Standard set: 6-0..6-4, 7-5 (no tiebreak) or 7-6 (tiebreak).
    if high == 6 and low <= 4:
        return False
    if high == 7 and low == 5:
        return False
    if high == 7 and low == 6:
        return True

    # Super-tiebreak (match tiebreak) — only ever the deciding set.
    if high >= 10:
        if not is_last:
            raise InvalidScoreError(
                f"'{token}' is not valid here: a super-tiebreak can only be the deciding set."
            )
        if _is_valid_super_tiebreak(high, low):
            return True
        raise InvalidScoreError(
            f"'{token}' is not a valid super-tiebreak: play to 10, win by two "
            f"(e.g. '10-7' or '11-9')."
        )

    raise InvalidScoreError(
        f"'{token}' is not a valid set score: a set is won 6-0 to 6-4, 7-5, or 7-6."
    )


def _is_valid_super_tiebreak(high: int, low: int) -> bool:
    if high == 10:
        return low <= 8  # 10-0 .. 10-8; 10-9 must play on
    return high - low == 2  # 11-9, 12-10, ... (win by exactly two past 10)
