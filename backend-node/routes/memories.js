import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { admin, db } from "../config/firebase.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all memories for authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, type, tags, date, limit } = req.query;

    console.log("🔎 Get memories request by user:", userId, "query:", {
      category,
      type,
      tags,
      date,
      limit,
    });

    let query = db.collection("memories").where("user_id", "==", userId);
    if (type) query = query.where("type", "==", type);

    // Do not use server-side orderBy to avoid composite index requirements.
    // We'll fetch the user's documents and apply filters/sorting in-memory.
    const snap = await query.get();
    let memories = snap.docs.map((doc) =>
      formatMemory({ id: doc.id, ...doc.data() })
    );

    // Apply in-memory sorting by created_at (newest first)
    memories.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    // Apply limit in-memory if provided
    if (limit) memories = memories.slice(0, parseInt(limit));

    // Filter by tags if specified (in-memory)
    // Filter by tags if specified (in-memory) - case-insensitive
    if (tags) {
      let tagList = [];
      if (Array.isArray(tags)) {
        tagList = tags
          .flatMap((t) => String(t).split(","))
          .map((t) => t.trim());
      } else {
        tagList = String(tags)
          .split(",")
          .map((t) => t.trim());
      }
      tagList = tagList.filter(Boolean).map((t) => t.toLowerCase());
      if (tagList.length) {
        memories = memories.filter((mem) => {
          const memTags = (mem.tags || []).map((t) => String(t).toLowerCase());
          return memTags.some((mt) => tagList.includes(mt));
        });
      }
    }

    // Filter by date if specified (in-memory)
    if (date) {
      memories = memories.filter((mem) => {
        const memDate =
          mem.created_at instanceof admin.firestore.Timestamp
            ? mem.created_at.toDate().toISOString().split("T")[0]
            : mem.created_at?.split("T")[0];
        return memDate && memDate.startsWith(date);
      });
    }

    // Filter by category if specified (in-memory) - case-insensitive
    if (category) {
      const categoryLc = String(category).toLowerCase();
      memories = memories.filter((mem) => {
        const memCat = mem.category ? String(mem.category).toLowerCase() : null;
        return memCat === categoryLc;
      });
    }

    console.log(`✅ Retrieved ${memories.length} memories for user ${userId}`);
    res.json({
      success: true,
      data: { memories },
      message: "Memories retrieved successfully",
    });
  } catch (error) {
    console.error("Get memories error:", error && (error.stack || error));
    res.status(500).json({
      success: false,
      error: "Failed to retrieve memories",
      details: error && (error.message || String(error)),
    });
  }
});

// Debug endpoint for memories (protected). Returns Firestore connectivity and counts.
router.get("/_debug", async (req, res) => {
  try {
    const userId = req.user.userId;
    const snap = await db
      .collection("memories")
      .where("user_id", "==", userId)
      .limit(1)
      .get();
    const totalSnap = await db
      .collection("memories")
      .where("user_id", "==", userId)
      .get();
    res.json({
      success: true,
      data: {
        firestoreAvailable: true,
        sampleCount: snap.size,
        totalCount: totalSnap.size,
      },
    });
  } catch (err) {
    console.error("Memories debug error:", err && (err.stack || err));
    res.status(500).json({
      success: false,
      error: "Debug failed",
      details: err && (err.message || String(err)),
    });
  }
});

// Get single memory
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;
    const doc = await db.collection("memories").doc(memoryId).get();
    if (!doc.exists || doc.data().user_id !== userId)
      return res
        .status(404)
        .json({ success: false, error: "Memory not found" });
    res.json({
      success: true,
      data: { memory: formatMemory({ id: doc.id, ...doc.data() }) },
      message: "Memory retrieved successfully",
    });
  } catch (error) {
    console.error("Get memory error:", error && (error.stack || error));
    res.status(500).json({
      success: false,
      error: "Failed to retrieve memory",
      details: error && (error.message || String(error)),
    });
  }
});

// Create memory
router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      type = "text",
      content,
      category,
      tags = [],
      columns,
      rows,
      items,
      events,
      description,
      image_url,
    } = req.body;

    console.log("📝 Create memory request:", {
      type,
      content: content?.substring(0, 50),
      category,
      tags,
      tagsType: typeof tags,
      isArray: Array.isArray(tags),
    });

    // Normalize tags (accept array or comma-separated string)
    let tagsArray = [];
    if (Array.isArray(tags))
      tagsArray = tags
        .map((t) => (typeof t === "string" ? t.trim() : t))
        .filter(Boolean);
    else if (typeof tags === "string")
      tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    else if (tags) tagsArray = [tags];

    // Validate required fields
    if (type === "text" && !content)
      return res.status(400).json({
        success: false,
        error: "Content is required for text memories",
      });

    const docRef = await db.collection("memories").add({
      user_id: userId,
      type,
      content: content || null,
      category: category || null,
      tags: tagsArray,
      columns: columns || null,
      rows: rows || null,
      items: items || null,
      events: events || null,
      description: description || null,
      image_url: image_url || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update tags and categories (non-blocking)
    try {
      if (category) await updateCategoryCount(userId, category);
    } catch (err) {
      console.warn("Failed to update category count:", err);
    }
    try {
      if (tagsArray.length)
        for (const tag of tagsArray) await updateTagCount(userId, tag);
    } catch (err) {
      console.warn("Failed to update tag count:", err);
    }

    res.status(201).json({
      success: true,
      data: { id: docRef.id },
      message: "Memory created successfully",
    });
  } catch (error) {
    console.error("Create memory error:", error && (error.stack || error));
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create memory",
      details: error && (error.message || String(error)),
    });
  }
});

