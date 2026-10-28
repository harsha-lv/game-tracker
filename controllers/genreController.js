const pool = require('../db/pool');

exports.listGenres = async (req, res, next) => {
  try {
    const query = `
      SELECT g.id, g.name, g.description, COUNT(gg.game_id)::int AS game_count
      FROM genres g
      LEFT JOIN game_genres gg ON g.id = gg.genre_id
      GROUP BY g.id
      ORDER BY g.name ASC;
    `;
    const { rows: genres } = await pool.query(query);
    res.render('genres/index', {
      title: 'Genres',
      activeNav: 'genres',
      genres
    });
  } catch (err) {
    next(err);
  }
};

exports.showGenre = async (req, res, next) => {
  const { id } = req.params;
  try {
    const genreResult = await pool.query('SELECT * FROM genres WHERE id = $1', [id]);
    if (genreResult.rows.length === 0) {
      return res.status(404).render('404', { title: 'Genre Not Found' });
    }
    const genre = genreResult.rows[0];

    const gamesQuery = `
      SELECT g.id, g.title, g.release_year,
             COALESCE(string_agg(DISTINCT d.name, ', '), '') AS developers_list
      FROM games g
      JOIN game_genres gg ON g.id = gg.game_id
      LEFT JOIN game_developers gd ON g.id = gd.game_id
      LEFT JOIN developers d ON gd.developer_id = d.id
      WHERE gg.genre_id = $1
      GROUP BY g.id
      ORDER BY g.title ASC;
    `;
    const { rows: games } = await pool.query(gamesQuery, [id]);

    res.render('genres/show', {
      title: genre.name,
      activeNav: 'genres',
      genre,
      games
    });
  } catch (err) {
    next(err);
  }
};

exports.newGenreForm = (req, res) => {
  res.render('genres/new', {
    title: 'New Genre',
    activeNav: 'genres',
    genre: {},
    error: null
  });
};

exports.createGenre = async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.render('genres/new', {
      title: 'New Genre',
      activeNav: 'genres',
      genre: { name, description },
      error: 'Genre name is required.'
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING id',
      [name.trim(), description ? description.trim() : null]
    );
    res.redirect(`/genres/${result.rows[0].id}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.render('genres/new', {
        title: 'New Genre',
        activeNav: 'genres',
        genre: { name, description },
        error: 'A genre with that name already exists.'
      });
    }
    next(err);
  }
};

exports.editGenreForm = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM genres WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('404', { title: 'Genre Not Found' });
    }
    res.render('genres/edit', {
      title: `Edit ${result.rows[0].name}`,
      activeNav: 'genres',
      genre: result.rows[0],
      error: null
    });
  } catch (err) {
    next(err);
  }
};

exports.updateGenre = async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.render('genres/edit', {
      title: 'Edit Genre',
      activeNav: 'genres',
      genre: { id, name, description },
      error: 'Genre name is required.'
    });
  }

  try {
    await pool.query(
      'UPDATE genres SET name = $1, description = $2 WHERE id = $3',
      [name.trim(), description ? description.trim() : null, id]
    );
    res.redirect(`/genres/${id}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.render('genres/edit', {
        title: 'Edit Genre',
        activeNav: 'genres',
        genre: { id, name, description },
        error: 'A genre with that name already exists.'
      });
    }
    next(err);
  }
};

exports.deleteGenre = async (req, res, next) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM genres WHERE id = $1', [id]);
    res.redirect('/genres');
  } catch (err) {
    next(err);
  }
};
