<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Entity;

use Symfony\Component\Security\Core\User\UserInterface;

interface TenantInterface extends UserInterface
{
    /**
     * @return array<string>
     */
    public function getRoles(): array;

    public function getSharedSecret(): ?string;

    public function getOauthClientId(): ?string;

    public function getBaseUrl(): ?string;

    public function getAddonKey(): ?string;

    public function getClientKey(): ?string;

    public function setUsername(string $name): self;

    public function isWhiteListed(): bool;

    public function setAddonKey(string $addonKey): self;

    public function setClientKey(string $clientKey): self;

    public function setPublicKey(string $publicKey): self;

    public function setSharedSecret(string $sharedSecret): self;

    public function setServerVersion(string $serverVersion): self;

    public function setPluginsVersion(string $pluginsVersion): self;

    public function setBaseUrl(string $baseUrl): self;

    public function setProductType(string $productType): self;

    public function setDescription(string $description): self;

    public function setEventType(string $eventType): self;

    public function setOauthClientId(?string $oauthClientId): self;
}
