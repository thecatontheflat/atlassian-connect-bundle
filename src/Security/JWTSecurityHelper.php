<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use AtlassianConnectBundle\Service\QSHGenerator;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\Request;

final class JWTSecurityHelper implements JWTSecurityHelperInterface
{
    private TenantRepositoryInterface $repository;

    private ?int $devTenant;

    private string $environment;

    public function __construct(TenantRepositoryInterface $repository, ?int $devTenant, string $environment)
    {
        $this->repository = $repository;
        $this->devTenant = $devTenant;
        $this->environment = $environment;
    }

    public function supportsRequest(Request $request): bool
    {
        return $request->query->has('jwt') ||
            $request->headers->has('authorization') ||
            ($this->devTenant && 'dev' === $this->environment);
    }

    public function getJWTToken(Request $request): ?string
    {
        if ($request->query->has('jwt')) {
            return (string) $request->query->get('jwt');
        }

        $headerJWT = $this->findJWTInHeader($request);

        if ($headerJWT) {
            return $headerJWT;
        }

        return $this->findTenantJWT($request);
    }

    private function findJWTInHeader(Request $request): ?string
    {
        if ($request->headers->has('authorization')) {
            $authorizationHeaderArray = explode(' ', $request->headers->get('authorization'));

            if (\count($authorizationHeaderArray) > 1) {
                return $authorizationHeaderArray[1];
            }
        }

        return null;
    }

    private function findTenantJWT(Request $request): ?string
    {
        if (!$this->devTenant || 'dev' !== $this->environment) {
            return null;
        }

        $tenant = $this->repository->findById($this->devTenant);

        if (!$tenant) {
            throw new \RuntimeException(sprintf('Cant find tenant with id %s - please set atlassian_connect.dev_tenant to false to disable dedicated dev tenant OR add valid id', $this->devTenant));
        }

        return JWT::encode([
            'iss' => $tenant->getClientKey(),
            'iat' => time(),
            'exp' => strtotime('+1 day'),
            'qsh' => QSHGenerator::generate($request->getRequestUri(), 'GET'),
            'sub' => 'admin',
        ], $tenant->getSharedSecret());
    }
}
