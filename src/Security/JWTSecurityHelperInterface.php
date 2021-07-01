<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\HttpFoundation\Request;

/**
 * Class JWTHelperInterface
 */
interface JWTSecurityHelperInterface
{
    /**
     * Check if the current request supports authentication.
     *
     * @param Request $request
     *
     * @return bool
     */
    public function supportsRequest(Request $request): bool;

    /**
     * Fetches a JWT token from either the request or from a DEV Tenant.
     *
     * @param Request $request
     *
     * @return string|null
     */
    public function getJWTToken(Request $request): ?string;
}
