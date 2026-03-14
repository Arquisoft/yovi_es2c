import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameBoard from '../GameBoard';

describe('GameBoard board size', () => {
  it('enforces the minimum board size in the UI', () => {
    render(
      <GameBoard
        username="Ana"
        mode="local"
        boardSize={3}
        onExit={() => {}}
      />,
    );

    const cells = screen.getAllByLabelText(/celda/i);
    // Minimum size is 5 => 5 * (5 + 1) / 2 = 15 cells
    expect(cells).toHaveLength(15);
  });

  it('renders the expected number of cells for size 7', () => {
    render(
      <GameBoard
        username="Ana"
        mode="local"
        boardSize={7}
        onExit={() => {}}
      />,
    );

    const cells = screen.getAllByLabelText(/celda/i);
    // 7 * (7 + 1) / 2 = 28 cells
    expect(cells).toHaveLength(28);
  });

  it('renders the expected number of cells for size 9', () => {
    render(
      <GameBoard
        username="Ana"
        mode="local"
        boardSize={9}
        onExit={() => {}}
      />,
    );

    const cells = screen.getAllByLabelText(/celda/i);
    // 9 * (9 + 1) / 2 = 45 cells
    expect(cells).toHaveLength(45);
  });
});
