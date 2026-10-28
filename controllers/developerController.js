const pool = require('../db/pool');

exports.listDevelopers = async (req, res, next) => {
  try {
    const query = `
      SELECT d.id, d.name, d.country, d.website, COUNT(gd.game_id)::int AS game_count
      FROM developers d
      LEFT JOIN game_developers gd ON d.id = gd.developer_id
      GROUP BY d.id
      ORDER BY d.name ASC;
    `;
    const { rows: developers } = await pool.query(query);
    res.render('developers/index', {
      title: 'Developers',
      activeNav: 'developers',
      developers
    });
  } catch (err) {
    next(err);
  }
};

exports.showDeveloper = async (req, res, next) => {
  const { id } = req.params;
  try {
    const devResult = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
    if (devResult.rows.length === 0) {
      return res.status(404).render('404', { title: 'Developer Not Found' });
    }
    const developer = devResult.rows[0];

    const gamesQuery = `
      SELECT g.id, g.title, g.release_year,
             COALESCE(string_agg(DISTINCT gen.name, ', '), '') AS genres_list
      FROM games g
      JOIN game_developers gd ON g.id = gd.game_id
      LEFT JOIN game_genres gg ON g.id = gg.game_id
      LEFT JOIN genres gen ON gg.genre_id = gen.id
      WHERE gd.developer_id = $1
      GROUP BY g.id
      ORDER BY g.title ASC;
    `;
    const { rows: games } = await pool.query(gamesQuery, [id]);

    res.render('developers/show', {
      title: developer.name,
      activeNav: 'developers',
      developer,
      games
    });
  } catch (err) {
    next(err);
  }
};

exports.newDeveloperForm = (req, res) => {
  res.render('developers/new', {
    title: 'New Developer',
    activeNav: 'developers',
    developer: {},
    error: null
  });
};

exports.createDeveloper = async (req, res, next) => {
  const { name, country, website } = req.body;
  if (!name || !name.trim()) {
    return res.render('developers/new', {
      title: 'New Developer',
      activeNav: 'developers',
      developer: { name, country, website },
      error: 'Developer name is required.'
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO developers (name, country, website) VALUES ($1, $2, $3) RETURNING id',
      [name.trim(), country ? country.trim() : null, website ? website.trim() : null]
    );
    res.redirect(`/developers/${result.rows[0].id}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.render('developers/new', {
        title: 'New Developer',
        activeNav: 'developers',
        developer: { name, country, website },
        error: 'A developer with that name already exists.'
      });
    }
    next(err);
  }
};

exports.editDeveloperForm = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('404', { title: 'Developer Not Found' });
    }
    res.render('developers/edit', {
      title: `Edit ${result.rows[0].name}`,
      activeNav: 'developers',
      developer: result.rows[0],
      error: null
    });
  } catch (err) {
    next(err);
  }
};

exports.updateDeveloper = async (req, res, next) => {
  const { id } = req.params;
  const { name, country, website } = req.body;

  if (!name || !name.trim()) {
    return res.render('developers/edit', {
      title: 'Edit Developer',
      activeNav: 'developers',
      developer: { id, name, country, website },
      error: 'Developer name is required.'
    });
  }

  try {
    await pool.query(
      'UPDATE developers SET name = $1, country = $2, website = $3 WHERE id = $4',
      [name.trim(), country ? country.trim() : null, website ? website.trim() : null, id]
    );
    res.redirect(`/developers/${id}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.render('developers/edit', {
        title: 'Edit Developer',
        activeNav: 'developers',
        developer: { id, name, country, website },
        error: 'A developer with that name already exists.'
      });
    }
    next(err);
  }
};

exports.deleteDeveloper = async (req, res, next) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM developers WHERE id = $1', [id]);
    res.redirect('/developers');
  } catch (err) {
    next(err);
  }
};
