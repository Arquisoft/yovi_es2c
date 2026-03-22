use crate::{Coordinates, GameStatus, GameY, Movement, YBot};
use rand::prelude::IndexedRandom;

pub struct SideBot;

impl YBot for SideBot {
    fn name(&self) -> &str {
        "side_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();

        let side_indices: Vec<u32> = available_cells
            .iter()
            .copied()
            .filter(|idx| {
                let coords = Coordinates::from_index(*idx, board.board_size());
                coords.touches_side_a() || coords.touches_side_b() || coords.touches_side_c()
            })
            .collect();

        if let Some(idx) = side_indices.choose(&mut rand::rng()) {
            let coordinates = Coordinates::from_index(*idx, board.board_size());
            return Some(coordinates);
        }

        let idx = available_cells.choose(&mut rand::rng())?;
        let coordinates = Coordinates::from_index(*idx, board.board_size());
        Some(coordinates)
    }
}

pub struct SideBotHard;

impl YBot for SideBotHard {
    fn name(&self) -> &str {
        "side_bot_hard"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let side_indices: Vec<u32> = available_cells
            .iter()
            .copied()
            .filter(|idx| {
                let coords = Coordinates::from_index(*idx, board.board_size());
                coords.touches_side_a() || coords.touches_side_b() || coords.touches_side_c()
            })
            .collect();

        let current_player = match board.next_player() {
            Some(p) => p,
            None => return None,
        };

        let mut winning_side_indices = Vec::new();

        for idx in &side_indices {
            let coords = Coordinates::from_index(*idx, board.board_size());
            let mut tmp = board.clone();
            let movement = Movement::Placement {
                player: current_player,
                coords,
            };
            if tmp.add_move(movement).is_err() {
                continue;
            }
            if let GameStatus::Finished { winner } = tmp.status() {
                if *winner == current_player {
                    winning_side_indices.push(*idx);
                }
            }
        }

        let chosen_idx = if !winning_side_indices.is_empty() {
            winning_side_indices.choose(&mut rand::rng()).copied()
        } else if !side_indices.is_empty() {
            side_indices.choose(&mut rand::rng()).copied()
        } else {
            available_cells.choose(&mut rand::rng()).copied()
        }?;

        let coordinates = Coordinates::from_index(chosen_idx, board.board_size());
        Some(coordinates)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Variant;

    #[test]
    fn test_side_bot_name() {
        let bot = SideBot;
        assert_eq!(bot.name(), "side_bot");
    }

    #[test]
    fn test_side_bot_prefers_side_cells() {
        let bot = SideBot;
        let game = GameY::new(5, Variant::Standard);

        let coords = bot.choose_move(&game).unwrap();

        assert!(
            coords.touches_side_a() || coords.touches_side_b() || coords.touches_side_c()
        );
    }

    #[test]
    fn test_side_bot_hard_name() {
        let bot = SideBotHard;
        assert_eq!(bot.name(), "side_bot_hard");
    }

    #[test]
    fn test_side_bot_hard_prefers_side_cells() {
        let bot = SideBotHard;
        let game = GameY::new(5, Variant::Standard);

        let coords = bot.choose_move(&game).unwrap();

        assert!(
            coords.touches_side_a() || coords.touches_side_b() || coords.touches_side_c()
        );
    }
}

