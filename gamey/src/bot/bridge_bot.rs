use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot, YEN};
use rand::prelude::IndexedRandom;
use std::collections::HashSet;

#[derive(Clone, Copy, Debug, Default)]
struct Touches {
    a: bool,
    b: bool,
    c: bool,
}

impl Touches {
    fn with_coords(mut self, coords: Coordinates) -> Self {
        self.a |= coords.touches_side_a();
        self.b |= coords.touches_side_b();
        self.c |= coords.touches_side_c();
        self
    }

    fn merge(mut self, other: Touches) -> Self {
        self.a |= other.a;
        self.b |= other.b;
        self.c |= other.c;
        self
    }

    fn count(&self) -> i32 {
        (self.a as i32) + (self.b as i32) + (self.c as i32)
    }
}

fn other_player(p: PlayerId) -> PlayerId {
    if p.id() == 0 {
        PlayerId::new(1)
    } else {
        PlayerId::new(0)
    }
}

fn neighbors(coords: Coordinates) -> [Option<Coordinates>; 6] {
    let x = coords.x();
    let y = coords.y();
    let z = coords.z();

    // Same neighbor topology as GameY::get_neighbors (kept private there).
    [
        if x > 0 {
            Some(Coordinates::new(x - 1, y + 1, z))
        } else {
            None
        },
        if x > 0 {
            Some(Coordinates::new(x - 1, y, z + 1))
        } else {
            None
        },
        if y > 0 {
            Some(Coordinates::new(x + 1, y - 1, z))
        } else {
            None
        },
        if y > 0 {
            Some(Coordinates::new(x, y - 1, z + 1))
        } else {
            None
        },
        if z > 0 {
            Some(Coordinates::new(x + 1, y, z - 1))
        } else {
            None
        },
        if z > 0 {
            Some(Coordinates::new(x, y + 1, z - 1))
        } else {
            None
        },
    ]
}

fn board_occupancy(board: &GameY) -> Vec<Option<PlayerId>> {
    let yen: YEN = board.into();
    let mut occ = Vec::with_capacity(board.total_cells() as usize);
    for ch in yen.layout().chars() {
        if ch == '/' {
            continue;
        }
        match ch {
            'B' => occ.push(Some(PlayerId::new(0))),
            'R' => occ.push(Some(PlayerId::new(1))),
            '.' => occ.push(None),
            _ => occ.push(None),
        }
    }
    occ
}

fn compute_components(
    board_size: u32,
    occ: &[Option<PlayerId>],
    player: PlayerId,
) -> (Vec<i32>, Vec<Touches>) {
    let total = occ.len();
    let mut comp = vec![-1i32; total];
    let mut touches_per_comp: Vec<Touches> = Vec::new();

    let mut stack: Vec<usize> = Vec::new();
    for start in 0..total {
        if comp[start] != -1 {
            continue;
        }
        if occ[start] != Some(player) {
            continue;
        }
        let cid = touches_per_comp.len() as i32;
        touches_per_comp.push(Touches::default());

        comp[start] = cid;
        stack.push(start);

        while let Some(i) = stack.pop() {
            let coords = Coordinates::from_index(i as u32, board_size);
            touches_per_comp[cid as usize] = touches_per_comp[cid as usize].with_coords(coords);

            for n in neighbors(coords).into_iter().flatten() {
                let ni = n.to_index(board_size) as usize;
                if ni >= total {
                    continue;
                }
                if comp[ni] != -1 {
                    continue;
                }
                if occ[ni] == Some(player) {
                    comp[ni] = cid;
                    stack.push(ni);
                }
            }
        }
    }

    (comp, touches_per_comp)
}

/// Bot that prioritizes "bridging" its own disconnected regions:
/// it prefers moves that connect multiple existing components, especially
/// if the resulting connected group touches more sides.
pub struct BridgeBot;

impl BridgeBot {
    fn is_immediate_win(board: &GameY, player: PlayerId, coords: Coordinates) -> bool {
        let mut tmp = board.clone();
        if tmp
            .add_move(Movement::Placement { player, coords })
            .is_err()
        {
            return false;
        }
        matches!(tmp.status(), GameStatus::Finished { winner } if *winner == player)
    }
}

impl YBot for BridgeBot {
    fn name(&self) -> &str {
        "bridge_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available = board.available_cells();
        if available.is_empty() {
            return None;
        }

        let player = board.next_player()?;
        let _opponent = other_player(player);

        // 1) If we can win now, do it.
        let mut winning_moves: Vec<u32> = Vec::new();
        for idx in available.iter().copied() {
            let coords = Coordinates::from_index(idx, board.board_size());
            if Self::is_immediate_win(board, player, coords) {
                winning_moves.push(idx);
            }
        }
        if let Some(idx) = winning_moves.choose(&mut rand::rng()) {
            return Some(Coordinates::from_index(*idx, board.board_size()));
        }

        // 2) Build component info for current player.
        let occ = board_occupancy(board);
        let (comp, touches_per_comp) = compute_components(board.board_size(), &occ, player);

        // 3) Score every candidate move and pick the best.
        let mut best_score: i32 = i32::MIN;
        let mut best: Vec<u32> = Vec::new();

        for idx in available.iter().copied() {
            let coords = Coordinates::from_index(idx, board.board_size());

            let mut neighbor_comps: HashSet<i32> = HashSet::new();
            let mut merged_touches = Touches::default().with_coords(coords);

            for n in neighbors(coords).into_iter().flatten() {
                let ni = n.to_index(board.board_size()) as usize;
                if ni >= occ.len() {
                    continue;
                }
                if occ[ni] == Some(player) {
                    let cid = comp[ni];
                    if cid >= 0 {
                        neighbor_comps.insert(cid);
                        merged_touches = merged_touches.merge(touches_per_comp[cid as usize]);
                    }
                }
            }

            let distinct = neighbor_comps.len() as i32;
            // Big bonus for actually connecting separate regions.
            let bridge_bonus = if distinct >= 2 { 100 * (distinct - 1) } else { 0 };
            // Encourage progress towards touching multiple sides.
            let sides_bonus = 15 * merged_touches.count();
            // Mild preference for "central" cells (often good for bridging).
            let centrality = coords.x().min(coords.y()).min(coords.z()) as i32;

            let score = bridge_bonus + sides_bonus + centrality;
            if score > best_score {
                best_score = score;
                best.clear();
                best.push(idx);
            } else if score == best_score {
                best.push(idx);
            }
        }

        let chosen = best.choose(&mut rand::rng()).copied()?;
        Some(Coordinates::from_index(chosen, board.board_size()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Variant;

    #[test]
    fn test_bridge_bot_name() {
        let bot = BridgeBot;
        assert_eq!(bot.name(), "bridge_bot");
    }

    #[test]
    fn test_bridge_bot_returns_legal_move() {
        let bot = BridgeBot;
        let game = GameY::new(5, Variant::Standard);
        let chosen = bot.choose_move(&game).unwrap();
        let idx = chosen.to_index(game.board_size());
        assert!(game.available_cells().contains(&idx));
    }
}

