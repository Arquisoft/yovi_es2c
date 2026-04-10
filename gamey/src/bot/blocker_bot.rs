use crate::{Coordinates, GameAction, GameStatus, GameY, Movement, PlayerId, YBot};
use rand::prelude::IndexedRandom;

/// Bot that blocks the opponent's immediate winning move if one exists.
///
/// Strategy:
/// - Look for any empty cell such that *opponent* would win by playing it next.
/// - If found, play one of those cells (random tie-break).
/// - Otherwise, fall back to a random valid move.
pub struct BlockerBot;

impl BlockerBot {
    fn other_player(p: PlayerId) -> PlayerId {
        // This project currently models a 2-player game (ids 0/1).
        if p.id() == 0 {
            PlayerId::new(1)
        } else {
            PlayerId::new(0)
        }
    }

    fn opponent_winning_cells(board: &GameY, current_player: PlayerId, opponent: PlayerId) -> Vec<u32> {
        let mut winning = Vec::new();

        // `GameY::add_move` enforces turn order. `choose_move` is called when it's
        // the bot's turn (current_player). To evaluate "opponent wins on their next
        // turn", we first flip the turn in a temporary copy.
        let mut base = board.clone();
        let _ = base.add_move(Movement::Action {
            player: current_player,
            action: GameAction::Swap,
        });

        for idx in board.available_cells() {
            let coords = Coordinates::from_index(*idx, board.board_size());
            let mut tmp = base.clone();
            let movement = Movement::Placement {
                player: opponent,
                coords,
            };

            if tmp.add_move(movement).is_err() {
                continue;
            }

            if let GameStatus::Finished { winner } = tmp.status() {
                if *winner == opponent {
                    winning.push(*idx);
                }
            }
        }

        winning
    }
}

impl YBot for BlockerBot {
    fn name(&self) -> &str {
        "blocker_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let current_player = board.next_player()?;
        let opponent = Self::other_player(current_player);

        let threats = Self::opponent_winning_cells(board, current_player, opponent);
        let chosen_idx = if !threats.is_empty() {
            threats.choose(&mut rand::rng()).copied()
        } else {
            available_cells.choose(&mut rand::rng()).copied()
        }?;

        Some(Coordinates::from_index(chosen_idx, board.board_size()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Variant;

    #[test]
    fn test_blocker_bot_name() {
        let bot = BlockerBot;
        assert_eq!(bot.name(), "blocker_bot");
    }

    #[test]
    fn test_blocker_bot_returns_legal_move() {
        use rand::{rngs::StdRng, SeedableRng};

        let mut rng = StdRng::seed_from_u64(1337);
        let mut game = GameY::new(5, Variant::Standard);

        // Play a handful of legal moves to reach a mid-game position.
        for _ in 0..6 {
            if game.check_game_over() {
                break;
            }
            let current_player = game.next_player().unwrap();
            let idx = *game.available_cells().choose(&mut rng).unwrap();
            let coords = Coordinates::from_index(idx, game.board_size());
            game.add_move(Movement::Placement { player: current_player, coords })
                .unwrap();
        }

        let chosen = BlockerBot.choose_move(&game).expect("should choose a move");
        let chosen_idx = chosen.to_index(game.board_size());
        assert!(
            game.available_cells().contains(&chosen_idx),
            "expected a move on an available cell; chosen idx {}",
            chosen_idx
        );
    }

    #[test]
    fn test_opponent_winning_cells_does_not_depend_on_turn_order() {
        // Basic regression: the threat detector should be able to run even when it's
        // not the opponent's turn (it internally flips turn in a temp copy).
        let game = GameY::new(5, Variant::Standard);
        let current_player = game.next_player().unwrap(); // should be 0
        let opponent = PlayerId::new(1);
        let _cells = BlockerBot::opponent_winning_cells(&game, current_player, opponent);
    }
}
