<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

use AtlassianConnectBundle\Service\QSHGenerator;
use Firebase\JWT\JWT;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

abstract class AbstractWebTestCase extends WebTestCase
{
    protected static function getKernelClass(): string
    {
        return App\Kernel::class;
    }

    public function getTenantJWTCode(string $iss = 'client_key'): string
    {
        return JWT::encode([
            'iss' => $iss,
            'iat' => time(),
            'exp' => strtotime('+1 day'),
            'qsh' => QSHGenerator::generate('/protected_route', 'GET'),
            'sub' => 'admin',
        ], 'shared_secret', 'HS256');
    }
}
