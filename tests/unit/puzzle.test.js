import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/uploaded.jpg' } })),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}));

import { PuzzleGame } from '../../js/domains/entertainment/puzzle.js';
import { state } from '../../js/core/state.js';
import { getPuzzleImageList } from '../../js/domains/entertainment/games.js';

describe('Puzzle Game Engine', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
      createPattern: vi.fn(),
      fillText: vi.fn(),
    }));

    document.body.innerHTML = `
      <div id="puzzle-container"></div>
      <div id="puzzle-timer">0:00</div>
      <div id="puzzle-moves">0</div>
    `;
  });

  it('should instantiate PuzzleGame and create canvas inside container', () => {
    const game = new PuzzleGame('puzzle-container', 'https://example.com/photo.jpg', 3);
    expect(game).toBeDefined();
    expect(game.difficulty).toBe(3);
    
    const canvas = document.querySelector('#puzzle-container canvas');
    expect(canvas).not.toBeNull();
    
    // Clean up
    game.destroy();
  });

  it('should initialize board structure correctly with an empty slot', () => {
    const game = new PuzzleGame('puzzle-container', 'https://example.com/photo.jpg', 3);
    game.initBoard();
    
    expect(game.board.length).toBe(3);
    expect(game.board[0].length).toBe(3);
    expect(game.board[2][2]).toBeNull(); // Last tile is empty
    expect(game.emptyTile).toEqual({ x: 2, y: 2 });
    
    game.destroy();
  });

  it('should correctly identify movable neighbor tiles and swap them', () => {
    const game = new PuzzleGame('puzzle-container', 'https://example.com/photo.jpg', 3);
    game.initBoard();

    // In 3x3 with empty at (2,2), neighbors are (1,2) and (2,1)
    expect(game.canMove(1, 2)).toBe(true);
    expect(game.canMove(2, 1)).toBe(true);
    expect(game.canMove(0, 0)).toBe(false);

    // Swap tile (1, 2)
    const originalTile = game.board[2][1];
    game.swap(1, 2);

    expect(game.board[2][2]).toEqual(originalTile);
    expect(game.board[2][1]).toBeNull();
    expect(game.emptyTile).toEqual({ x: 1, y: 2 });

    game.destroy();
  });

  it('should clean up listeners and intervals on destroy', () => {
    const game = new PuzzleGame('puzzle-container', 'https://example.com/photo.jpg', 3);
    game.init();
    
    game.destroy();
    const container = document.getElementById('puzzle-container');
    expect(container.children.length).toBe(0);
  });
});

describe('Puzzle Gallery Image List Provider', () => {
  it('should cleanly deduplicate and combine DB photos and timeline photos without phantom duplicates', () => {
    state.dbPuzzleImages = [
      { id: '1', src: 'https://cdn.example.com/photo1.jpg', name: 'Foto 1' },
      { id: '2', src: 'https://cdn.example.com/photo2.jpg', name: 'Foto 2' }
    ];

    state.timelineEvents = [
      { id: 't1', title: 'Výlet', images: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo3.jpg'] },
      { id: 't2', title: 'Oslava', images: ['https://cdn.example.com/photo2.jpg'] }
    ];

    const list = getPuzzleImageList();
    // Unique URLs: photo1, photo2, photo3
    expect(list.length).toBe(3);
    expect(list.map(i => i.src)).toEqual([
      'https://cdn.example.com/photo1.jpg',
      'https://cdn.example.com/photo2.jpg',
      'https://cdn.example.com/photo3.jpg'
    ]);
  });
});
