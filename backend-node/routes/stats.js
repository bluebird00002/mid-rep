import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total memories
    const memoriesSnap = await db.collection('memories')
      .where('user_id', '==', userId)
      .count()
      .get();
    const totalMemories = memoriesSnap.data().count;

    // Get total images
    const imagesSnap = await db.collection('images')
      .where('user_id', '==', userId)
      .count()
      .get();
    const totalImages = imagesSnap.data().count;

    // Get categories
    const categoriesSnap = await db.collection('categories')
      .where('user_id', '==', userId)
      .orderBy('count', 'desc')
      .get();
    const categoryMap = {};
    categoriesSnap.docs.forEach(doc => {
      categoryMap[doc.data().name] = doc.data().count;
    });

    // Get top 20 tags
    const tagsSnap = await db.collection('tags')
      .where('user_id', '==', userId)
      .orderBy('count', 'desc')
      .limit(20)
      .get();
    const tagMap = {};
    tagsSnap.docs.forEach(doc => {
      tagMap[doc.data().name] = doc.data().count;
    });

    res.json({
      success: true,
      data: {
        total_memories: totalMemories,
        total_images: totalImages,
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

