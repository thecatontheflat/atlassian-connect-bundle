<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Entity;

/**
 * Interface TenantInterface
 */
interface TenantInterface
{
    /**
     * @return string[]
     */
    public function getRoles(): array;

    /**
     * @return null|string
     */
    public function getSharedSecret(): ?string;

    /**
     * @return null|string
     */
    public function getBaseUrl(): ?string;

    /**
     * @return null|string
     */
    public function getAddonKey(): ?string;

    /**
     * @param string $name
     *
     * @return TenantInterface
     */
    public function setUsername(string $name): TenantInterface;

    /**
     * @param string $addonKey
     *
     * @return TenantInterface
     */
    public function setAddonKey(string $addonKey): TenantInterface;

    /**
     * @param string $clientKey
     *
     * @return TenantInterface
     */
    public function setClientKey(string $clientKey): TenantInterface;

    /**
     * @param string $publicKey
     *
     * @return TenantInterface
     */
    public function setPublicKey(string $publicKey): TenantInterface;

    /**
     * @param string $sharedSecret
     *
     * @return TenantInterface
     */
    public function setSharedSecret(string $sharedSecret): TenantInterface;

    /**
     * @param string $serverVersion
     *
     * @return TenantInterface
     */
    public function setServerVersion(string $serverVersion): TenantInterface;

    /**
     * @param string $pluginsVersion
     *
     * @return TenantInterface
     */
    public function setPluginsVersion(string $pluginsVersion): TenantInterface;

    /**
     * @param string $baseUrl
     *
     * @return TenantInterface
     */
    public function setBaseUrl(string $baseUrl): TenantInterface;

    /**
     * @param string $productType
     *
     * @return TenantInterface
     */
    public function setProductType(string $productType): TenantInterface;

    /**
     * @param string $description
     *
     * @return TenantInterface
     */
    public function setDescription(string $description): TenantInterface;

    /**
     * @param string $eventType
     *
     * @return TenantInterface
     */
    public function setEventType(string $eventType): TenantInterface;

    /**
     * @param string|null $oauthClientId
     *
     * @return TenantInterface
     */
    public function setOauthClientId(?string $oauthClientId): TenantInterface;
}
