<?php
require_once __DIR__ . '/../api/utils/TenantContext.php';

if (!class_exists('TenantContext')) {
    fwrite(STDERR, "TenantContext class is missing\n");
    exit(1);
}

$context = new TenantContext();
if (method_exists($context, 'getSchoolId')) {
    exit(0);
}

fwrite(STDERR, "TenantContext should expose getSchoolId()\n");
exit(1);
