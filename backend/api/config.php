<?php
// MiD Backend Configuration

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'mid_diary');

// API Configuration
define('API_VERSION', '1.0');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB

// Encryption Key (Change this in production!)
define('ENCRYPTION_KEY', 'your-secret-encryption-key-change-this');

// Allowed Image Types
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Database Connection
function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die(json_encode([
            'success' => false,
            'error' => 'Database connection failed: ' . $conn->connect_error
        ]));
    }
    
    $conn->set_charset('utf8mb4');
    return $conn;
}

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Helper function to send JSON response
function sendResponse($success, $data = null, $message = '', $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit();
}

// Helper function to send error response
function sendError($message, $code = 400) {
    sendResponse(false, null, $message, $code);
}

// Simple encryption (for production, use proper encryption library)
function encryptData($data) {
    return base64_encode(openssl_encrypt($data, 'AES-256-CBC', ENCRYPTION_KEY, 0, substr(hash('sha256', ENCRYPTION_KEY), 0, 16)));
}

function decryptData($data) {
    return openssl_decrypt(base64_decode($data), 'AES-256-CBC', ENCRYPTION_KEY, 0, substr(hash('sha256', ENCRYPTION_KEY), 0, 16));
}

?>

