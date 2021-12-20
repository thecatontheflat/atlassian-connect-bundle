<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Service\QSHGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\Request;

final class JWTSecurityHelper implements JWTSecurityHelperInterface
{
    private EntityManagerInterface $entityManager;

    private ?int $devTenant;

    private string $environment;

    private string $tenantEntityClass;

    public function __construct(
        EntityManagerInterface $entityManager,
        ?int $devTenant,
        string $environment,
        string $tenantEntityClass
    ) {
        $this->entityManager = $entityManager;
        $this->devTenant = $devTenant;
        $this->environment = $environment;
        $this->tenantEntityClass = $tenantEntityClass;
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

        $tenant = $this->entityManager
            ->getRepository($this->tenantEntityClass)
            ->find($this->devTenant);

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
