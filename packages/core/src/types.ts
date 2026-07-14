export interface SetScore {
  setNo: number
  gamesWon: number
  gamesLost: number
  tiebreak: boolean
}

export type SetResult = 'Win' | 'Loss'

export interface ScoredSet extends SetScore {
  result: SetResult
}

export type MatchResult = 'Win' | 'Loss'