// Update memory
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;
    const updates = req.body;

    // Verify ownership
    const doc = await db.collection("memories").doc(memoryId).get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: "Memory not found",
      });
    }

    // Build update object
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }

    if (updates.tags !== undefined) {
      updateData.tags = updates.tags;
    }

    if (updates.columns !== undefined) {
      updateData.columns = updates.columns;
    }

    if (updates.rows !== undefined) {
      updateData.rows = updates.rows;
    }

    if (updates.items !== undefined) {
      updateData.items = updates.items;
    }

    if (updates.events !== undefined) {
      updateData.events = updates.events;
    }

    if (updates.add) {
      // Append to existing content
      const existingData = doc.data();
      updateData.content = (existingData.content || "") + "\n" + updates.add;
    }

    if (Object.keys(updateData).length === 1) {
      // Only updated_at, no actual updates
      return res.status(400).json({
        success: false,
        error: "No updates provided",
      });
    }

    await db.collection("memories").doc(memoryId).update(updateData);

    res.json({
      success: true,
      data: { id: memoryId },
      message: "Memory updated successfully",
    });
  } catch (error) {
    console.error("Update memory error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update memory",
    });
  }
});

// Delete memory
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const memoryId = req.params.id;

    // Verify ownership
    const doc = await db.collection("memories").doc(memoryId).get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: "Memory not found",
      });
    }

    await db.collection("memories").doc(memoryId).delete();

    res.json({
      success: true,
      message: "Memory deleted successfully",
    });
  } catch (error) {
    console.error("Delete memory error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete memory",
    });
  }
});

// Bulk delete memories
router.delete("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deleteAll, category, tags } = req.query;

    if (deleteAll !== "true" && !category && !tags) {
      return res.status(400).json({
        success: false,
        error: "Must specify deleteAll=true, category, or tags for bulk delete",
      });
    }

    // Fetch matching memories (base: all user's memories)
    let query = db.collection("memories").where("user_id", "==", userId);
    const snap = await query.get();
    let docsToDelete = snap.docs;

    // Filter by category if specified (case-insensitive)
    if (category) {
      const categoryLc = String(category).toLowerCase();
      docsToDelete = docsToDelete.filter((doc) => {
        const memCat = doc.data().category
          ? String(doc.data().category).toLowerCase()
          : null;
        return memCat === categoryLc;
      });
    }

    // Filter by tags if specified (case-insensitive)
    if (tags) {
      let tagList = [];
      if (Array.isArray(tags))
        tagList = tags
          .flatMap((t) => String(t).split(","))
          .map((t) => t.trim());
      else
        tagList = String(tags)
          .split(",")
          .map((t) => t.trim());
      tagList = tagList.filter(Boolean).map((t) => t.toLowerCase());
      if (tagList.length) {
        docsToDelete = docsToDelete.filter((doc) => {
          const memTags = (doc.data().tags || []).map((t) =>
            String(t).toLowerCase()
          );
          return memTags.some((mt) => tagList.includes(mt));
        });
      }
    }

    // Delete in batches
    let deletedCount = 0;
    const batch = db.batch();
    for (let i = 0; i < docsToDelete.length; i++) {
      batch.delete(docsToDelete[i].ref);
      if ((i + 1) % 500 === 0 || i === docsToDelete.length - 1) {
        await batch.commit();
        deletedCount += (i + 1) % 500 || docsToDelete.length % 500;
      }
    }

    res.json({
      success: true,
      data: { deletedCount: docsToDelete.length },
      message: `${docsToDelete.length} memories deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete memories",
    });
  }
});

// Helper functions
function formatMemory(doc) {
  const data = doc.data ? doc.data() : doc;
  const created_at =
    data.created_at instanceof admin.firestore.Timestamp
      ? data.created_at.toDate().toISOString()
      : data.created_at;
  const updated_at =
    data.updated_at instanceof admin.firestore.Timestamp
      ? data.updated_at.toDate().toISOString()
      : data.updated_at;

  return {
    id: doc.id || doc.id,
    type: data.type,
    content: data.content,
    category: data.category,
    tags: data.tags || [],
    columns: data.columns || null,
    rows: data.rows || null,
    items: data.items || null,
    events: data.events || null,
    description: data.description,
    image_url: data.image_url,
    has_image: !!data.image_url,
    created_at,
    updated_at,
  };
}

async function updateCategoryCount(userId, category) {
  const docId = `${userId}_${category}`;
  const docRef = db.collection("categories").doc(docId);
  const doc = await docRef.get();

  if (doc.exists) {
    await docRef.update({
      count: admin.firestore.FieldValue.increment(1),
    });
  } else {
    await docRef.set({
      user_id: userId,
      name: category,
      count: 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function updateTagCount(userId, tag) {
  const docId = `${userId}_${tag}`;
  const docRef = db.collection("tags").doc(docId);
  const doc = await docRef.get();

  if (doc.exists) {
    await docRef.update({
      count: admin.firestore.FieldValue.increment(1),
    });
  } else {
    await docRef.set({
      user_id: userId,
      name: tag,
      count: 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export default router;
