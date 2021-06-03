<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\Security\Core\Role\Role;

/**
 * Class StubbedTenant
 */
class StubbedTenant implements TenantInterface
{
    /**
     * @return array<string>|array<Role>
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    /**
     * @return string|null
     */
    public function getSharedSecret(): ?string
    {
    }

    /**
     * @return string|null
     */
    public function getOauthClientId(): ?string
    {
    }

    /**
     * @return string|null
     */
    public function getBaseUrl(): ?string
    {
    }

    /**
     * @return string|null
     */
    public function getAddonKey(): ?string
    {
    }

    /**
     * @param string $name
     *
     * @return TenantInterface
     */
    public function setUsername(string $name): TenantInterface
    {
    }

    /**
     * @param string $addonKey
     *
     * @return TenantInterface
     */
    public function setAddonKey(string $addonKey): TenantInterface
    {
    }

    /**
     * @param string $clientKey
     *
     * @return TenantInterface
     */
    public function setClientKey(string $clientKey): TenantInterface
    {
    }

    /**
     * @param string $publicKey
     *
     * @return TenantInterface
     */
    public function setPublicKey(string $publicKey): TenantInterface
    {
    }

    /**
     * @param string $sharedSecret
     *
     * @return TenantInterface
     */
    public function setSharedSecret(string $sharedSecret): TenantInterface
    {
    }

    /**
     * @param string $serverVersion
     *
     * @return TenantInterface
     */
    public function setServerVersion(string $serverVersion): TenantInterface
    {
    }

    /**
     * @param string $pluginsVersion
     *
     * @return TenantInterface
     */
    public function setPluginsVersion(string $pluginsVersion): TenantInterface
    {
    }

    /**
     * @param string $baseUrl
     *
     * @return TenantInterface
     */
    public function setBaseUrl(string $baseUrl): TenantInterface
    {
    }

    /**
     * @param string $productType
     *
     * @return TenantInterface
     */
    public function setProductType(string $productType): TenantInterface
    {
    }

    /**
     * @param string $description
     *
     * @return TenantInterface
     */
    public function setDescription(string $description): TenantInterface
    {
    }

    /**
     * @param string $eventType
     *
     * @return TenantInterface
     */
    public function setEventType(string $eventType): TenantInterface
    {
    }

    /**
     * @param string|null $oauthClientId
     *
     * @return TenantInterface
     */
    public function setOauthClientId(?string $oauthClientId): TenantInterface
    {
    }

    /**
     * @return string|void
     */
    public function getPassword(): ?string
    {
    }

    /**
     * @return string|null
     */
    public function getSalt(): ?string
    {
    }

    /**
     * @return string|null
     */
    public function getUsername(): ?string
    {
    }

    /**
     * @return void
     */
    public function eraseCredentials(): void
    {
    }

    /**
     * @return string|null
     */
    public function getClientKey(): ?string
    {
    }
}
