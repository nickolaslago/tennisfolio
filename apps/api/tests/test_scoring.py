"""Exhaustive tests for the canonical tennis score-string parser.

These cases are mirrored in ``packages/core/src/score.test.ts`` — keep the two
suites in lockstep so both implementations stay verifiably in sync.
"""

import pytest

from app.scoring import (
    InvalidScoreError,
    ScoredSet,
    compute_match_result,
    format_score,
    parse_score,
)


class TestParseValidScores:
    def test_single_set(self) -> None:
        assert parse_score("6-4") == [
            ScoredSet(set_no=1, games_won=6, games_lost=4, tiebreak=False, result="Win"),
        ]

    def test_single_set_loss(self) -> None:
        assert parse_score("4-6") == [
            ScoredSet(set_no=1, games_won=4, games_lost=6, tiebreak=False, result="Loss"),
        ]

    def test_seven_five_is_not_a_tiebreak(self) -> None:
        (scored,) = parse_score("7-5")
        assert scored.tiebreak is False
        assert scored.result == "Win"

    def test_seven_six_is_a_tiebreak(self) -> None:
        (scored,) = parse_score("7-6")
        assert scored.tiebreak is True
        assert scored.result == "Win"

    def test_six_seven_loss_is_a_tiebreak(self) -> None:
        (scored,) = parse_score("6-7")
        assert scored.tiebreak is True
        assert scored.result == "Loss"

    @pytest.mark.parametrize("loser", [0, 1, 2, 3, 4])
    def test_all_straight_six_game_sets(self, loser: int) -> None:
        (scored,) = parse_score(f"6-{loser}")
        assert scored.tiebreak is False
        assert scored.result == "Win"

    def test_best_of_three_with_super_tiebreak(self) -> None:
        sets = parse_score("6-4 3-6 10-7")
        assert [s.result for s in sets] == ["Win", "Loss", "Win"]
        assert [s.tiebreak for s in sets] == [False, False, True]
        assert [s.set_no for s in sets] == [1, 2, 3]

    def test_best_of_three_decider_is_a_normal_set(self) -> None:
        sets = parse_score("6-4 4-6 7-5")
        assert [s.result for s in sets] == ["Win", "Loss", "Win"]
        assert [s.tiebreak for s in sets] == [False, False, False]

    def test_two_set_straight_win(self) -> None:
        # 2-0: a best-of-three won without a decider.
        sets = parse_score("6-4 6-3")
        assert [s.result for s in sets] == ["Win", "Win"]
        assert compute_match_result(sets) == "Win"

    def test_two_set_straight_loss(self) -> None:
        # 0-2: a best-of-three lost without a decider.
        sets = parse_score("4-6 3-6")
        assert [s.result for s in sets] == ["Loss", "Loss"]
        assert compute_match_result(sets) == "Loss"

    def test_three_set_sweep_is_valid(self) -> None:
        # 3-0 in three recorded sets: a best-of-five straight-sets win.
        sets = parse_score("6-4 6-3 6-2")
        assert compute_match_result(sets) == "Win"

    def test_four_set_early_clinch(self) -> None:
        # 3-1: a best-of-five decided in four sets.
        sets = parse_score("6-4 3-6 6-3 6-4")
        assert [s.result for s in sets] == ["Win", "Loss", "Win", "Win"]
        assert compute_match_result(sets) == "Win"

    def test_four_set_early_clinch_loss(self) -> None:
        # 1-3: a best-of-five lost in four sets.
        sets = parse_score("6-4 3-6 3-6 4-6")
        assert compute_match_result(sets) == "Loss"

    def test_five_set_match(self) -> None:
        sets = parse_score("6-4 4-6 6-3 4-6 6-4")
        assert [s.result for s in sets] == ["Win", "Loss", "Win", "Loss", "Win"]
        assert compute_match_result(sets) == "Win"

    def test_five_set_match_with_super_tiebreak_decider(self) -> None:
        sets = parse_score("6-4 4-6 6-3 4-6 10-8")
        assert sets[-1].tiebreak is True
        assert compute_match_result(sets) == "Win"

    def test_five_set_loss(self) -> None:
        sets = parse_score("6-4 4-6 6-3 4-6 4-6")
        assert compute_match_result(sets) == "Loss"

    def test_super_tiebreak_only_match(self) -> None:
        (scored,) = parse_score("10-7")
        assert scored.tiebreak is True
        assert scored.result == "Win"

    @pytest.mark.parametrize("token", ["11-9", "12-10", "10-8", "10-0"])
    def test_valid_super_tiebreak_margins(self, token: str) -> None:
        (scored,) = parse_score(token)
        assert scored.tiebreak is True

    def test_extra_whitespace_is_ignored(self) -> None:
        assert parse_score("  6-4   3-6   10-7 ") == parse_score("6-4 3-6 10-7")


