<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

// Create uploads directory if it doesn't exist
if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    case 'DELETE':
        handleDelete($conn);
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGet($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if ($id) {
        // Get single image
        $stmt = $conn->prepare("SELECT * FROM images WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $image = formatImage($row);
            sendResponse(true, ['image' => $image], 'Image retrieved successfully');
        } else {
            sendError('Image not found', 404);
        }
    } else {
        // Get all images with filters
        $filters = buildFilters();
        $query = "SELECT * FROM images WHERE 1=1 " . $filters['where'];
        $query .= " ORDER BY created_at DESC";
        
        $result = $conn->query($query);
        $images = [];
        
        while ($row = $result->fetch_assoc()) {
            $images[] = formatImage($row);
        }
        
        sendResponse(true, ['images' => $images], 'Images retrieved successfully');
    }
}

function handlePost($conn) {
    if (!isset($_FILES['image'])) {
        sendError('No image file provided');
    }
    
    $file = $_FILES['image'];
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendError('File upload error: ' . $file['error']);
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        sendError('File size exceeds maximum allowed size');
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
        sendError('Invalid image type. Allowed: JPEG, PNG, GIF, WebP');
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('img_', true) . '.' . $extension;
    $filePath = UPLOAD_DIR . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        sendError('Failed to save uploaded file');
    }
    
    // Get description and tags
    $description = $_POST['description'] ?? null;
    $tags = isset($_POST['tags']) ? json_decode($_POST['tags'], true) : [];
    
    // Encrypt description
    $encrypted_data = encryptData(json_encode([
        'description' => $description
    ]));
    
    // Save to database
    $stmt = $conn->prepare("INSERT INTO images (filename, original_name, file_path, description, tags, encrypted_data) VALUES (?, ?, ?, ?, ?, ?)");
    $tagsJson = json_encode($tags);
    $stmt->bind_param("ssssss", $filename, $file['name'], $filePath, $description, $tagsJson, $encrypted_data);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        
        // Update tags
        foreach ($tags as $tag) {
            updateTagCount($conn, $tag);
        }
        
        // Return image URL (relative to API)
        $imageUrl = '/MiD/api/uploads/' . $filename;
        
        sendResponse(true, [
            'id' => $id,
            'image_url' => $imageUrl,
            'filename' => $filename
        ], 'Image uploaded successfully', 201);
    } else {
        // Delete file if database insert failed
        unlink($filePath);
        sendError('Failed to save image: ' . $stmt->error);
    }
}

function handleDelete($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$id) {
        sendError('Image ID required');
    }
    
    // Get file path before deleting
    $stmt = $conn->prepare("SELECT file_path FROM images WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $filePath = $row['file_path'];
        
        // Delete from database
        $stmt = $conn->prepare("DELETE FROM images WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            // Delete file
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            sendResponse(true, null, 'Image deleted successfully');
        } else {
            sendError('Failed to delete image: ' . $stmt->error);
        }
    } else {
        sendError('Image not found', 404);
    }
}

function formatImage($row) {
    return [
        'id' => intval($row['id']),
        'filename' => $row['filename'],
        'original_name' => $row['original_name'],
        'image_url' => '/MiD/api/uploads/' . $row['filename'],
        'description' => $row['description'],
        'tags' => $row['tags'] ? json_decode($row['tags'], true) : [],
        'memory_id' => $row['memory_id'] ? intval($row['memory_id']) : null,
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

function buildFilters() {
    global $conn;
    $where = "";
    
    if (isset($_GET['tags'])) {
        // Simplified tag filter
        $where .= " AND tags LIKE '%" . $conn->real_escape_string($_GET['tags']) . "%'";
    }
    
    if (isset($_GET['date'])) {
        $date = $_GET['date'];
        $where .= " AND DATE(created_at) LIKE '" . $conn->real_escape_string($date) . "%'";
    }
    
    return ['where' => $where];
}

function updateTagCount($conn, $tag) {
    $stmt = $conn->prepare("INSERT INTO tags (name, count) VALUES (?, 1) ON DUPLICATE KEY UPDATE count = count + 1");
    $stmt->bind_param("s", $tag);
    $stmt->execute();
}

$conn->close();
?>

