import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { authenticateToken } from "../middleware/auth.js";
import pool from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.use(authenticateToken);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "img_" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
        )
      );
    }
  },
});

// Upload image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const userId = req.user.userId;
    const { description = "", tags = "[]" } = req.body;

    let tagsArray = [];
    try {
      tagsArray = JSON.parse(tags);
    } catch (e) {
      tagsArray =
        typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : [];
    }

    const [result] = await pool.execute(
      `INSERT INTO images (user_id, filename, original_name, file_path, description, tags) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        description,
        JSON.stringify(tagsArray),
      ]
    );

    // Update tags
    for (const tag of tagsArray) {
      await updateTagCount(userId, tag);
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        image_url: `http://localhost:3000/uploads/${req.file.filename}`,
        filename: req.file.filename,
        original_name: req.file.originalname,
        description: description,
        tags: tagsArray,
      },
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Upload image error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: "Failed to upload image",
    });
  }
});

// Get all images
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tags, date } = req.query;

    let query = "SELECT * FROM images WHERE user_id = ?";
    const params = [userId];

    if (date) {
      query += " AND DATE(created_at) LIKE ?";
      params.push(`${date}%`);
    }

    query += " ORDER BY created_at DESC";

    const [images] = await pool.execute(query, params);

    const formattedImages = images.map((img) => ({
      id: img.id,
      filename: img.filename,
      original_name: img.original_name,
      image_url: `http://localhost:3000/uploads/${img.filename}`,
      description: img.description,
      tags: img.tags ? JSON.parse(img.tags) : [],
      memory_id: img.memory_id,
      created_at: img.created_at,
      updated_at: img.updated_at,
    }));

    // Filter by tags if provided
    let filteredImages = formattedImages;
    if (tags) {
      const tagArray = tags.split(",");
      filteredImages = formattedImages.filter((img) =>
        tagArray.some((tag) => img.tags.includes(tag.trim()))
      );
    }

    res.json({
      success: true,
      data: { images: filteredImages },
      message: "Images retrieved successfully",
    });
  } catch (error) {
    console.error("Get images error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve images",
    });
  }
});

// Get single image
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageId = req.params.id;

    const [images] = await pool.execute(
      "SELECT * FROM images WHERE id = ? AND user_id = ?",
      [imageId, userId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Image not found",
      });
    }

    const image = images[0];
    res.json({
      success: true,
      data: {
        image: {
          id: image.id,
          filename: image.filename,
          original_name: image.original_name,
          image_url: `/api/uploads/${image.filename}`,
          description: image.description,
          tags: image.tags ? JSON.parse(image.tags) : [],
          memory_id: image.memory_id,
          created_at: image.created_at,
          updated_at: image.updated_at,
        },
      },
      message: "Image retrieved successfully",
    });
  } catch (error) {
    console.error("Get image error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve image",
    });
  }
});

// Update image
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageId = req.params.id;
    const { description, tags } = req.body;

    const [images] = await pool.execute(
      "SELECT * FROM images WHERE id = ? AND user_id = ?",
      [imageId, userId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Image not found",
      });
    }

    const image = images[0];

    // Update image record
    await pool.execute(
      "UPDATE images SET description = ?, tags = ? WHERE id = ? AND user_id = ?",
      [
        description !== undefined ? description : image.description,
        tags ? JSON.stringify(tags) : image.tags,
        imageId,
        userId,
      ]
    );

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await updateTagCount(userId, tag);
      }
    }

    res.json({
      success: true,
      data: {
        id: imageId,
        description:
          description !== undefined ? description : image.description,
        tags: tags || (image.tags ? JSON.parse(image.tags) : []),
      },
      message: "Image updated successfully",
    });
  } catch (error) {
    console.error("Update image error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update image",
    });
  }
});

// Delete image
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageId = req.params.id;

    const [images] = await pool.execute(
      "SELECT file_path FROM images WHERE id = ? AND user_id = ?",
      [imageId, userId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Image not found",
      });
    }

    const filePath = images[0].file_path;

    await pool.execute("DELETE FROM images WHERE id = ? AND user_id = ?", [
      imageId,
      userId,
    ]);

    // Delete file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete image",
    });
  }
});

async function updateTagCount(userId, tag) {
  await pool.execute(
    `INSERT INTO tags (user_id, name, count) 
     VALUES (?, ?, 1) 
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [userId, tag]
  );
}

export default router;
