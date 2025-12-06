import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [categories] = await pool.execute(
      'SELECT name, count FROM categories WHERE user_id = ? ORDER BY count DESC',
      [userId]
    );

    const formattedCategories = categories.map(cat => ({
      name: cat.name,
      count: parseInt(cat.count)
    }));

    res.json({
      success: true,
      data: { categories: formattedCategories },
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories'
    });
  }
});

export default router;

