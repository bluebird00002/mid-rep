import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total memories
    const [memoryCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM memories WHERE user_id = ?',
      [userId]
    );
    const totalMemories = memoryCount[0].total;

    // Get total images
    const [imageCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM images WHERE user_id = ?',
      [userId]
    );
    const totalImages = imageCount[0].total;

    // Get categories
    const [categories] = await pool.execute(
      'SELECT name, count FROM categories WHERE user_id = ? ORDER BY count DESC',
      [userId]
    );
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.count;
    });

    // Get tags
    const [tags] = await pool.execute(
      'SELECT name, count FROM tags WHERE user_id = ? ORDER BY count DESC LIMIT 20',
      [userId]
    );
    const tagMap = {};
    tags.forEach(tag => {
      tagMap[tag.name] = tag.count;
    });

    res.json({
      success: true,
      data: {
        total_memories: parseInt(totalMemories),
        total_images: parseInt(totalImages),
        categories: categoryMap,
        tags: tagMap
      },
      message: 'Statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

export default router;

