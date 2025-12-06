import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { q, category, tags } = req.query;

    if (!q && !category && !tags) {
      return res.status(400).json({
        success: false,
        error: 'Search query, category, or tags required'
      });
    }

    let query = 'SELECT * FROM memories WHERE user_id = ?';
    const params = [userId];

    if (q) {
      query += ' AND (content LIKE ? OR description LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (tags) {
      const tagArray = tags.split(',');
      for (const tag of tagArray) {
        query += ' AND JSON_CONTAINS(tags, ?)';
        params.push(JSON.stringify([tag.trim()]));
      }
    }

    query += ' ORDER BY created_at DESC';

    const [memories] = await pool.execute(query, params);

    const formattedMemories = memories.map(row => ({
      id: row.id,
      type: row.type,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      description: row.description,
      created_at: row.created_at
    }));

    res.json({
      success: true,
      data: { memories: formattedMemories },
      message: 'Search completed successfully'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

export default router;

