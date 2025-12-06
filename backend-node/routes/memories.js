import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all memories for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, type, tags, date, limit } = req.query;

    let query = 'SELECT * FROM memories WHERE user_id = ?';
    const params = [userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (tags) {
      // Support comma-separated tags - find memories containing any of the tags
      const tagList = tags.split(',').map(t => t.trim());
      const tagConditions = tagList.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
      query += ` AND (${tagConditions})`;
      tagList.forEach(tag => params.push(JSON.stringify(tag)));
    }

    if (date) {
      query += ' AND DATE(created_at) LIKE ?';
      params.push(`${date}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [memories] = await pool.execute(query, params);

    const formattedMemories = memories.map(formatMemory);

    res.json({
      success: true,
      data: { memories: formattedMemories },
      message: 'Memories retrieved successfully'
    });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve memories'
    });
  }
});

// Get single memory
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;

    const [memories] = await pool.execute(
      'SELECT * FROM memories WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    );

    if (memories.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found'
      });
    }

    res.json({
      success: true,
      data: { memory: formatMemory(memories[0]) },
      message: 'Memory retrieved successfully'
    });
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve memory'
    });
  }
});

// Create memory
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      type = 'text',
      content,
      category,
      tags = [],
      columns,
      rows,
      items,
      events,
      description,
      image_url
    } = req.body;

    // Ensure tags is an array
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);

    // Validate required fields based on type
    if (type === 'text' && !content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for text memories'
      });
    }
    if (type === 'table' && (!columns || !rows)) {
      return res.status(400).json({
        success: false,
        error: 'Columns and rows are required for table memories'
      });
    }
    if (type === 'list' && !items) {
      return res.status(400).json({
        success: false,
        error: 'Items are required for list memories'
      });
    }
    if (type === 'timeline' && !events) {
      return res.status(400).json({
        success: false,
        error: 'Events are required for timeline memories'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO memories 
       (user_id, type, content, category, tags, \`columns\`, \`rows\`, items, events, description, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        content || null,
        category || null,
        JSON.stringify(tagsArray),
        columns ? JSON.stringify(columns) : null,
        rows ? JSON.stringify(rows) : null,
        items ? JSON.stringify(items) : null,
        events ? JSON.stringify(events) : null,
        description || null,
        image_url || null
      ]
    );

    // Update tags and categories (non-blocking - don't fail if these fail)
    try {
      if (category) {
        await updateCategoryCount(userId, category);
      }
    } catch (err) {
      console.warn('Failed to update category count:', err);
    }
    
    try {
      if (tagsArray && tagsArray.length > 0) {
        for (const tag of tagsArray) {
          await updateTagCount(userId, tag);
        }
      }
    } catch (err) {
      console.warn('Failed to update tag count:', err);
    }

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Memory created successfully'
    });
  } catch (error) {
    console.error('Create memory error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create memory',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update memory
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;
    const updates = req.body;

    // Verify ownership
    const [memories] = await pool.execute(
      'SELECT id FROM memories WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    );

    if (memories.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (updates.content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(updates.content);
    }

    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(updates.category);
    }

    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(updates.tags));
    }

    if (updates.columns !== undefined) {
      updateFields.push('`columns` = ?');
      updateValues.push(JSON.stringify(updates.columns));
    }

    if (updates.rows !== undefined) {
      updateFields.push('`rows` = ?');
      updateValues.push(JSON.stringify(updates.rows));
    }

    if (updates.items !== undefined) {
      updateFields.push('items = ?');
      updateValues.push(JSON.stringify(updates.items));
    }

    if (updates.events !== undefined) {
      updateFields.push('events = ?');
      updateValues.push(JSON.stringify(updates.events));
    }

    if (updates.add) {
      // Append to existing content
      const [existing] = await pool.execute(
        'SELECT content FROM memories WHERE id = ? AND user_id = ?',
        [memoryId, userId]
      );
      if (existing.length > 0) {
        updateFields.push('content = ?');
        updateValues.push(existing[0].content + '\n' + updates.add);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }

    updateValues.push(memoryId, userId);

    await pool.execute(
      `UPDATE memories SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    res.json({
      success: true,
      data: { id: memoryId },
      message: 'Memory updated successfully'
    });
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory'
    });
  }
});

// Delete memory
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM memories WHERE id = ? AND user_id = ?',
      [memoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found'
      });
    }

    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory'
    });
  }
});

// Bulk delete memories
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deleteAll, category, tags } = req.query;

    let query = 'DELETE FROM memories WHERE user_id = ?';
    const params = [userId];

    // If not deleteAll, must have category or tags filter
    if (deleteAll !== 'true') {
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        const tagConditions = tagList.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
        query += ` AND (${tagConditions})`;
        tagList.forEach(tag => params.push(JSON.stringify(tag)));
      }

      // If no filters provided, don't allow bulk delete
      if (!category && !tags) {
        return res.status(400).json({
          success: false,
          error: 'Must specify deleteAll=true, category, or tags for bulk delete'
        });
      }
    }

    const [result] = await pool.execute(query, params);

    res.json({
      success: true,
      data: { deletedCount: result.affectedRows },
      message: `${result.affectedRows} memories deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memories'
    });
  }
});

// Helper functions
function formatMemory(row) {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    columns: row[`columns`] ? JSON.parse(row[`columns`]) : null,
    rows: row[`rows`] ? JSON.parse(row[`rows`]) : null,
    items: row.items ? JSON.parse(row.items) : null,
    events: row.events ? JSON.parse(row.events) : null,
    description: row.description,
    image_url: row.image_url,
    has_image: !!row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function updateCategoryCount(userId, category) {
  await pool.execute(
    `INSERT INTO categories (user_id, name, count) 
     VALUES (?, ?, 1) 
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [userId, category]
  );
}

async function updateTagCount(userId, tag) {
  await pool.execute(
    `INSERT INTO tags (user_id, name, count) 
     VALUES (?, ?, 1) 
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [userId, tag]
  );
}

export default router;