class TestComputeMatchResult:
    def test_majority_of_sets_wins_the_match(self) -> None:
        assert compute_match_result(parse_score("6-4 3-6 10-7")) == "Win"

    def test_loss_when_minority_of_sets_won(self) -> None:
        assert compute_match_result(parse_score("6-4 3-6 4-6")) == "Loss"


class TestRoundTrip:
    @pytest.mark.parametrize(
        "score",
        [
            "6-4",
            "4-6",
            "7-5",
            "7-6",
            "10-7",
            "6-4 6-3",
            "6-4 3-6 10-7",
            "6-4 4-6 7-5",
            "6-4 3-6 6-3 6-4",
            "6-4 4-6 6-3 4-6 6-4",
            "6-4 4-6 6-3 4-6 10-8",
        ],
    )
    def test_sets_to_string_to_sets_is_lossless(self, score: str) -> None:
        sets = parse_score(score)
        assert format_score(sets) == " ".join(score.split())
        assert parse_score(format_score(sets)) == sets


class TestRejections:
    def test_empty_string(self) -> None:
        with pytest.raises(InvalidScoreError, match="at least one set"):
            parse_score("")

    def test_whitespace_only(self) -> None:
        with pytest.raises(InvalidScoreError, match="at least one set"):
            parse_score("   ")

    def test_incomplete_two_set_match(self) -> None:
        # 1-1 in two sets: nobody has clinched a best-of-three yet.
        with pytest.raises(InvalidScoreError, match="is won by taking"):
            parse_score("6-4 3-6")

    def test_incomplete_four_set_match(self) -> None:
        # 2-2 in four sets: a best-of-five is undecided at two sets apiece.
        with pytest.raises(InvalidScoreError, match="is won by taking"):
            parse_score("6-4 3-6 6-3 3-6")

    def test_too_many_sets(self) -> None:
        with pytest.raises(InvalidScoreError, match="at most 5 sets"):
            parse_score("6-4 6-3 6-2 6-1 6-0 6-4 6-3")

    def test_malformed_token_missing_number(self) -> None:
        with pytest.raises(InvalidScoreError, match="Invalid set score"):
            parse_score("6-")

    def test_malformed_token_not_a_number(self) -> None:
        with pytest.raises(InvalidScoreError, match="Invalid set score"):
            parse_score("six-four")

    def test_malformed_token_too_many_parts(self) -> None:
        with pytest.raises(InvalidScoreError, match="Invalid set score"):
            parse_score("6-4-2")

    def test_negative_number(self) -> None:
        with pytest.raises(InvalidScoreError, match="negative"):
            parse_score("-6-4")

    def test_negative_second_number(self) -> None:
        with pytest.raises(InvalidScoreError, match="negative"):
            parse_score("6--4")

    def test_tied_set_six_six(self) -> None:
        with pytest.raises(InvalidScoreError, match="cannot end level"):
            parse_score("6-6")

    def test_tied_set_zero_zero(self) -> None:
        with pytest.raises(InvalidScoreError, match="cannot end level"):
            parse_score("0-0")

    def test_impossible_set_eight_five(self) -> None:
        with pytest.raises(InvalidScoreError, match="not a valid set score"):
            parse_score("8-5")

    def test_impossible_set_six_five(self) -> None:
        with pytest.raises(InvalidScoreError, match="not a valid set score"):
            parse_score("6-5")

    def test_impossible_set_eight_six(self) -> None:
        # Advantage sets are not supported; the decider is a super-tiebreak.
        with pytest.raises(InvalidScoreError, match="not a valid set score"):
            parse_score("8-6")

    def test_impossible_set_seven_four(self) -> None:
        with pytest.raises(InvalidScoreError, match="not a valid set score"):
            parse_score("7-4")

    def test_super_tiebreak_not_in_deciding_set(self) -> None:
        with pytest.raises(InvalidScoreError, match="only be the deciding set"):
            parse_score("10-7 6-4 6-3")

    def test_invalid_super_tiebreak_margin_one(self) -> None:
        with pytest.raises(InvalidScoreError, match="valid super-tiebreak"):
            parse_score("10-9")

    def test_invalid_super_tiebreak_no_win_by_two(self) -> None:
        with pytest.raises(InvalidScoreError, match="valid super-tiebreak"):
            parse_score("12-11")

    def test_winner_must_win_final_set(self) -> None:
        # 6-4 6-3 clinches at two sets; a lost third set can't follow.
        with pytest.raises(InvalidScoreError, match="must win the final set"):
            parse_score("6-4 6-3 3-6")

    def test_winner_cannot_clinch_before_the_last_set(self) -> None:
        # 4-1 in a five-set match: the winner would have stopped at three.
        with pytest.raises(InvalidScoreError, match="is won by taking"):
            parse_score("6-4 3-6 6-3 6-4 6-2")

    def test_five_set_clean_sweep_then_losses_is_inconsistent(self) -> None:
        with pytest.raises(InvalidScoreError, match="must win the final set"):
            parse_score("6-4 6-3 6-2 3-6 4-6")
