<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$apiUrl = "https://use.api.co.id/holidays/indonesia/?year=" . $year;

$apiKey = 'uRMv0VXbybij6FZRTA69GGxP4SyLO6DSi0yqezW6pLewqFfz9Z';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-co-id: ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['is_success' => false, 'message' => 'CURL error: ' . $error]);
    exit;
}

http_response_code($httpCode ?: 200);
echo $response;
