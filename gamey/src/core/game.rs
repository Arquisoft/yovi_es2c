use crate::core::SetIdx;
use crate::core::player_set::PlayerSet;
use crate::{Coordinates, GameAction, GameYError, Movement, PlayerId, RenderOptions, YEN};
use std::collections::HashMap;
use std::fmt::Write;
use std::path::Path;

/// A Result type alias for game operations that may fail with a `GameYError`.
pub type Result<T> = std::result::Result<T, crate::GameYError>;

/// The main game state for a Y game.
///
/// Y is a connection game played on a triangular board where players
/// take turns placing pieces. The goal is to connect all three sides
/// of the triangle with a single chain of connected pieces.
#[derive(Debug, Clone)]
pub struct GameY {
    // Size of the board (length of one side of the triangular board).
    board_size: u32,

    // Mapping from coordinates to identifiers of players who placed stones there.
    board_map: HashMap<Coordinates, (SetIdx, PlayerId)>,

    status: GameStatus,

    // History of moves made in the game.
    history: Vec<Movement>,

    // Union-Find data structure to track connected components for each player
    sets: Vec<PlayerSet>,

    available_cells: Vec<u32>,

    // Variante del juego
    variant: Variant,
}

// Escoger variante del juego
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Variant {
    Standard,
    WhyNot,
}

/// Represents the state of a single cell on the board.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    /// The cell has no piece.
    Empty,
    /// The cell is occupied by a piece belonging to the specified player.
    Occupied(PlayerId),
}

impl GameY {
    /// Creates a new game with the specified board size and number of players.
    pub fn new(board_size: u32, variant : Variant) -> Self {
        let total_cells = (board_size * (board_size + 1)) / 2;
        Self {
            board_size,
            board_map: HashMap::new(),
            history: Vec::new(),
            sets: Vec::new(),
            status: GameStatus::Ongoing {
                next_player: PlayerId::new(0),
            },
            available_cells: (0..total_cells).collect(),
            variant,
        }
    }
    pub fn from_yen(yen: YEN, variant: Variant) -> Result<Self> {
        let mut ygame = GameY::new(yen.size(), variant);
        let rows: Vec<&str> = yen.layout().split('/').collect();

        if rows.len() as u32 != yen.size() {
            return Err(GameYError::InvalidYENLayout {
                expected: yen.size(),
                found: rows.len() as u32,
            });
        }

        for (row, row_str) in rows.iter().enumerate() {
            let cells: Vec<char> = row_str.chars().collect();

            if cells.len() as u32 != row as u32 + 1 {
                return Err(GameYError::InvalidYENLayoutLine {
                    expected: row as u32 + 1,
                    found: cells.len() as u32,
                    line: row as u32,
                });
            }

            for (col, cell) in cells.iter().enumerate() {
                let x = yen.size() - 1 - row as u32;
                let y = col as u32;
                let z = yen.size() - 1 - x - y;
                let coords = Coordinates::new(x, y, z);

                match cell {
                    'B' => {
                        ygame.handle_placement(PlayerId::new(0), coords)?;
                    }
                    'R' => {
                        ygame.handle_placement(PlayerId::new(1), coords)?;
                    }
                    '.' => {}
                    _ => {
                        return Err(GameYError::InvalidCharInLayout {
                            char: *cell,
                            row,
                            col,
                        });
                    }
                }
            }
        }

        if !ygame.check_game_over() {
            ygame.status = GameStatus::Ongoing {
                next_player: PlayerId::new(yen.turn()),
            };
        }

        Ok(ygame)
    }



    /// Returns the current game status.
    pub fn status(&self) -> &GameStatus {
        &self.status
    }

    /// Returns true if the game has ended (has a winner).
    pub fn check_game_over(&self) -> bool {
        match self.status {
            GameStatus::Ongoing { .. } => false,
            GameStatus::Finished { winner: _ } => true,
        }
    }

    /// Returns the list of available cell indices where pieces can be placed.
    pub fn available_cells(&self) -> &Vec<u32> {
        &self.available_cells
    }

