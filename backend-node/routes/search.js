import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { admin, db } from "../config/firebase.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { q, category, tags } = req.query;

    if (!q && !category && !tags) {
      return res.status(400).json({
        success: false,
        error: "Search query, category, or tags required",
      });
    }

    let query = db.collection("memories").where("user_id", "==", userId);

    if (category) {
      query = query.where("category", "==", category);
    }

    query = query.orderBy("created_at", "desc");

    let memories = [];
    const snap = await query.get();

    snap.docs.forEach((doc) => {
      const data = doc.data();
      memories.push({
        id: doc.id,
        ...data,
      });
    });

    // Filter by search query (full-text search not available in Firestore, so do in code)
    if (q) {
      const lowerQ = q.toLowerCase();
      memories = memories.filter(
        (mem) =>
          (mem.content && mem.content.toLowerCase().includes(lowerQ)) ||
          (mem.description && mem.description.toLowerCase().includes(lowerQ))
      );
    }

    // Filter by tags if specified
    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      memories = memories.filter(
        (mem) => mem.tags && mem.tags.some((tag) => tagArray.includes(tag))
      );
    }

    const formattedMemories = memories.map((mem) => {
      const created_at =
        mem.created_at instanceof admin.firestore.Timestamp
          ? mem.created_at.toDate().toISOString()
          : mem.created_at;

      return {
        id: mem.id,
        type: mem.type,
        content: mem.content,
        category: mem.category,
        tags: mem.tags || [],
        description: mem.description,
        created_at,
      };
    });

    res.json({
      success: true,
      data: { memories: formattedMemories },
      message: "Search completed successfully",
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
    });
  }
});

export default router;
