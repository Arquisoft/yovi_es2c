use crate::{Coordinates, GameY, YBot};
use rand::prelude::IndexedRandom;

/// Bot that prefers the most central cells (furthest from any side).
pub struct CenterBot;

impl YBot for CenterBot {
    fn name(&self) -> &str {
        "center_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let mut best_cells = Vec::new();
        let mut best_score: i32 = -1;

        for idx in available_cells {
            let coords = Coordinates::from_index(*idx, board.board_size());
            let score = coords.x().min(coords.y()).min(coords.z()) as i32;
            if score > best_score {
                best_score = score;
                best_cells.clear();
                best_cells.push(*idx);
            } else if score == best_score {
                best_cells.push(*idx);
            }
        }

        let chosen_idx = best_cells.choose(&mut rand::rng())?;
        Some(Coordinates::from_index(*chosen_idx, board.board_size()))
    }
}

/// Bot that prefers the three corner cells (touching two sides).
pub struct CornerBot;

impl YBot for CornerBot {
    fn name(&self) -> &str {
        "corner_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let corners: Vec<u32> = available_cells
            .iter()
            .copied()
            .filter(|idx| {
                let coords = Coordinates::from_index(*idx, board.board_size());
                let touches_a = coords.touches_side_a();
                let touches_b = coords.touches_side_b();
                let touches_c = coords.touches_side_c();
                (touches_a && touches_b) || (touches_a && touches_c) || (touches_b && touches_c)
            })
            .collect();

        let chosen_idx = if !corners.is_empty() {
            corners.choose(&mut rand::rng()).copied()
        } else {
            available_cells.choose(&mut rand::rng()).copied()
        }?;

        Some(Coordinates::from_index(chosen_idx, board.board_size()))
    }
}

// -----------------------------------------------------------------------------
// Future bots (Omayma):
// - bridge_bot: prioriza cerrar conexiones propias entre dos lados distintos,
//   simulando cada jugada candidata y eligiendo la que conecte regiones separadas.
// - blocker_bot: detecta si el rival puede ganar en su siguiente turno,
//   y juega en la celda que bloquee esa victoria inmediata.
// - mirror_bot: responde jugando en la celda "simétrica" a la última jugada
//   del rival respecto al centro del tablero.
// -----------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Variant;

    #[test]
    fn test_center_bot_name() {
        let bot = CenterBot;
        assert_eq!(bot.name(), "center_bot");
    }

    #[test]
    fn test_corner_bot_name() {
        let bot = CornerBot;
        assert_eq!(bot.name(), "corner_bot");
    }

    #[test]
    fn test_center_bot_returns_move() {
        let bot = CenterBot;
        let game = GameY::new(5, Variant::Standard);
        assert!(bot.choose_move(&game).is_some());
    }
}
