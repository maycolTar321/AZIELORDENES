<?php
function test_api($action, $data = null) {
    $url = "http://localhost/aziel_ordenes/api.php?action=" . $action;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($data) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }
    $resp = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "[$action] -> HTTP $status | $resp\n";
}

echo "Testing End-to-End System...\n";
test_api("add_client", ["name" => "Super Corp", "phone" => "999999", "notes" => "E2E Test"]);
test_api("add_inventory", ["item_name" => "Papel A4", "category" => "Gral", "stock_current" => 500, "stock_min" => 100, "price" => 15]);
test_api("save_brief", ["client" => "Super Corp", "project" => "Branding", "objective" => "Rebrand", "deliverables" => "Logo"]);
test_api("save_order", ["client" => "Super Corp", "phone" => "999999", "module" => "dg", "project" => "Branding", "deadline" => "2026-12-31", "cart" => [["id" => 1, "item_name" => "Papel A4", "qty" => 2, "price" => 15, "total" => 30]], "total" => 30, "advance" => 15]);
test_api("get_data");
?>
