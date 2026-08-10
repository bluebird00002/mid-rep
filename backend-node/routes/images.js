import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
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

// Cloudinary is used in production; local disk remains a development fallback.
const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "img_" + uniqueSuffix + path.extname(file.originalname));
    },
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const upload = multer({
  storage: cloudinaryEnabled ? multer.memoryStorage() : diskStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (allowedImageTypes.has(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."));
  },
});

function uploadBufferToCloudinary(buffer, folder, authenticated = true) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        type: authenticated ? "authenticated" : "upload",
        public_id: `img_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

function imageDeliveryUrl(data) {
  if (cloudinaryEnabled && data.filename && data.delivery_type === "authenticated") {
    const extension = data.format || path.extname(data.original_name || "").slice(1) || "jpg";
    return cloudinary.utils.private_download_url(data.filename, extension, {
      resource_type: "image",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
      attachment: false,
    });
  }
  if (data.file_path && /^https?:\/\//i.test(data.file_path)) return data.file_path;
  if (data.filename) return `/uploads/${encodeURIComponent(data.filename)}`;
  return null;
}

function hasValidImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/gif") return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

// Upload image
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }]),
  async (req, res) => {
    let uploadedFile = null;
    try {
      if (!req.files || !req.files.file || !req.files.file[0]) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      const file = req.files.file[0];
      uploadedFile = file;
      const userId = req.user.userId;
      const { description = "", tags = "[]", folder } = req.body;
      const bytes = file.buffer || fs.readFileSync(file.path);
      if (!hasValidImageSignature(bytes, file.mimetype)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: "File content is not a valid supported image" });
      }

      if (cloudinaryEnabled) {
        const targetFolder = folder === "mid-profile-pics"
          ? "mid-profile-pics"
          : process.env.CLOUDINARY_FOLDER || "mid-uploads";
        const isProfileImage = folder === "mid-profile-pics";
        const result = await uploadBufferToCloudinary(bytes, targetFolder, !isProfileImage);
        file.location = result.secure_url;
        file.path = result.secure_url;
        file.filename = result.public_id;
        file.public_id = result.public_id;
        file.format = result.format;
        file.delivery_type = result.type;
      }

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
        format: file.format || path.extname(file.originalname).slice(1).toLowerCase() || null,
        delivery_type: file.delivery_type || (cloudinaryEnabled ? "authenticated" : "local"),
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
          image_url: imageDeliveryUrl(docData),
          filename: docData.filename,
          original_name: docData.original_name,
          description: docData.description,
          tags: tagsArray,
        },
        message: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload image error:", error);
      if (uploadedFile) {
        // If file is on disk, remove it. Cloudinary uploads are remote URLs, so skip.
        const localPath = uploadedFile.path;
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
      image_url: imageDeliveryUrl(img),
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
    if ((image.userId || image.user_id) !== userId) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }
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
          image_url: imageDeliveryUrl(image),
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
    if ((image.userId || image.user_id) !== userId) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

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
    if ((data.userId || data.user_id) !== userId) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }
    const filePath = data.file_path;
    const publicId = data.filename;

    await docRef.delete();

    // Delete file from Cloudinary if configured, otherwise delete local file
    if (process.env.CLOUDINARY_CLOUD_NAME && publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
          type: data.delivery_type === "authenticated" ? "authenticated" : "upload",
        });
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
        user_id: userId,
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
