<?php
$html = file_get_contents('index.html');
$js = file_get_contents('app.js');
preg_match_all('/id="([^"]+)"/', $html, $m1);
preg_match_all("/getElementById\(['\"]([^'\"]+)['\"]\)/", $js, $m2);
$htmlIds = array_unique($m1[1]);
$jsIds = array_unique($m2[1]);
$missing = array_diff($jsIds, $htmlIds);
echo "Missing IDs in HTML that JS expects:\n";
print_r($missing);
?>