    /// Returns the total number of cells on the board.
    pub fn total_cells(&self) -> u32 {
        (self.board_size * (self.board_size + 1)) / 2
    }

    /// Checks if the movement is made by the correct player.
    ///
    /// Returns an error if it's not the specified player's turn.
    pub fn check_player_turn(&self, movement: &Movement) -> Result<()> {
        if let GameStatus::Ongoing { next_player } = self.status {
            let player = match movement {
                Movement::Placement { player, .. } => *player,
                Movement::Action { player, .. } => *player,
            };
            if player != next_player {
                return Err(GameYError::InvalidPlayerTurn {
                    expected: next_player,
                    found: player,
                });
            }
        }
        Ok(())
    }

    /// Returns the player who should make the next move, or None if the game is over.
    pub fn next_player(&self) -> Option<PlayerId> {
        if let GameStatus::Ongoing { next_player } = self.status {
            Some(next_player)
        } else {
            None
        }
    }

    /// Loads a game state from a YEN format file.
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let filename = path.as_ref().display().to_string();
        let file_content = std::fs::read_to_string(path).map_err(|e| GameYError::IoError {
            message: format!("Failed to read file: {}", filename),
            error: e.to_string(),
        })?;
        let yen: YEN =
            serde_json::from_str(&file_content).map_err(|e| GameYError::SerdeError { error: e })?;
        GameY::try_from(yen)
    }

    /// Saves the game state to a file in YEN format.
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let yen: YEN = self.into();
        let json_content =
            serde_json::to_string_pretty(&yen).map_err(|e| GameYError::SerdeError { error: e })?;
        let filename = path.as_ref().display().to_string();
        std::fs::write(path, json_content).map_err(|e| GameYError::IoError {
            message: format!("Failed to write file: {}", filename),
            error: e.to_string(),
        })?;
        Ok(())
    }

    /// Adds a move to the game.
    pub fn add_move(&mut self, movement: Movement) -> Result<()> {
        self.check_player_turn(&movement)?;

        match &movement {
            Movement::Placement { player, coords } => {
                self.handle_placement(*player, *coords)?;
            }
            Movement::Action { player, action } => {
                self.handle_action(*player, action);
            }
        }
        self.history.push(movement);
        Ok(())
    }

    /// Orchestrates the placement logic
    fn handle_placement(&mut self, player: PlayerId, coords: Coordinates) -> Result<()> {
        self.validate_placement(player, coords)?;

        // Update board state (available cells, sets, board_map)
        let set_idx = self.register_piece(player, coords);

        // Connect neighbors and determine if this move won the game
        let won = self.connect_neighbors_and_check_win(coords, player, set_idx);

        self.update_status_after_placement(player, won);
        Ok(())
    }

    /// Iterates over neighbors to union sets and checks for a win condition
    fn connect_neighbors_and_check_win(
        &mut self,
        coords: Coordinates,
        player: PlayerId,
        current_set_idx: usize,
    ) -> bool {
        // Base win condition: The piece itself touches all required sides
        let mut won = self.sets[current_set_idx].is_winning_configuration();

        //
        let neighbors = self.get_neighbors(&coords);

        for neighbor in neighbors {
            if let Some((neighbor_idx, neighbor_player)) = self.board_map.get(&neighbor)
                && *neighbor_player == player
            {
                // Union returns true if the merge resulted in a winning connection
                //
                let connection_won = self.union(current_set_idx, *neighbor_idx);
                won = won || connection_won;
            }
        }
        won
    }

    /// Updates the game status (Finished vs Ongoing)
    fn update_status_after_placement(&mut self, player: PlayerId, won: bool) {
        if self.check_game_over() {
            tracing::info!("Game was already over. Move ignored for status update.");
        } else if won {
            let winner = match self.variant {
                Variant::Standard => player,
                Variant::WhyNot => other_player(player),
            };

            tracing::debug!("Winner is {}", winner);
            self.status = GameStatus::Finished { winner };
        } else {
            self.status = GameStatus::Ongoing {
                next_player: other_player(player),
            };
        }
    }

    /// Handles non-placement actions (Resign, Swap, etc.)
    fn handle_action(&mut self, player: PlayerId, action: &GameAction) {
        match action {
            GameAction::Resign => {
                self.status = GameStatus::Finished {
                    winner: other_player(player),
                };
            }
            GameAction::Swap => {
                self.status = GameStatus::Ongoing {
                    next_player: other_player(player),
                };
            }
        }
    }

    /// Handles validation logic (Game Over checks and Occupancy)
    fn validate_placement(&self, player: PlayerId, coords: Coordinates) -> Result<()> {
        if self.check_game_over() {
            tracing::info!("Game is already over. Move at {} could be ignored", coords);
        }

        if self.board_map.contains_key(&coords) {
            return Err(GameYError::Occupied {
                coordinates: coords,
                player,
            });
        }
        Ok(())
    }

    /// Updates internal data structures (Available cells, Sets, Map)
    /// Returns the index of the newly created set.
    fn register_piece(&mut self, player: PlayerId, coords: Coordinates) -> usize {
        let cell_idx = coords.to_index(self.board_size);
        self.available_cells.retain(|&x| x != cell_idx);

        let set_idx = self.sets.len();
        let new_set = PlayerSet {
            parent: set_idx,
            touches_side_a: coords.touches_side_a(),
            touches_side_b: coords.touches_side_b(),
            touches_side_c: coords.touches_side_c(),
        };
        self.sets.push(new_set);
        self.board_map.insert(coords, (set_idx, player));

        set_idx
    }

    /// Returns the size of the board (length of one side of the triangle).
    pub fn board_size(&self) -> u32 {
        self.board_size
    }

    /// Returns the neighboring coordinates for a given cell.
    fn get_neighbors(&self, coords: &Coordinates) -> Vec<Coordinates> {
        let mut neighbors = Vec::new();
        let x = coords.x();
        let y = coords.y();
        let z = coords.z();

        if x > 0 {
            neighbors.push(Coordinates::new(x - 1, y + 1, z));
            neighbors.push(Coordinates::new(x - 1, y, z + 1));
        }
        if y > 0 {
            neighbors.push(Coordinates::new(x + 1, y - 1, z));
            neighbors.push(Coordinates::new(x, y - 1, z + 1));
        }
        if z > 0 {
            neighbors.push(Coordinates::new(x + 1, y, z - 1));
            neighbors.push(Coordinates::new(x, y + 1, z - 1));
        }
        neighbors
    }

    /// Renders the current state of the board as a text string.
    /// If `show_coordinates` is true, the coordinates of each cell will be displayed.
    pub fn render(&self, options: &RenderOptions) -> String {
        let mut result = String::new();
        let coords_size = self.board_size.to_string().len();
        let _ = writeln!(result, "--- Game of Y (Size {}) ---", self.board_size);

        let indent_multiplier = self.get_indent_multiplier(options);

        for row in 0..self.board_size {
            let x = self.board_size - 1 - row;
            indent(&mut result, x * indent_multiplier);

            for y in 0..=row {
                let z = row - y;
                let coords = Coordinates::new(x, y, z);
                let cell_str = self.format_cell(coords, options, coords_size);
                let _ = write!(result, "{}   ", cell_str);
            }

            result.push('\n');
            if options.show_idx || options.show_3d_coords {
                result.push('\n');
            }
        }
        result
    }
    /*pub fn render(&self, options: &RenderOptions) -> String {
        let mut result = String::new();
        let coords_size = self.board_size.to_string().len() as u32;

        let _ = writeln!(result, "--- Game of Y (Size {}) ---", self.board_size);

        for row in 0..self.board_size {
            let x = self.board_size - 1 - row;

            let indent_multiplier = match (options.show_3d_coords, options.show_idx) {
                (true, true) => 8,
                (true, false) => 4,
                (false, true) => 4,
                (false, false) => 2,
            };

            indent(&mut result, x * indent_multiplier);

            for y in 0..=row {
                let z = row - y;

                let coords = Coordinates::new(x, y, z);
                let player = self.board_map.get(&coords).map(|(_, p)| *p);

                let mut symbol = match player {
                    Some(p) => format!("{}", p),
                    None => ".".to_string(),
                };

                if options.show_3d_coords {
                    symbol.push_str(
                        format!(
                            "({:0width$},{:0width$},{:0width$})",
                            x,
                            y,
                            z,
                            width = coords_size as usize
                        )
                        .as_str(),
                    );
                }
                if options.show_idx {
                    let idx = coords.to_index(self.board_size);
                    symbol.push_str(format!("({}) ", idx).as_str());
                }
                if options.show_colors {
                    match player {
                        Some(p) if p.id() == 0 => {
                            symbol = format!("\x1b[34m{}\x1b[0m", symbol); // Blue for player 0
                        }
                        Some(p) if p.id() == 1 => {
                            symbol = format!("\x1b[31m{}\x1b[0m", symbol); // Red for player 1
                        }
                        _ => {}
                    }
                }

                let _ = write!(result, "{}   ", symbol);
            }
            result.push('\n');
            if options.show_idx || options.show_3d_coords {
                result.push('\n');
            }
        }
        result
    }*/

    fn get_indent_multiplier(&self, options: &RenderOptions) -> u32 {
        match (options.show_3d_coords, options.show_idx) {
            (true, true) => 8,
            (true, false) => 4,
            (false, true) => 4,
            (false, false) => 2,
        }
    }

    fn format_cell(&self, coords: Coordinates, options: &RenderOptions, width: usize) -> String {
        let player = self.board_map.get(&coords).map(|(_, p)| *p);

        // 1. Base symbol
        let mut symbol = match player {
            Some(p) => format!("{}", p),
            None => ".".to_string(),
        };

        // 2. Append metadata (3D Coords / Index)
        if options.show_3d_coords {
            symbol.push_str(&format!(
                "({:0w$},{:0w$},{:0w$})",
                coords.x(),
                coords.y(),
                coords.z(),
                w = width
            ));
        }
        if options.show_idx {
            let idx = coords.to_index(self.board_size);
            symbol.push_str(&format!("({}) ", idx));
        }

        // 3. Apply colors
        if options.show_colors {
            symbol = apply_player_color(symbol, player);
        }

        symbol
    }

    /// Disjoint Set Union 'Find' with path compression
    fn find(&mut self, i: SetIdx) -> SetIdx {
        if self.sets[i].parent == i {
            i
        } else {
            self.sets[i].parent = self.find(self.sets[i].parent);
            self.sets[i].parent
        }
    }

    /// Disjoint Set Union 'Union' operation
    fn union(&mut self, i: SetIdx, j: SetIdx) -> bool {
        let root_i = self.find(i);
        let root_j = self.find(j);

        if root_i != root_j {
            self.sets[root_i].parent = root_j;
            // Merge side properties
            self.sets[root_j].touches_side_a |= self.sets[root_i].touches_side_a;
            self.sets[root_j].touches_side_b |= self.sets[root_i].touches_side_b;
            self.sets[root_j].touches_side_c |= self.sets[root_i].touches_side_c;
            return self.sets[root_j].touches_side_a
                && self.sets[root_j].touches_side_b
                && self.sets[root_j].touches_side_c;
        }
        false
    }
}

