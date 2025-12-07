// API Service for MiD Backend Communication
// Node.js/Express backend

// Detect backend URL dynamically based on current location
function getAPIBaseURL() {
  // Use environment variable if set (for production)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // Fallback for local development
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || 3000;

  // If we're on localhost or 127.0.0.1, use localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://localhost:${port}/api`;
  }

  // If we're on any other IP (including mobile network), use that IP with the port
  return `http://${host}:${port}/api`;
}

const API_BASE_URL = getAPIBaseURL();

class MiDApi {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authorization token if available
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Check if response has content
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            throw new Error("Invalid JSON response from server");
          }
        } else {
          data = {};
        }
      } else {
        // Not JSON response
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || `Server error: ${response.status}`);
        }
        return { success: true, data: text };
      }

      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      // Ensure consistent response structure
      if (data.success === undefined && data.data) {
        return { success: true, ...data };
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      // Check if it's a network error
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        throw new Error(
          "Cannot connect to server. Please ensure the backend is running on http://localhost:3000"
        );
      }
      throw error;
    }
  }

  // Authentication methods
  async login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username, password, securityAnswers, profileImageUrl = null) {
    const body = {
      username,
      password,
    };

    // Add profile image if provided
    if (profileImageUrl) {
      body.profile_image_url = profileImageUrl;
    }

    // Add security answers if provided
    if (securityAnswers) {
      body.securityAnswers = {
        answer1: securityAnswers.answer1,
        answer2: securityAnswers.answer2,
        answer3: securityAnswers.answer3,
      };
    }

    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async verifyToken() {
    return this.request("/auth/verify");
  }

  async isNewUser() {
    return this.request("/auth/is-new-user");
  }

  // Memory Operations
  async createMemory(memoryData) {
    return this.request("/memories", {
      method: "POST",
      body: JSON.stringify(memoryData),
    });
  }

  async getMemory(id) {
    return this.request(`/memories/${id}`);
  }

  async getAllMemories(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/memories?${queryParams}`);
  }

  async updateMemory(id, updates) {
    return this.request(`/memories/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteMemory(id) {
    return this.request(`/memories/${id}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteMemories(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/memories?${queryParams}`, {
      method: "DELETE",
    });
  }

  // Search Operations
  async searchMemories(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters }).toString();
    return this.request(`/search?${params}`);
  }

  // Image Operations
  async uploadImage(imageFile, description, tags = [], album = null) {
    const formData = new FormData();
    formData.append("file", imageFile);
    if (description) formData.append("description", description);
    formData.append("tags", JSON.stringify(tags));
    if (album) formData.append("album", album);

    const headers = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/images`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      // Try to read JSON error safely
      let error = { error: "Image upload failed" };
      try {
        error = await response.json();
      } catch (e) {
        // ignore
      }
      throw new Error(error.error || "Image upload failed");
    }

    return response.json();
  }

  async getImage(id) {
    return this.request(`/images/${id}`);
  }

  async getAllImages(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/images?${queryParams}`);
  }

  async updateImage(id, updates) {
    return this.request(`/images/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteImage(id) {
    return this.request(`/images/${id}`, {
      method: "DELETE",
    });
  }

  // Statistics
  async getStats() {
    return this.request("/stats");
  }

  // Password Reset Operations
  async verifyUsername(username) {
    return this.request("/auth/verify-username", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  }

  async verifySecurityAnswers(username, answer1, answer2, answer3) {
    return this.request("/auth/verify-security-answers", {
      method: "POST",
      body: JSON.stringify({ username, answer1, answer2, answer3 }),
    });
  }

  async resetPassword(
    username,
    verificationToken,
    newPassword,
    confirmPassword
  ) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        username,
        verificationToken,
        newPassword,
        confirmPassword,
      }),
    });
  }

  // Tags
  async getTags() {
    return this.request("/tags");
  }

  // Categories
  async getCategories() {
    return this.request("/categories");
  }

  // Profile Image Operations
  async getProfile() {
    return this.request("/auth/profile");
  }

  async uploadProfileImageToCloudinary(file) {
    // This uses the existing images endpoint to upload to Cloudinary
    // We'll pass a special folder param to store in profile-pics
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "mid-profile-pics");

    const headers = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/images`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      let error = { error: "Profile image upload failed" };
      try {
        error = await response.json();
      } catch (e) {
        // ignore
      }
      throw new Error(error.error || "Profile image upload failed");
    }

    return response.json();
  }

  async updateProfileImage(profileImageUrl) {
    return this.request("/auth/profile-image", {
      method: "PUT",
      body: JSON.stringify({ profile_image_url: profileImageUrl }),
    });
  }
}

export default new MiDApi();
