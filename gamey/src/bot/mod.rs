//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`] - A trait that defines the interface for all bots
//! - [`YBotRegistry`] - A registry for managing multiple bot implementations
//! - [`RandomBot`] - A simple bot that makes random valid moves

pub mod random;
pub mod blocker_bot;
pub mod bridge_bot;
pub mod positional_bots;
pub mod side_bot;
pub mod ybot;
pub mod ybot_registry;
pub use random::*;
pub use blocker_bot::*;
pub use bridge_bot::*;
pub use positional_bots::*;
pub use side_bot::*;
pub use ybot::*;
pub use ybot_registry::*;
