use crate::{Coordinates, GameAction, GameStatus, GameY, Movement, PlayerId, YBot};
use rand::Rng;
use rand::prelude::IndexedRandom;

/// Bot basado en Monte Carlo Tree Search (MCTS) con UCT.
///
/// Estrategia:
/// 1. Si puede ganar inmediatamente -> gana.
/// 2. Si el rival puede ganar -> bloquea.
/// 3. Si no -> usa MCTS para decidir la mejor jugada.
pub struct MctsBot {
    iterations: usize,   // Número de simulaciones
    exploration: f64,    // Constante de exploración (UCT)
}

impl Default for MctsBot {
    fn default() -> Self {
        Self {
            iterations: 1000,
            exploration: 1.41,
        }
    }
}

/// Nodo del árbol MCTS
struct Node {
    game: GameY,                 // Estado del juego en este nodo
    parent: Option<usize>,       // Índice del padre
    children: Vec<usize>,        // Índices de hijos
    untried_moves: Vec<u32>,     // Movimientos aún no explorados
    visits: u32,                 // Veces visitado
    wins: f64,                   // Victorias del bot
    movement_idx: Option<u32>,   // Movimiento que llevó aquí
}

impl MctsBot {

    pub fn new(iterations: usize) -> Self {
        Self {
            iterations,
            exploration: 1.41,
        }
    }

    /// Devuelve el otro jugador (solo 2 jugadores)
    fn other_player(p: PlayerId) -> PlayerId {
        if p.id() == 0 {
            PlayerId::new(1)
        } else {
            PlayerId::new(0)
        }
    }

    /// Ajusta turno para simular jugadas de otro jugador
    fn prepare_turn(board: &GameY, current: PlayerId, target: PlayerId) -> GameY {
        let mut tmp = board.clone();

        if current != target {
            let _ = tmp.add_move(Movement::Action {
                player: current,
                action: GameAction::Swap,
            });
        }

        tmp
    }

    /// Devuelve casillas donde un jugador gana inmediatamente
    fn winning_cells(board: &GameY, player: PlayerId) -> Vec<u32> {
        let mut result = Vec::new();

        let current = match board.next_player() {
            Some(p) => p,
            None => return result,
        };

        let base = Self::prepare_turn(board, current, player);

        for idx in board.available_cells() {
            let coords = Coordinates::from_index(*idx, board.board_size());
            let mut tmp = base.clone();

            if tmp.add_move(Movement::Placement { player, coords }).is_err() {
                continue;
            }

            if let GameStatus::Finished { winner } = tmp.status() {
                if *winner == player {
                    result.push(*idx);
                }
            }
        }

        result
    }

    /// Simula una partida aleatoria hasta el final
    fn simulate_random_game(mut game: GameY, bot: PlayerId) -> bool {
        let mut rng = rand::rng();

        while !game.check_game_over() {
            let player = match game.next_player() {
                Some(p) => p,
                None => break,
            };

            let moves = game.available_cells();
            if moves.is_empty() {
                break;
            }

            let idx = *moves.choose(&mut rng).unwrap();
            let coords = Coordinates::from_index(idx, game.board_size());

            if game.add_move(Movement::Placement { player, coords }).is_err() {
                break;
            }
        }

        match game.status() {
            GameStatus::Finished { winner } => *winner == bot,
            _ => false,
        }
    }

    /// Calcula puntuación UCT
    fn uct_score(node: &Node, parent_visits: f64, c: f64) -> f64 {
        if node.visits == 0 {
            return f64::INFINITY;
        }

        let win_rate = node.wins / node.visits as f64;
        let exploration = c * ((parent_visits.ln() / node.visits as f64).sqrt());

        win_rate + exploration
    }

