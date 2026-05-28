<?php
// api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$db   = 'aziel_pro_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(["error" => "No DB Connection. Please run setup_db.php first."]);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'save_order') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Save Order
    $stmt = $pdo->prepare("INSERT INTO orders (module, client, phone, project, status, subtotal, discount, total, advance, balance, notes, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['module'] ?? '', 
        $data['client'] ?? '', 
        $data['phone'] ?? '', 
        $data['project'] ?? '', 
        $data['status'] ?? 'Pendiente',
        $data['subtotal'] ?? 0, 
        $data['discount'] ?? 0, 
        $data['total'] ?? 0, 
        $data['advance'] ?? 0, 
        $data['balance'] ?? 0,
        $data['notes'] ?? '', 
        json_encode($data['cart'] ?? [])
    ]);
    $order_id = $pdo->lastInsertId();

    // Update or Insert Client
    $stmt = $pdo->prepare("SELECT id, total_spent FROM clients WHERE name = ?");
    $stmt->execute([$data['client']]);
    $client = $stmt->fetch();

    if ($client) {
        $new_total = $client['total_spent'] + $data['total'];
        $stmt = $pdo->prepare("UPDATE clients SET phone = ?, last_project = ?, total_spent = ? WHERE id = ?");
        $stmt->execute([$data['phone'], $data['project'], $new_total, $client['id']]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO clients (name, phone, last_project, total_spent) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['client'], $data['phone'], $data['project'], $data['total']]);
    }

    echo json_encode(["success" => true, "order_id" => $order_id]);
    exit;
}

if ($action === 'get_data') {
    $orders = $pdo->query("SELECT * FROM orders ORDER BY id DESC")->fetchAll();
    // decode items JSON
    foreach($orders as &$o) {
        $o['items'] = json_decode($o['items_json'], true);
        unset($o['items_json']);
    }
    
    $clients = $pdo->query("SELECT * FROM clients ORDER BY total_spent DESC")->fetchAll();
    
    $inventory = $pdo->query("SELECT * FROM inventory ORDER BY category")->fetchAll();
    $tasks = $pdo->query("SELECT * FROM tasks ORDER BY status, id DESC")->fetchAll();
    $users = $pdo->query("SELECT id, email, role, status FROM users ORDER BY id DESC")->fetchAll();
    $briefs = $pdo->query("SELECT * FROM briefs ORDER BY id DESC")->fetchAll();
    
    echo json_encode(["orders" => $orders, "clients" => $clients, "inventory" => $inventory, "tasks" => $tasks, "users" => $users, "briefs" => $briefs]);
    exit;
}

if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("SELECT id, email, password, role, status FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password'])) {
        if ($user['status'] !== 'approved') {
            echo json_encode(["error" => "Tu cuenta está pendiente de aprobación por el Administrador (avilamichael0@gmail.com)."]);
            exit;
        }
        echo json_encode(["success" => true, "user" => ["email" => $user['email'], "role" => $user['role']]]);
    } else {
        echo json_encode(["error" => "Credenciales incorrectas"]);
    }
    exit;
}

if ($action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $pass = $data['password'] ?? '';
    
    if (strlen($email) < 5 || strlen($pass) < 4) {
        echo json_encode(["error" => "Datos inválidos"]);
        exit;
    }
    
    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(["error" => "El correo ya está registrado"]);
        exit;
    }
    
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $status = ($email === 'avilamichael0@gmail.com') ? 'approved' : 'pending';
    $role = ($email === 'avilamichael0@gmail.com') ? 'superadmin' : 'empleado';
    
    $stmt = $pdo->prepare("INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)");
    if ($stmt->execute([$email, $hash, $role, $status])) {
        echo json_encode(["success" => true, "status" => $status]);
    } else {
        echo json_encode(["error" => "Error al registrar la cuenta"]);
    }
    exit;
}

if ($action === 'approve_user') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE users SET status = 'approved' WHERE id = ?");
    if($stmt->execute([$data['id']])) {
        echo json_encode(["success" => true]);
    }
    exit;
}

if ($action === 'add_inventory') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO inventory (item_name, category, stock_current, stock_min) VALUES (?, ?, ?, ?)");
    if($stmt->execute([$data['item_name'], $data['category'], $data['stock_current'], $data['stock_min']])) {
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
    } else {
        echo json_encode(["error" => "Error adding inventory"]);
    }
    exit;
}

if ($action === 'add_client') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO clients (name, phone, last_project, total_spent) VALUES (?, ?, ?, 0)");
    if($stmt->execute([$data['name'], $data['phone'], $data['notes']])) {
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
    } else {
        echo json_encode(["error" => "Error adding client"]);
    }
    exit;
}
if ($action === 'delete_user') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    if($stmt->execute([$data['id']])) {
        echo json_encode(["success" => true]);
    }
    exit;
}

if ($action === 'change_role') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
    if($stmt->execute([$data['role'], $data['id']])) {
        echo json_encode(["success" => true]);
    }
    exit;
}

if ($action === 'add_user_admin') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $pass = $data['password'] ?? '';
    $role = $data['role'] ?? 'empleado';
    
    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(["error" => "El correo ya está registrado"]);
        exit;
    }
    
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, 'approved')");
    if ($stmt->execute([$email, $hash, $role])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al registrar la cuenta"]);
    }
    exit;
}
if ($action === 'save_settings') {
    $data = json_decode(file_get_contents('php://input'), true);
    file_put_contents('config.json', json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(["success" => true]);
    exit;
}

if ($action === 'save_brief') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO briefs (client, project, objective, deliverables) VALUES (?, ?, ?, ?)");
    if($stmt->execute([$data['client'], $data['project'], $data['objective'], $data['deliverables']])) {
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
    } else {
        echo json_encode(["error" => "Error adding brief"]);
    }
    exit;
}

if ($action === 'get_settings') {
    if (file_exists('config.json')) {
        echo file_get_contents('config.json');
    } else {
        echo json_encode(["facebook" => "#", "whatsapp" => "#", "instagram" => "#"]);
    }
    exit;
}

// ======================= CRUD ENDPOINTS =======================

if ($action === 'delete_client') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
    if($stmt->execute([$data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al eliminar"]);
    }
    exit;
}

if ($action === 'edit_client') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE clients SET name = ?, phone = ? WHERE id = ?");
    if($stmt->execute([$data['name'], $data['phone'], $data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al editar"]);
    }
    exit;
}

if ($action === 'delete_inventory') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("DELETE FROM inventory WHERE id = ?");
    if($stmt->execute([$data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al eliminar"]);
    }
    exit;
}

if ($action === 'edit_inventory') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE inventory SET item_name = ?, stock_current = ?, price = ? WHERE id = ?");
    if($stmt->execute([$data['item_name'], $data['stock_current'], $data['price'], $data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al editar"]);
    }
    exit;
}

if ($action === 'delete_order') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
    if($stmt->execute([$data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al eliminar"]);
    }
    exit;
}

if ($action === 'update_order_status') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
    if($stmt->execute([$data['status'], $data['id']])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Error al actualizar estado"]);
    }
    exit;
}

?>
