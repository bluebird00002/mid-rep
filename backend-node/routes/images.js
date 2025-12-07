import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { authenticateToken } from "../middleware/auth.js";
import { admin, db } from "../config/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.use(authenticateToken);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// If Cloudinary env vars are set, configure Cloudinary storage; otherwise fall back to disk storage
let upload;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Determine folder based on request
      const folder =
        req.body?.folder || process.env.CLOUDINARY_FOLDER || "mid-uploads";
      const ext = path.extname(file.originalname).replace(".", "");
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

      return {
        folder: folder,
        format: ext || "jpg",
        public_id: `img_${unique}`,
      };
    },
  });

  upload = multer({
    storage: cloudinaryStorage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
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
} else {
  // Disk storage fallback
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "img_" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  upload = multer({
    storage: storage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
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
}

// Upload image
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.file || !req.files.file[0]) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      const file = req.files.file[0];
      const userId = req.user.userId;
      const { description = "", tags = "[]", folder } = req.body;

      // If this is a profile image upload, just return the URL
      if (folder === "mid-profile-pics") {
        return res.status(201).json({
          success: true,
          data: {
            image_url: file.location || file.path,
            filename: file.filename || file.public_id,
          },
          message: "Profile image uploaded successfully",
        });
      }

      let tagsArray = [];
      try {
        tagsArray = JSON.parse(tags);
      } catch (e) {
        tagsArray =
          typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : [];
      }

      // Save metadata to Firestore
      const docData = {
        userId,
        filename: file.filename || file.public_id || null,
        original_name: file.originalname,
        file_path: file.path || file.location || null,
        description,
        tags: tagsArray,
        memory_id: null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("images").add(docData);

      // Update tags counts in Firestore
      for (const tag of tagsArray) {
        await updateTagCount(userId, tag);
      }

      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          image_url: docData.file_path,
          filename: docData.filename,
          original_name: docData.original_name,
          description: docData.description,
          tags: tagsArray,
        },
        message: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload image error:", error);
      if (file) {
        // If file is on disk, remove it. Cloudinary uploads are remote URLs, so skip.
        const localPath = file.path;
        try {
          if (localPath && fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (e) {
          console.warn("Failed to remove local temp file:", e);
        }
      }
      res.status(500).json({
        success: false,
        error: "Failed to upload image",
      });
    }
  }
);

// Get all images
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tags, date } = req.query;

    // Query Firestore for this user's images (no orderBy to avoid index requirement)
    const snapshot = await db
      .collection("images")
      .where("userId", "==", userId)
      .get();
    let images = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sort by created_at in memory (descending)
    images.sort((a, b) => {
      const aTime =
        a.created_at instanceof admin.firestore.Timestamp
          ? a.created_at.toMillis()
          : 0;
      const bTime =
        b.created_at instanceof admin.firestore.Timestamp
          ? b.created_at.toMillis()
          : 0;
      return bTime - aTime;
    });

    const formatTimestamp = (ts) => {
      if (!ts) return null;
      if (ts instanceof admin.firestore.Timestamp) {
        return ts.toDate().toISOString();
      }
      return typeof ts === "string" ? ts : null;
    };

    const formattedImages = images.map((img) => ({
      id: img.id,
      filename: img.filename,
      original_name: img.original_name,
      image_url: img.file_path || null,
      description: img.description,
      tags: img.tags || [],
      memory_id: img.memory_id || null,
      created_at: formatTimestamp(img.created_at),
      updated_at: formatTimestamp(img.updated_at),
    }));

    // Filter by tags if provided (accept comma-separated or repeated query params)
    let filteredImages = formattedImages;
    if (tags) {
      let tagArray = [];
      if (Array.isArray(tags)) {
        tagArray = tags
          .flatMap((t) => String(t).split(","))
          .map((t) => t.trim());
      } else {
        tagArray = String(tags)
          .split(",")
          .map((t) => t.trim());
      }
      tagArray = tagArray.filter(Boolean).map((t) => t.toLowerCase());
      if (tagArray.length) {
        filteredImages = formattedImages.filter((img) =>
          (img.tags || [])
            .map((t) => String(t).toLowerCase())
            .some((tag) => tagArray.includes(tag))
        );
      }
    }

    // Filter by category if provided.
    // Images may store a `category` field; if not, some images are linked to memories via `memory_id`.
    if (req.query.category) {
      const category = req.query.category;
      // If images have an explicit category field, use it; otherwise resolve via linked memories
      const anyHasCategory = filteredImages.some(
        (img) => img.category !== undefined && img.category !== null
      );
      const categoryLc = String(category).toLowerCase();
      if (anyHasCategory) {
        filteredImages = filteredImages.filter(
          (img) => String(img.category || "").toLowerCase() === categoryLc
        );
      } else {
        // Resolve memory ids that match the category for this user (case-insensitive)
        try {
          const memSnap = await db
            .collection("memories")
            .where("user_id", "==", userId)
            .get();
          const memIds = new Set(
            memSnap.docs
              .filter((d) => {
                const c = d.data().category;
                return c && String(c).toLowerCase() === categoryLc;
              })
              .map((d) => d.id)
          );
          filteredImages = filteredImages.filter(
            (img) => img.memory_id && memIds.has(img.memory_id)
          );
        } catch (err) {
          console.warn("Failed to resolve image categories via memories:", err);
          // fallback: filter none
          filteredImages = [];
        }
      }
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

    const doc = await db.collection("images").doc(imageId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    const image = { id: doc.id, ...doc.data() };
    const formatTimestamp = (ts) => {
      if (!ts) return null;
      if (ts instanceof admin.firestore.Timestamp) {
        return ts.toDate().toISOString();
      }
      return typeof ts === "string" ? ts : null;
    };
    res.json({
      success: true,
      data: {
        image: {
          id: image.id,
          filename: image.filename,
          original_name: image.original_name,
          image_url: image.file_path || null,
          description: image.description,
          tags: image.tags || [],
          memory_id: image.memory_id || null,
          created_at: formatTimestamp(image.created_at),
          updated_at: formatTimestamp(image.updated_at),
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

    const docRef = db.collection("images").doc(imageId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    const image = { id: doc.id, ...doc.data() };

    // Update image record in Firestore
    await docRef.update({
      description: description !== undefined ? description : image.description,
      tags: tags ? tags : image.tags,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

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
        tags: tags || image.tags || [],
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

    const docRef = db.collection("images").doc(imageId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    const data = doc.data();
    const filePath = data.file_path;
    const publicId = data.filename;

    await docRef.delete();

    // Delete file from Cloudinary if configured, otherwise delete local file
    if (process.env.CLOUDINARY_CLOUD_NAME && publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch (e) {
        console.warn("Failed to delete image from Cloudinary:", e);
      }
    } else if (filePath && fs.existsSync(filePath)) {
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
  // Use Firestore to increment tag counts per user
  try {
    const docId = `${userId}_${tag}`;
    const tagRef = db.collection("tags").doc(docId);
    await tagRef.set(
      {
        userId,
        name: tag,
        count: admin.firestore.FieldValue.increment(1),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Failed to update tag count in Firestore:", e);
  }
}

export default router;
