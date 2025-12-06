import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const snap = await db.collection('tags')
      .where('user_id', '==', userId)
      .orderBy('count', 'desc')
      .get();

    const tags = snap.docs.map(doc => ({
      name: doc.data().name,
      count: doc.data().count || 0
    }));

    res.json({
      success: true,
      data: { tags },
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

