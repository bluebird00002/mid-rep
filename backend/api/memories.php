<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    case 'PUT':
        handlePut($conn);
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
        // Get single memory
        $stmt = $conn->prepare("SELECT * FROM memories WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $memory = formatMemory($row);
            sendResponse(true, ['memory' => $memory], 'Memory retrieved successfully');
        } else {
            sendError('Memory not found', 404);
        }
    } else {
        // Get all memories with filters
        $filters = buildFilters();
        $query = "SELECT * FROM memories WHERE 1=1 " . $filters['where'];
        $query .= " ORDER BY created_at DESC";
        
        if (isset($_GET['limit'])) {
            $limit = intval($_GET['limit']);
            $query .= " LIMIT " . $limit;
        }
        
        $result = $conn->query($query);
        $memories = [];
        
        while ($row = $result->fetch_assoc()) {
            $memories[] = formatMemory($row);
        }
        
        sendResponse(true, ['memories' => $memories], 'Memories retrieved successfully');
    }
}

function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        sendError('Invalid JSON data');
    }
    
    $type = $data['type'] ?? 'text';
    $content = $data['content'] ?? null;
    $category = $data['category'] ?? null;
    $tags = isset($data['tags']) ? json_encode($data['tags']) : null;
    $columns = isset($data['columns']) ? json_encode($data['columns']) : null;
    $rows = isset($data['rows']) ? json_encode($data['rows']) : null;
    $items = isset($data['items']) ? json_encode($data['items']) : null;
    $events = isset($data['events']) ? json_encode($data['events']) : null;
    $description = $data['description'] ?? null;
    $image_url = $data['image_url'] ?? null;
    
    // Encrypt sensitive data
    $encrypted_data = encryptData(json_encode([
        'content' => $content,
        'description' => $description
    ]));
    
    $stmt = $conn->prepare("INSERT INTO memories (type, content, category, tags, columns, rows, items, events, description, image_url, encrypted_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssssss", $type, $content, $category, $tags, $columns, $rows, $items, $events, $description, $image_url, $encrypted_data);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        
        // Update tags and categories counts
        if ($category) {
            updateCategoryCount($conn, $category);
        }
        if ($tags) {
            $tagArray = json_decode($tags, true);
            foreach ($tagArray as $tag) {
                updateTagCount($conn, $tag);
            }
        }
        
        sendResponse(true, ['id' => $id], 'Memory created successfully', 201);
    } else {
        sendError('Failed to create memory: ' . $stmt->error);
    }
}

function handlePut($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$id) {
        sendError('Memory ID required');
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        sendError('Invalid JSON data');
    }
    
    $updates = [];
    $params = [];
    $types = '';
    
    if (isset($data['content'])) {
        $updates[] = "content = ?";
        $params[] = $data['content'];
        $types .= 's';
    }
    
    if (isset($data['category'])) {
        $updates[] = "category = ?";
        $params[] = $data['category'];
        $types .= 's';
    }
    
    if (isset($data['tags'])) {
        $updates[] = "tags = ?";
        $params[] = json_encode($data['tags']);
        $types .= 's';
    }
    
    if (isset($data['add'])) {
        // Append to existing content
        $stmt = $conn->prepare("SELECT content FROM memories WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $newContent = $row['content'] . "\n" . $data['add'];
            $updates[] = "content = ?";
            $params[] = $newContent;
            $types .= 's';
        }
    }
    
    if (empty($updates)) {
        sendError('No updates provided');
    }
    
    $params[] = $id;
    $types .= 'i';
    
    $query = "UPDATE memories SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        sendResponse(true, ['id' => $id], 'Memory updated successfully');
    } else {
        sendError('Failed to update memory: ' . $stmt->error);
    }
}

function handleDelete($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$id) {
        sendError('Memory ID required');
    }
    
    $stmt = $conn->prepare("DELETE FROM memories WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        sendResponse(true, null, 'Memory deleted successfully');
    } else {
        sendError('Failed to delete memory: ' . $stmt->error);
    }
}

function formatMemory($row) {
    return [
        'id' => intval($row['id']),
        'type' => $row['type'],
        'content' => $row['content'],
        'category' => $row['category'],
        'tags' => $row['tags'] ? json_decode($row['tags'], true) : [],
        'columns' => $row['columns'] ? json_decode($row['columns'], true) : null,
        'rows' => $row['rows'] ? json_decode($row['rows'], true) : null,
        'items' => $row['items'] ? json_decode($row['items'], true) : null,
        'events' => $row['events'] ? json_decode($row['events'], true) : null,
        'description' => $row['description'],
        'image_url' => $row['image_url'],
        'has_image' => !empty($row['image_url']),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

function buildFilters() {
    $where = "";
    $params = [];
    
    if (isset($_GET['category'])) {
        $where .= " AND category = ?";
        $params[] = $_GET['category'];
    }
    
    if (isset($_GET['type'])) {
        $where .= " AND type = ?";
        $params[] = $_GET['type'];
    }
    
    if (isset($_GET['tags'])) {
        $tags = explode(',', $_GET['tags']);
        $placeholders = implode(',', array_fill(0, count($tags), '?'));
        $where .= " AND JSON_CONTAINS(tags, ?)";
        // Simplified tag search
    }
    
    if (isset($_GET['date'])) {
        $date = $_GET['date'];
        $where .= " AND DATE(created_at) LIKE ?";
        $params[] = $date . '%';
    }
    
    return ['where' => $where, 'params' => $params];
}

function updateCategoryCount($conn, $category) {
    $stmt = $conn->prepare("INSERT INTO categories (name, count) VALUES (?, 1) ON DUPLICATE KEY UPDATE count = count + 1");
    $stmt->bind_param("s", $category);
    $stmt->execute();
}

function updateTagCount($conn, $tag) {
    $stmt = $conn->prepare("INSERT INTO tags (name, count) VALUES (?, 1) ON DUPLICATE KEY UPDATE count = count + 1");
    $stmt->bind_param("s", $tag);
    $stmt->execute();
}

$conn->close();
?>

