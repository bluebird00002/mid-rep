<?php
require_once 'config.php';

$conn = getDBConnection();

// Get total memories
$result = $conn->query("SELECT COUNT(*) as total FROM memories");
$totalMemories = $result->fetch_assoc()['total'];

// Get total images
$result = $conn->query("SELECT COUNT(*) as total FROM images");
$totalImages = $result->fetch_assoc()['total'];

// Get categories
$result = $conn->query("SELECT name, count FROM categories ORDER BY count DESC");
$categories = [];
while ($row = $result->fetch_assoc()) {
    $categories[$row['name']] = intval($row['count']);
}

// Get tags
$result = $conn->query("SELECT name, count FROM tags ORDER BY count DESC LIMIT 20");
$tags = [];
while ($row = $result->fetch_assoc()) {
    $tags[$row['name']] = intval($row['count']);
}

sendResponse(true, [
    'total_memories' => intval($totalMemories),
    'total_images' => intval($totalImages),
    'categories' => $categories,
    'tags' => $tags
], 'Statistics retrieved successfully');

$conn->close();
?>

