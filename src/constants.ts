import { Game, Tournament } from './types';

export interface GameMode {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
}

export const GAME_MODES_DATA: Record<string, GameMode[]> = {
  freefire: [
    { id: 'br_solo', title: 'BR SOLO', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'br_duo', title: 'BR DUO', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'br_squad', title: 'BR SQUAD', subtitle: 'Battle Royale', category: 'Battle Royale', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_solo', title: 'CS SOLO', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_duo', title: 'CS DUO', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'cs_squad', title: 'CS SQUAD', subtitle: 'Clash Squad', category: 'Clash Squad', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'lone_wolf_solo', title: 'LONE WOLF SOLO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
    { id: 'lone_wolf_duo', title: 'LONE WOLF DUO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg' },
  ]
};

export const GAMES: Game[] = [
  {
    id: 'freefire',
    title: 'Free Fire',
    image: 'https://i.ibb.co/v4v8Q5N/freefire.jpg',
    players: 850,
  }
];