fn indent(str: &mut String, level: u32) {
    str.push_str(&" ".repeat(level as usize));
}

impl TryFrom<YEN> for GameY {
    type Error = GameYError;

    fn try_from(game: YEN) -> Result<Self> {
        let variant = match game.variant() {
            "why_not" => Variant::WhyNot,
            _ => Variant::Standard,
        };

        GameY::from_yen(game, variant)
    }
}



impl From<&GameY> for YEN {
    fn from(game: &GameY) -> Self {
        let size = game.board_size;
        let turn = match game.status {
            GameStatus::Finished { winner } => other_player(winner).id() as u32,
            GameStatus::Ongoing { next_player } => next_player.id(),
        };

        let mut layout = String::new();
        let total_cells = (game.board_size * (game.board_size + 1)) / 2;
        let players = vec!['B', 'R'];

        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, game.board_size);
            let cell_char = match game.board_map.get(&coords) {
                Some((_, player)) if player.id() == 0 => 'B',
                Some((_, player)) if player.id() == 1 => 'R',
                _ => '.',
            };
            layout.push(cell_char);
            if coords.z() == 0 && coords.x() > 0 {
                layout.push('/');
            }
        }

        let variant = match game.variant {
            Variant::Standard => "standard".to_string(),
            Variant::WhyNot => "why_not".to_string(),
        };

        YEN::new(size, turn, players, layout, variant)
    }
}

