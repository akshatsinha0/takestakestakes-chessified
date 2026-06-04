/*
(1.) Single source of truth for game-presentation configuration that was previously duplicated
     and scattered across components. The time-control catalog (formerly re-declared in
     QuickMatch, ChallengeModal, and FriendInvite with divergent shapes), the chess piece glyph
     map (formerly duplicated in Game and GameViewer), and the bot-strength tiers (formerly
     inline magic numbers in ChessboardSection) all live here and are imported by every consumer.
(2.) `TIME_CONTROLS` uses one unified `TimeControl` shape carrying every field any screen needs
     (`value` is the canonical id like "5+0"; `category`, `label`, and `increment` are display
     facets), so each consumer reads the facets it renders without maintaining its own list. The
     value strings are the same format `parseTimeControl` on the backend expects.
(3.) `PIECE_SYMBOLS` maps a `${color}${type}` key (e.g. "wq") to its Unicode glyph, the exact
     keying both the live board and the game review build from chess.js output, so the rendering
     of pieces is defined once. `sanToPieceGlyph` and `sanWithoutPieceLetter` derive a half-move's
     piece icon and its remaining notation from SAN using that same map, keeping the move-list
     rendering rules co-located with the glyph table instead of restated in a component.
(4.) `BOT_RATING_TIERS` names the rating thresholds that grade bot move selection, replacing bare
     numbers with intention-revealing constants, and `BOT_MOVE_DELAY_MS` centralizes the reply
     delay.

This module is the master catalog for reusable game-presentation values. Concentrating these
here means a new time control, a different piece set, or a retuned bot ladder is a single edit
that propagates to every screen, and it removes the class of bug where one duplicated copy drifts
from another. It holds data and types only, with no React or backend dependency, so any component
can import it freely.
*/

export interface TimeControl {
  value: string
  category: string
  label: string
  increment: string
}

export const TIME_CONTROLS: TimeControl[] = [
  { value: '1+0', category: 'Bullet', label: '1 min', increment: '0 sec' },
  { value: '3+0', category: 'Blitz', label: '3 min', increment: '0 sec' },
  { value: '5+0', category: 'Blitz', label: '5 min', increment: '0 sec' },
  { value: '10+0', category: 'Rapid', label: '10 min', increment: '0 sec' },
  { value: '15+10', category: 'Rapid', label: '15 min', increment: '10 sec' },
  { value: '30+0', category: 'Classical', label: '30 min', increment: '0 sec' },
]

export const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙',
  wr: '♖',
  wn: '♘',
  wb: '♗',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  br: '♜',
  bn: '♞',
  bb: '♝',
  bq: '♛',
  bk: '♚',
}

// Leading SAN letter to PIECE_SYMBOLS type key. A SAN with no leading piece
// letter is a pawn move, and castling ("O-O"/"O-O-O") is rendered with the king
// glyph, so the move list shows a piece icon for every half-move from SAN alone.
const SAN_PIECE_KEYS: Record<string, string> = {
  K: 'k',
  Q: 'q',
  R: 'r',
  B: 'b',
  N: 'n',
}

export const sanToPieceGlyph = (san: string, colorKey: 'w' | 'b'): string => {
  const type = san.startsWith('O-O') ? 'k' : (SAN_PIECE_KEYS[san[0]] ?? 'p')
  return PIECE_SYMBOLS[`${colorKey}${type}`]
}

// SAN with its leading piece letter removed so the glyph carries the piece and
// the text carries only the destination and decorators (e.g. "Nf3" -> "f3",
// "Qxd5" -> "xd5"); pawn moves and castling are returned unchanged.
export const sanWithoutPieceLetter = (san: string): string =>
  SAN_PIECE_KEYS[san[0]] === undefined ? san : san.slice(1)

export const BOT_RATING_TIERS = {
  random: 1000,
  captures: 1300,
  capturesAndChecks: 1600,
}

export const BOT_MOVE_DELAY_MS = 500
