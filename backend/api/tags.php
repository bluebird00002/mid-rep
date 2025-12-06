<?php
require_once 'config.php';

$conn = getDBConnection();

$result = $conn->query("SELECT name, count FROM tags ORDER BY count DESC");
$tags = [];

while ($row = $result->fetch_assoc()) {
    $tags[] = [
        'name' => $row['name'],
        'count' => intval($row['count'])
    ];
}

sendResponse(true, ['tags' => $tags], 'Tags retrieved successfully');

$conn->close();
?>

