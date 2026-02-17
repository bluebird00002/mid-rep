// API Service for MiD Backend Communication
// Clean single-file implementation to avoid duplicate constructors

function getAPIBaseURL() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || 3000;
  if (host === "localhost" || host === "127.0.0.1")
    return `http://localhost:${port}/api`;
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

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const config = { ...options, headers };
    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } else {
        const text = await response.text();
        if (!response.ok)
          throw new Error(text || `Server error: ${response.status}`);
        return { success: true, data: text };
      }
      if (!response.ok) {
        const errMsg = data.error || data.message || `Request failed: ${response.status}`;
        const err = new Error(errMsg);
        err.status = response.status;
        throw err;
      }
      if (data.success === undefined && data.data)
        return { success: true, ...data };
      return data;
    } catch (error) {
      if (
        error.message &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError"))
      ) {
        throw new Error(
          "Cannot connect to server. Please ensure the backend is running on http://localhost:3000",
        );
      }
      // Ensure network errors keep original info
      if (error instanceof Error && !error.status) {
        // leave as-is
        throw error;
      }
      throw error;
    }
  }

  // Admin
  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, { method: "DELETE" });
  }
  async resetUserPassword(userId, newPassword) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  }
  async getAllUsers() {
    return this.request("/admin/users");
  }
  async getActivityLog() {
    return this.request("/admin/activity");
  }
  async changeAdminPassword(payload) {
    return this.request("/admin/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  async changeDefaultPassword(payload) {
    return this.request("/admin/passdef-change", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  async adminLogin(payload) {
    return this.request("/admin/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Auth
  async login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }
  async register(username, password, securityAnswers, profileImageUrl = null) {
    const body = { username, password };
    if (profileImageUrl) body.profile_image_url = profileImageUrl;
    if (securityAnswers)
      body.securityAnswers = {
        answer1: securityAnswers.answer1,
        answer2: securityAnswers.answer2,
        answer3: securityAnswers.answer3,
      };
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

  // Memories
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
    const q = new URLSearchParams(filters).toString();
    return this.request(`/memories?${q}`);
  }
  async updateMemory(id, updates) {
    return this.request(`/memories/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }
  async deleteMemory(id) {
    return this.request(`/memories/${id}`, { method: "DELETE" });
  }
  async bulkDeleteMemories(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/memories?${q}`, { method: "DELETE" });
  }

  // Search
  async searchMemories(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters }).toString();
    return this.request(`/search?${params}`);
  }

  // Images
  async uploadImage(imageFile, description, tags = [], album = null) {
    const formData = new FormData();
    formData.append("file", imageFile);
    if (description) formData.append("description", description);
    formData.append("tags", JSON.stringify(tags));
    if (album) formData.append("album", album);
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const response = await fetch(`${this.baseURL}/images`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) {
      let error = { error: "Image upload failed" };
      try {
        error = await response.json();
      } catch (e) {}
      throw new Error(error.error || "Image upload failed");
    }
    return response.json();
  }
  async getImage(id) {
    return this.request(`/images/${id}`);
  }
  async getAllImages(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/images?${q}`);
  }
  async updateImage(id, updates) {
    return this.request(`/images/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }
  async deleteImage(id) {
    return this.request(`/images/${id}`, { method: "DELETE" });
  }

  // Stats
  async getStats() {
    return this.request("/stats");
  }

  // Password reset
  async verifyUsername(username) {
    return this.request("/auth/verify-username", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  }
  async verifySecurityAnswers(username, a1, a2, a3) {
    return this.request("/auth/verify-security-answers", {
      method: "POST",
      body: JSON.stringify({ username, answer1: a1, answer2: a2, answer3: a3 }),
    });
  }
  async resetPassword(
    username,
    verificationToken,
    newPassword,
    confirmPassword,
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

  // Tags & categories
  async getTags() {
    return this.request("/tags");
  }
  async getCategories() {
    return this.request("/categories");
  }

  // Profile
  async getProfile() {
    return this.request("/auth/profile");
  }
  async uploadProfileImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "mid-profile-pics");
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const response = await fetch(`${this.baseURL}/images`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) {
      let error = { error: "Profile image upload failed" };
      try {
        error = await response.json();
      } catch (e) {}
      throw new Error(error.error || "Profile image upload failed");
    }
    return response.json();
  }
  async updateProfileImage(url) {
    return this.request("/auth/profile-image", {
      method: "PUT",
      body: JSON.stringify({ profile_image_url: url }),
    });
  }
}

export default new MiDApi();
