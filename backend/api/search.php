<?php
require_once 'config.php';

$conn = getDBConnection();

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$category = isset($_GET['category']) ? $_GET['category'] : null;
$tags = isset($_GET['tags']) ? explode(',', $_GET['tags']) : [];

if (empty($query) && !$category && empty($tags)) {
    sendError('Search query, category, or tags required');
}

$sql = "SELECT * FROM memories WHERE 1=1";
$params = [];
$types = '';

if (!empty($query)) {
    $sql .= " AND (content LIKE ? OR description LIKE ?)";
    $searchTerm = '%' . $query . '%';
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= 'ss';
}

if ($category) {
    $sql .= " AND category = ?";
    $params[] = $category;
    $types .= 's';
}

if (!empty($tags)) {
    foreach ($tags as $tag) {
        $sql .= " AND JSON_CONTAINS(tags, ?)";
        $params[] = json_encode([trim($tag)]);
        $types .= 's';
    }
}

$sql .= " ORDER BY created_at DESC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$memories = [];
while ($row = $result->fetch_assoc()) {
    $memories[] = [
        'id' => intval($row['id']),
        'type' => $row['type'],
        'content' => $row['content'],
        'category' => $row['category'],
        'tags' => $row['tags'] ? json_decode($row['tags'], true) : [],
        'description' => $row['description'],
        'created_at' => $row['created_at']
    ];
}

sendResponse(true, ['memories' => $memories], 'Search completed successfully');

$conn->close();
?>