    /// Selecciona el mejor hijo usando UCT
    fn best_child(&self, nodes: &[Node], idx: usize) -> usize {
        let parent_visits = nodes[idx].visits.max(1) as f64;

        *nodes[idx].children.iter().max_by(|a, b| {
            let sa = Self::uct_score(&nodes[**a], parent_visits, self.exploration);
            let sb = Self::uct_score(&nodes[**b], parent_visits, self.exploration);
            sa.partial_cmp(&sb).unwrap()
        }).unwrap()
    }

    /// Ejecuta MCTS completo
    fn run_mcts(&self, board: &GameY, bot: PlayerId) -> Option<u32> {

        // Nodo raíz
        let root = Node {
            game: board.clone(),
            parent: None,
            children: Vec::new(),
            untried_moves: board.available_cells().clone(),
            visits: 0,
            wins: 0.0,
            movement_idx: None,
        };

        let mut nodes = vec![root];
        let mut rng = rand::rng();

        for _ in 0..self.iterations {
            let mut idx = 0;

            // 1. SELECTION
            while nodes[idx].untried_moves.is_empty()
                && !nodes[idx].children.is_empty()
                && !nodes[idx].game.check_game_over()
            {
                idx = self.best_child(&nodes, idx);
            }

            // 2. EXPANSION
            if !nodes[idx].untried_moves.is_empty()
                && !nodes[idx].game.check_game_over()
            {
                let pos = rng.random_range(0..nodes[idx].untried_moves.len());
                let move_idx = nodes[idx].untried_moves.remove(pos);

                let mut new_game = nodes[idx].game.clone();

                if let Some(player) = new_game.next_player() {
                    let coords = Coordinates::from_index(move_idx, new_game.board_size());

                    if new_game.add_move(Movement::Placement { player, coords }).is_ok() {
                        let child = Node {
                            game: new_game.clone(),
                            parent: Some(idx),
                            children: Vec::new(),
                            untried_moves: new_game.available_cells().clone(),
                            visits: 0,
                            wins: 0.0,
                            movement_idx: Some(move_idx),
                        };

                        nodes.push(child);
                        let child_idx = nodes.len() - 1;
                        nodes[idx].children.push(child_idx);
                        idx = child_idx;
                    }
                }
            }

            // 3. SIMULATION
            let win = Self::simulate_random_game(nodes[idx].game.clone(), bot);

            // 4. BACKPROPAGATION
            let mut current = Some(idx);

            while let Some(i) = current {
                nodes[i].visits += 1;
                if win {
                    nodes[i].wins += 1.0;
                }
                current = nodes[i].parent;
            }
        }

        // Elegir hijo más visitado
        nodes[0]
            .children
            .iter()
            .max_by_key(|c| nodes[**c].visits)
            .and_then(|c| nodes[*c].movement_idx)
    }
}

impl YBot for MctsBot {

    fn name(&self) -> &str {
        "monte_carlo_tree_search_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {

        let available = board.available_cells();
        if available.is_empty() {
            return None;
        }

        let player = board.next_player()?;
        let opponent = Self::other_player(player);

        // 1. Ganar inmediatamente
        if let Some(idx) = Self::winning_cells(board, player).first() {
            return Some(Coordinates::from_index(*idx, board.board_size()));
        }

        // 2. Bloquear
        if let Some(idx) = Self::winning_cells(board, opponent).first() {
            return Some(Coordinates::from_index(*idx, board.board_size()));
        }

        // 3. MCTS
        let idx = self.run_mcts(board, player)?;

        Some(Coordinates::from_index(idx, board.board_size()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Variant;

    #[test]
    fn test_name() {
        assert_eq!(MctsBot::default().name(), "monte_carlo_tree_search_bot");
    }

    #[test]
    fn test_returns_valid_move() {
        let game = GameY::new(5, Variant::Standard);
        let bot = MctsBot::new(50);

        let coords = bot.choose_move(&game).unwrap();
        let idx = coords.to_index(game.board_size());

        assert!(game.available_cells().contains(&idx));
    }
}