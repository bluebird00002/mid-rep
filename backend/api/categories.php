<?php
require_once 'config.php';

$conn = getDBConnection();

$result = $conn->query("SELECT name, count FROM categories ORDER BY count DESC");
$categories = [];

while ($row = $result->fetch_assoc()) {
    $categories[] = [
        'name' => $row['name'],
        'count' => intval($row['count'])
    ];
}

sendResponse(true, ['categories' => $categories], 'Categories retrieved successfully');

$conn->close();
?>

