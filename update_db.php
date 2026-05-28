<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=aziel_pro_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE IF NOT EXISTS briefs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client VARCHAR(255),
        project VARCHAR(255),
        objective TEXT,
        target VARCHAR(255),
        style VARCHAR(255),
        colors VARCHAR(255),
        deliverables TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    echo 'Table briefs created.';
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
