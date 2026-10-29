import pool from './pool';
import { PlaythroughStatus } from '../types';

export async function seedDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('Starting database seeding...');
    await client.query('BEGIN');

    // 1. Clear existing data
    await client.query(`
      TRUNCATE user_games, game_platforms, game_developers, game_genres, 
               platforms, developers, genres, games, users CASCADE;
    `);

    // 2. Ensure default user exists
    const userRes = await client.query<{ id: number }>(`
      INSERT INTO users (username, email)
      VALUES ('harsha', 'harsha@example.com')
      RETURNING id;
    `);
    const userId = userRes.rows[0].id;
    console.log(`✓ Seeded user: harsha (ID: ${userId})`);

    // 3. Seed Genres
    const genresData: [string, string][] = [
      ['Action RPG', 'Combat-heavy role playing games with real-time mechanics and character progression.'],
      ['Roguelike', 'Procedurally generated runs with permadeath or meta-progression across attempts.'],
      ['Metroidvania', 'Guided non-linear exploration and utility-gated progression in interconnected maps.'],
      ['RPG', 'Role-playing games focused on rich storylines, dialogue choices, and custom character builds.'],
      ['Open World', 'Expansive non-linear environments with emergent gameplay and freedom of approach.'],
      ['Platformer', 'Navigation and movement through environments using jumping and precise traversal.'],
      ['Indie', 'Independent productions emphasizing unique art style and creative game design.']
    ];

    const genreMap: Record<string, number> = {};
    for (const [name, desc] of genresData) {
      const res = await client.query<{ id: number }>(
        'INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING id',
        [name, desc]
      );
      genreMap[name] = res.rows[0].id;
    }
    console.log(`✓ Seeded ${genresData.length} genres`);

    // 4. Seed Developers
    const developersData: [string, string, string][] = [
      ['FromSoftware', 'Japan', 'https://www.fromsoftware.jp'],
      ['Supergiant Games', 'United States', 'https://www.supergiantgames.com'],
      ['CD Projekt Red', 'Poland', 'https://www.cdprojektred.com'],
      ['Team Cherry', 'Australia', 'https://www.teamcherry.com.au'],
      ['Valve', 'United States', 'https://www.valvesoftware.com']
    ];

    const devMap: Record<string, number> = {};
    for (const [name, country, website] of developersData) {
      const res = await client.query<{ id: number }>(
        'INSERT INTO developers (name, country, website) VALUES ($1, $2, $3) RETURNING id',
        [name, country, website]
      );
      devMap[name] = res.rows[0].id;
    }
    console.log(`✓ Seeded ${developersData.length} developers`);

    // 5. Seed Platforms
    const platformsData = ['PC', 'PlayStation 5', 'Nintendo Switch', 'Xbox Series X'];
    const platformMap: Record<string, number> = {};
    for (const name of platformsData) {
      const res = await client.query<{ id: number }>(
        'INSERT INTO platforms (name) VALUES ($1) RETURNING id',
        [name]
      );
      platformMap[name] = res.rows[0].id;
    }
    console.log(`✓ Seeded ${platformsData.length} platforms`);

    // 6. Seed Games
    interface SeedGame {
      title: string;
      release_year: number;
      description: string;
      genres: string[];
      developers: string[];
      platforms: string[];
    }

    const gamesData: SeedGame[] = [
      {
        title: 'Elden Ring',
        release_year: 2022,
        description: 'An open-world action RPG set in the Lands Between, featuring vast landscapes, challenging bosses, and deep lore created in collaboration with George R.R. Martin.',
        genres: ['Action RPG', 'Open World'],
        developers: ['FromSoftware'],
        platforms: ['PC', 'PlayStation 5', 'Xbox Series X']
      },
      {
        title: 'Hades',
        release_year: 2020,
        description: 'A rogue-like dungeon crawler where you defy the god of the dead as you hack and slash your way out of the Underworld of Greek myth.',
        genres: ['Roguelike', 'Action RPG', 'Indie'],
        developers: ['Supergiant Games'],
        platforms: ['PC', 'PlayStation 5', 'Nintendo Switch', 'Xbox Series X']
      },
      {
        title: 'Hollow Knight',
        release_year: 2017,
        description: 'A 2D Metroidvania action-adventure exploring the vast ruined kingdom of Hallownest, populated by insects and infected creatures.',
        genres: ['Metroidvania', 'Platformer', 'Indie'],
        developers: ['Team Cherry'],
        platforms: ['PC', 'PlayStation 5', 'Nintendo Switch']
      },
      {
        title: 'The Witcher 3: Wild Hunt',
        release_year: 2015,
        description: 'A story-driven open world RPG set in a dark fantasy universe. Play as Geralt of Rivia, a monster hunter searching for the child of prophecy.',
        genres: ['RPG', 'Open World'],
        developers: ['CD Projekt Red'],
        platforms: ['PC', 'PlayStation 5', 'Nintendo Switch', 'Xbox Series X']
      },
      {
        title: 'Cyberpunk 2077',
        release_year: 2020,
        description: 'An open-world, action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour, and body modification.',
        genres: ['Action RPG', 'Open World'],
        developers: ['CD Projekt Red'],
        platforms: ['PC', 'PlayStation 5', 'Xbox Series X']
      },
      {
        title: 'Portal 2',
        release_year: 2011,
        description: 'A puzzle-platform game that challenges players to use an aperture science handheld portal device to navigate mind-bending chambers.',
        genres: ['Platformer'],
        developers: ['Valve'],
        platforms: ['PC', 'Nintendo Switch']
      }
    ];

    const gameMap: Record<string, number> = {};
    for (const g of gamesData) {
      const gRes = await client.query<{ id: number }>(
        'INSERT INTO games (title, release_year, description) VALUES ($1, $2, $3) RETURNING id',
        [g.title, g.release_year, g.description]
      );
      const gId = gRes.rows[0].id;
      gameMap[g.title] = gId;

      for (const genreName of g.genres) {
        await client.query('INSERT INTO game_genres (game_id, genre_id) VALUES ($1, $2)', [gId, genreMap[genreName]]);
      }
      for (const devName of g.developers) {
        await client.query('INSERT INTO game_developers (game_id, developer_id) VALUES ($1, $2)', [gId, devMap[devName]]);
      }
      for (const platName of g.platforms) {
        await client.query('INSERT INTO game_platforms (game_id, platform_id) VALUES ($1, $2)', [gId, platformMap[platName]]);
      }
    }
    console.log(`✓ Seeded ${gamesData.length} catalog games with category associations`);

    // 7. Seed User Library Entries
    interface SeedLibraryEntry {
      title: string;
      status: PlaythroughStatus;
      rating: number | null;
      hours_played: number;
      notes: string;
    }

    const libraryData: SeedLibraryEntry[] = [
      {
        title: 'Elden Ring',
        status: 'Completed',
        rating: 10,
        hours_played: 145.0,
        notes: 'Phenomenal world design, deep build diversity, and unforgettable boss fights. Defeated Malenia solo on first playthrough.'
      },
      {
        title: 'Hades',
        status: 'Completed',
        rating: 9,
        hours_played: 62.5,
        notes: 'Flawless synergy between story progression and roguelike mechanics. Cleared up to 32 heat with the bow.'
      },
      {
        title: 'Hollow Knight',
        status: 'Currently Playing',
        rating: 9,
        hours_played: 28.0,
        notes: 'Currently exploring the Deepnest and Kingdom\'s Edge. Superb atmosphere and tight platforming.'
      },
      {
        title: 'Cyberpunk 2077',
        status: 'Currently Playing',
        rating: 8,
        hours_played: 41.0,
        notes: 'Night City visual fidelity is incredible. Phantom Liberty DLC storyline is gripping.'
      },
      {
        title: 'The Witcher 3: Wild Hunt',
        status: 'Want to Play',
        rating: null,
        hours_played: 0,
        notes: 'Next in queue after wrapping up Hollow Knight.'
      },
      {
        title: 'Portal 2',
        status: 'Want to Play',
        rating: null,
        hours_played: 0,
        notes: 'Need to schedule co-op campaign playthrough with friends.'
      }
    ];

    for (const entry of libraryData) {
      await client.query(
        `INSERT INTO user_games (user_id, game_id, status, rating, hours_played, review_notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, gameMap[entry.title], entry.status, entry.rating, entry.hours_played, entry.notes]
      );
    }
    console.log(`✓ Seeded ${libraryData.length} library entries for user`);

    await client.query('COMMIT');
    console.log('✓ Seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}
