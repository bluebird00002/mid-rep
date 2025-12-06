import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [tags] = await pool.execute(
      'SELECT name, count FROM tags WHERE user_id = ? ORDER BY count DESC',
      [userId]
    );

    const formattedTags = tags.map(tag => ({
      name: tag.name,
      count: parseInt(tag.count)
    }));

    res.json({
      success: true,
      data: { tags: formattedTags },
      message: 'Tags retrieved successfully'
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags'
    });
  }
});

export default router;

