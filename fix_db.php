<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=aziel_pro_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'pending'");
    echo 'Fixed';
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
