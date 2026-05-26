<?php
// setup_db.php
$host = 'localhost';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create DB
    $pdo->exec("CREATE DATABASE IF NOT EXISTS aziel_pro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE aziel_pro_db");

    // Create Orders Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(10),
        client VARCHAR(255),
        phone VARCHAR(50),
        project VARCHAR(255),
        status VARCHAR(50),
        subtotal DECIMAL(10,2),
        discount DECIMAL(10,2),
        total DECIMAL(10,2),
        advance DECIMAL(10,2),
        balance DECIMAL(10,2),
        notes TEXT,
        items_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Create Clients Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(50),
        last_project VARCHAR(255),
        total_spent DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Create Users Table for Web/Mobile Login
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50) DEFAULT 'empleado',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Inventory Table (Stock Control)
    $pdo->exec("CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255),
        category VARCHAR(100),
        stock_current INT DEFAULT 0,
        stock_min INT DEFAULT 5,
        price DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Tasks Table (Kanban/Pending)
    $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        module VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Insert Default Super Admin
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = 'avilamichael0@gmail.com'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $hash = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO users (email, password, role, status) VALUES ('avilamichael0@gmail.com', '$hash', 'superadmin', 'approved')");
    }

    // Seed basic inventory
    $pdo->exec("INSERT IGNORE INTO inventory (id, item_name, category, stock_current, stock_min) VALUES 
        (1, 'Pasta Térmica', 'it', 2, 5),
        (2, 'Cable UTP Cat6', 'it', 100, 50),
        (3, 'Conectores RJ45', 'it', 10, 50)
    ");

    echo "Base de datos nivel DIOS instalada con éxito. Ya puedes usar el sistema.";
} catch (PDOException $e) {
    die("Error en DB: " . $e->getMessage());
}
?>