fn other_player(player: PlayerId) -> PlayerId {
    // Assuming two players with IDs 0 and 1
    if player.id() == 0 {
        PlayerId::new(1)
    } else {
        PlayerId::new(0)
    }
}

fn apply_player_color(symbol: String, player: Option<PlayerId>) -> String {
    match player {
        Some(p) if p.id() == 0 => format!("\x1b[34m{}\x1b[0m", symbol), // Blue
        Some(p) if p.id() == 1 => format!("\x1b[31m{}\x1b[0m", symbol), // Red
        _ => symbol,
    }
}

/// Represents the current status of a game.
#[derive(Debug, Clone)]
pub enum GameStatus {
    /// The game is still in progress with the specified player to move next.
    Ongoing { next_player: PlayerId },
    /// The game has ended with a winner.
    Finished { winner: PlayerId },
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_other_player() {
        assert_eq!(other_player(PlayerId::new(0)), PlayerId::new(1));
        assert_eq!(other_player(PlayerId::new(1)), PlayerId::new(0));
    }

    #[test]
    fn test_game_initialization() {
        let game = GameY::new(7 , Variant::Standard);
        assert_eq!(game.board_size, 7);
        assert_eq!(game.history.len(), 0);
        match game.status {
            GameStatus::Ongoing { next_player } => {
                assert_eq!(next_player, PlayerId::new(0));
            }
            _ => panic!("Game should be ongoing"),
        }
    }

