<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\HttpFoundation\Request;

interface JWTSecurityHelperInterface
{
    public function supportsRequest(Request $request): bool;

    public function getJWTToken(Request $request): ?string;
}
