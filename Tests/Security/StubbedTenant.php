<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\Security\Core\Role\Role;

class StubbedTenant implements TenantInterface
{
    /**
     * @return array<string>|array<Role>
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    public function getSharedSecret(): ?string
    {
    }

    public function getOauthClientId(): ?string
    {
    }

    public function getBaseUrl(): ?string
    {
    }

    public function getAddonKey(): ?string
    {
    }

    public function setUsername(string $name): TenantInterface
    {
    }

    public function setAddonKey(string $addonKey): TenantInterface
    {
    }

    public function setClientKey(string $clientKey): TenantInterface
    {
    }

    public function setPublicKey(string $publicKey): TenantInterface
    {
    }

    public function setSharedSecret(string $sharedSecret): TenantInterface
    {
    }

    public function setServerVersion(string $serverVersion): TenantInterface
    {
    }

    public function setPluginsVersion(string $pluginsVersion): TenantInterface
    {
    }

    public function setBaseUrl(string $baseUrl): TenantInterface
    {
    }

    public function setProductType(string $productType): TenantInterface
    {
    }

    public function setDescription(string $description): TenantInterface
    {
    }

    public function setEventType(string $eventType): TenantInterface
    {
    }

    public function setOauthClientId(?string $oauthClientId): TenantInterface
    {
    }

    /**
     * @return string|void
     */
    public function getPassword(): ?string
    {
    }

    public function getSalt(): ?string
    {
    }

    public function getUsername(): ?string
    {
    }

    public function getUserIdentifier(): string
    {
        return 'tenant';
    }

    public function eraseCredentials(): void
    {
    }

    public function getClientKey(): ?string
    {
    }

    public function isWhiteListed(): bool
    {
    }
}