    // Helper function to compare neighbor sets
    fn assert_neighbors_match(actual: Vec<Coordinates>, expected: Vec<Coordinates>) {
        let actual_set: HashSet<_> = actual.into_iter().collect();
        let expected_set: HashSet<_> = expected.into_iter().collect();
        assert_eq!(actual_set, expected_set);
    }

    #[test]
    fn test_interior_cell_has_six_neighbors() {
        let board = GameY::new(5 , Variant::Standard);
        let cell = Coordinates::new(2, 1, 1);

        let neighbors = board.get_neighbors(&cell);

        let expected = vec![
            Coordinates::new(1, 2, 1),
            Coordinates::new(1, 1, 2),
            Coordinates::new(3, 0, 1),
            Coordinates::new(2, 0, 2),
            Coordinates::new(3, 1, 0),
            Coordinates::new(2, 2, 0),
        ];

        assert_eq!(neighbors.len(), 6);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_corner_cell_has_two_neighbors() {
        let board = GameY::new(5, Variant::Standard);
        let top_corner = Coordinates::new(4, 0, 0);

        let neighbors = board.get_neighbors(&top_corner);

        let expected = vec![Coordinates::new(3, 1, 0), Coordinates::new(3, 0, 1)];

        assert_eq!(neighbors.len(), 2);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_edge_cell_has_four_neighbors() {
        let board = GameY::new(5 , Variant::Standard);
        let edge_cell = Coordinates::new(0, 2, 2);

        let neighbors = board.get_neighbors(&edge_cell);

        let expected = vec![
            Coordinates::new(1, 1, 2),
            Coordinates::new(0, 1, 3),
            Coordinates::new(1, 2, 1),
            Coordinates::new(0, 3, 1),
        ];

        assert_eq!(neighbors.len(), 4);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_winning_condition() {
        let mut game = GameY::new(3 , Variant::Standard);

        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(1, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 2),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            _ => panic!("Game should be finished with a winner"),
        }
    }

    #[test]
    fn test_yen_conversion() {
        let mut game = GameY::new(3 , Variant::Standard);

        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        let yen: YEN = (&game).into();
        let loaded_game = GameY::try_from(yen.clone()).unwrap();

        assert_eq!(game.board_size, loaded_game.board_size);
        let yen_loaded: YEN = (&loaded_game).into();
        assert_eq!(yen.layout(), yen_loaded.layout());
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_end2() {
        let yen_str = r#"{
            "size": 2,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B/BB",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            _ => panic!("Game should be finished with a winner"),
        }
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_end3() {
        let yen_str = r#"{
            "size": 3,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B/BB/BBR",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            other => panic!("Game should be finished with a winner. Found: {:?}", other),
        }
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_single_full() {
        let yen_str = r#"{
            "size": 1,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            other => panic!("Game should be finished with a winner. Found {:?}", other),
        }
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_single_empty() {
        let yen_str = r#"{
            "size": 1,
            "turn": 0,
            "players": ["B","R"],
            "layout": ".",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Ongoing { next_player } => {
                assert_eq!(next_player, PlayerId::new(0));
            }
            _ => panic!("Game should be ongoing"),
        }
    }
    #[test]
    fn test_winning_condition_why_not() {
        let mut game = GameY::new(3, Variant::WhyNot);

        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(1, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 2),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(1));
            }
            _ => panic!("Game should be finished with inverted winner"),
        }
    }


    // ─── Tests por tamaño de tablero ───────────────────────────────────────────

        // ── Tamaño 1 1 casilla, con  un movimiento te vale para ganar ──────────────────────────────────────────────────────────────

        #[test]
        fn test_size1_total_cells() {
            let game = GameY::new(1, Variant::Standard);
            assert_eq!(game.total_cells(), 1);
            assert_eq!(game.available_cells().len(), 1);
        }

        #[test]
        fn test_size1_single_move_wins() {
            // En tamaño 1 la única casilla (0,0,0) toca los tres lados → victoria inmediata
            let mut game = GameY::new(1, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 0),
            }).unwrap();
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
                _ => panic!("Tamaño 1: una ficha debe ganar la partida"),
            }
        }

        #[test]
        fn test_size1_why_not_single_move_loses_placer() {
            // En WhyNot completar la conexión hace ganar al rival
            let mut game = GameY::new(1, Variant::WhyNot);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 0),
            }).unwrap();
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(1)),
                _ => panic!("Tamaño 1 WhyNot: el ganador debe ser el jugador 1"),
            }
        }

        // ── Tamaño 2 3 celdas, comprubea lo basico, Yen guarda estado, el juego sigue su curso tras 1 mov... ──────────────────────────────────────────────────────────────

        #[test]
        fn test_size2_total_cells() {
            let game = GameY::new(2, Variant::Standard);
            // (2 * 3) / 2 = 3
            assert_eq!(game.total_cells(), 3);
            assert_eq!(game.available_cells().len(), 3);
        }

        #[test]
        fn test_size2_initial_state_ongoing() {
            let game = GameY::new(2, Variant::Standard);
            match game.status() {
                GameStatus::Ongoing { next_player } => assert_eq!(*next_player, PlayerId::new(0)),
                _ => panic!("Tamaño 2: el juego debería estar en curso al inicio"),
            }
        }

        #[test]
        fn test_size2_win_two_moves() {
            // (0,1,0) toca A y C; (1,0,0) toca B y C → son vecinos → cubren A,B,C
            let mut game = GameY::new(2, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 0),
            }).unwrap();
            // Jugador 1 coloca en la casilla restante que no bloquea
            game.add_move(Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(0, 0, 1),
            }).unwrap();
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(1, 0, 0),
            }).unwrap();
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
                _ => panic!("Tamaño 2: jugador 0 debería haber ganado"),
            }
        }

        #[test]
        fn test_size2_no_winner_after_one_move() {
            let mut game = GameY::new(2, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 0),
            }).unwrap();
            assert!(!game.check_game_over());
        }

        #[test]
        fn test_size2_yen_roundtrip() {
            let mut game = GameY::new(2, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 0),
            }).unwrap();
            let yen: YEN = (&game).into();
            let restored = GameY::try_from(yen.clone()).unwrap();
            let yen2: YEN = (&restored).into();
            assert_eq!(yen.layout(), yen2.layout());
            assert_eq!(yen.size(), 2);
        }

        // ── Tamaño 3 6 celdas, comprueba lo mismo ──────────────────────────────────────────────────────────────

        #[test]
        fn test_size3_total_cells() {
            let game = GameY::new(3, Variant::Standard);
            // (3 * 4) / 2 = 6
            assert_eq!(game.total_cells(), 6);
            assert_eq!(game.available_cells().len(), 6);
        }

        #[test]
        fn test_size3_win_diagonal_path() {
            // Camino en z=0: (0,2,0)→(1,1,0)→(2,0,0)
            // (0,2,0) toca A,C; (2,0,0) toca B,C → conectados cubren A,B,C
            let mut game = GameY::new(3, Variant::Standard);
            let moves = vec![
                (0, Coordinates::new(0, 2, 0)),
                (1, Coordinates::new(1, 0, 1)),
                (0, Coordinates::new(1, 1, 0)),
                (1, Coordinates::new(0, 0, 2)),
                (0, Coordinates::new(2, 0, 0)),
            ];
            for (player_id, coords) in moves {
                game.add_move(Movement::Placement {
                    player: PlayerId::new(player_id),
                    coords,
                }).unwrap();
            }
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
                _ => panic!("Tamaño 3: jugador 0 debería haber ganado"),
            }
        }

        #[test]
        fn test_size3_ongoing_after_two_moves() {
            let mut game = GameY::new(3, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            }).unwrap();
            game.add_move(Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            }).unwrap();
            assert!(!game.check_game_over());
        }

        #[test]
        fn test_size3_available_cells_decrease() {
            let mut game = GameY::new(3, Variant::Standard);
            assert_eq!(game.available_cells().len(), 6);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            }).unwrap();
            assert_eq!(game.available_cells().len(), 5);
        }

        #[test]
        fn test_size3_yen_roundtrip() {
            let mut game = GameY::new(3, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            }).unwrap();
            game.add_move(Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            }).unwrap();
            let yen: YEN = (&game).into();
            let restored = GameY::try_from(yen.clone()).unwrap();
            let yen2: YEN = (&restored).into();
            assert_eq!(yen.layout(), yen2.layout());
            assert_eq!(yen.turn(), yen2.turn());
        }

        // ── Tamaño 4 10 celdas comprueba lo mismo ──────────────────────────────────────────────────────────────

        #[test]
        fn test_size4_total_cells() {
            let game = GameY::new(4, Variant::Standard);
            // (4 * 5) / 2 = 10
            assert_eq!(game.total_cells(), 10);
            assert_eq!(game.available_cells().len(), 10);
        }

        #[test]
        fn test_size4_initial_state_ongoing() {
            let game = GameY::new(4, Variant::Standard);
            match game.status() {
                GameStatus::Ongoing { next_player } => assert_eq!(*next_player, PlayerId::new(0)),
                _ => panic!("Tamaño 4: el juego debería estar en curso al inicio"),
            }
        }

        #[test]
        fn test_size4_win_along_side_c() {
            // Camino en z=0: (0,3,0)→(1,2,0)→(2,1,0)→(3,0,0)
            // (0,3,0) toca A,C; (3,0,0) toca B,C → cubren A,B,C
            let mut game = GameY::new(4, Variant::Standard);
            let moves: Vec<(u32, Coordinates)> = vec![
                (0, Coordinates::new(0, 3, 0)),
                (1, Coordinates::new(0, 0, 3)),
                (0, Coordinates::new(1, 2, 0)),
                (1, Coordinates::new(0, 1, 2)),
                (0, Coordinates::new(2, 1, 0)),
                (1, Coordinates::new(0, 2, 1)),
                (0, Coordinates::new(3, 0, 0)),
            ];
            for (player_id, coords) in moves {
                game.add_move(Movement::Placement {
                    player: PlayerId::new(player_id),
                    coords,
                }).unwrap();
            }
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
                _ => panic!("Tamaño 4: jugador 0 debería haber ganado"),
            }
        }

        #[test]
        fn test_size4_yen_roundtrip() {
            let mut game = GameY::new(4, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 3, 0),
            }).unwrap();
            game.add_move(Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(3, 0, 0),
            }).unwrap();
            let yen: YEN = (&game).into();
            let restored = GameY::try_from(yen.clone()).unwrap();
            let yen2: YEN = (&restored).into();
            assert_eq!(yen.layout(), yen2.layout());
            assert_eq!(yen.size(), 4);
        }

        // ── Tamaño 5 15 celdas, comprueba lo basico pero ademas que se gana wn why not ──────────────────────────────────────────────────────────────

        #[test]
        fn test_size5_total_cells() {
            let game = GameY::new(5, Variant::Standard);
            // (5 * 6) / 2 = 15
            assert_eq!(game.total_cells(), 15);
            assert_eq!(game.available_cells().len(), 15);
        }

        #[test]
        fn test_size5_initial_state_ongoing() {
            let game = GameY::new(5, Variant::Standard);
            assert!(!game.check_game_over());
            assert_eq!(game.next_player(), Some(PlayerId::new(0)));
        }

        #[test]
        fn test_size5_win_along_side_c() {
            // Camino en z=0: (0,4,0)→(1,3,0)→(2,2,0)→(3,1,0)→(4,0,0)
            // (0,4,0) toca A,C; (4,0,0) toca B,C → cubren A,B,C
            let mut game = GameY::new(5, Variant::Standard);
            let moves: Vec<(u32, Coordinates)> = vec![
                (0, Coordinates::new(0, 4, 0)),
                (1, Coordinates::new(0, 0, 4)),
                (0, Coordinates::new(1, 3, 0)),
                (1, Coordinates::new(0, 1, 3)),
                (0, Coordinates::new(2, 2, 0)),
                (1, Coordinates::new(0, 2, 2)),
                (0, Coordinates::new(3, 1, 0)),
                (1, Coordinates::new(0, 3, 1)),
                (0, Coordinates::new(4, 0, 0)),
            ];
            for (player_id, coords) in moves {
                game.add_move(Movement::Placement {
                    player: PlayerId::new(player_id),
                    coords,
                }).unwrap();
            }
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
                _ => panic!("Tamaño 5: jugador 0 debería haber ganado"),
            }
        }

        #[test]
        fn test_size5_available_cells_after_moves() {
            let mut game = GameY::new(5, Variant::Standard);
            for i in 0..4 {
                let coords = Coordinates::from_index(i * 2, 5);
                let player = if i % 2 == 0 { 0 } else { 1 };
                game.add_move(Movement::Placement {
                    player: PlayerId::new(player),
                    coords,
                }).unwrap();
            }
            assert_eq!(game.available_cells().len(), 11);
        }

        #[test]
        fn test_size5_yen_roundtrip() {
            let mut game = GameY::new(5, Variant::Standard);
            game.add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 4, 0),
            }).unwrap();
            game.add_move(Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(4, 0, 0),
            }).unwrap();
            let yen: YEN = (&game).into();
            let restored = GameY::try_from(yen.clone()).unwrap();
            let yen2: YEN = (&restored).into();
            assert_eq!(yen.layout(), yen2.layout());
            assert_eq!(yen.size(), 5);
        }

        #[test]
        fn test_size5_why_not_win_inverts_winner() {
            // Mismo camino ganador que Standard pero el ganador debe ser el rival
            let mut game = GameY::new(5, Variant::WhyNot);
            let moves: Vec<(u32, Coordinates)> = vec![
                (0, Coordinates::new(0, 4, 0)),
                (1, Coordinates::new(0, 0, 4)),
                (0, Coordinates::new(1, 3, 0)),
                (1, Coordinates::new(0, 1, 3)),
                (0, Coordinates::new(2, 2, 0)),
                (1, Coordinates::new(0, 2, 2)),
                (0, Coordinates::new(3, 1, 0)),
                (1, Coordinates::new(0, 3, 1)),
                (0, Coordinates::new(4, 0, 0)),
            ];
            for (player_id, coords) in moves {
                game.add_move(Movement::Placement {
                    player: PlayerId::new(player_id),
                    coords,
                }).unwrap();
            }
            match game.status {
                GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(1)),
                _ => panic!("Tamaño 5 WhyNot: el ganador debería ser el jugador 1"),
            }
        }

    }
