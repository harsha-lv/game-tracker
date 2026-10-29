import { Request } from 'express';

export type PlaythroughStatus =
  | 'Want to Play'
  | 'Currently Playing'
  | 'Completed'
  | 'On Hold'
  | 'Dropped';

export interface User {
  id: number;
  username: string;
  email?: string | null;
  created_at?: Date;
}

export interface Game {
  id: number;
  title: string;
  description?: string | null;
  release_year?: number | null;
  created_at?: Date;
  updated_at?: Date;
  genres_list?: string;
  developers_list?: string;
  user_status?: PlaythroughStatus | null;
  user_game_id?: number | null;
}

export interface Genre {
  id: number;
  name: string;
  description?: string | null;
  game_count?: number;
}

export interface Developer {
  id: number;
  name: string;
  country?: string | null;
  website?: string | null;
  game_count?: number;
}

export interface Platform {
  id: number;
  name: string;
}

export interface UserGame {
  id: number;
  user_id: number;
  game_id: number;
  status: PlaythroughStatus;
  rating?: number | null;
  review_notes?: string | null;
  hours_played: number;
  created_at?: Date;
  updated_at?: Date;
  title?: string;
  release_year?: number | null;
  genres_list?: string;
  developers_list?: string;
}

export interface LibraryCounts {
  total_count: number;
  want_count: number;
  playing_count: number;
  completed_count: number;
  hold_count: number;
  dropped_count: number;
}

// Extend Express Request to include currentUser
declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}
