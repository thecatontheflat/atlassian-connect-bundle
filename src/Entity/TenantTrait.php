<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

trait TenantTrait
{
    /**
     * @var int
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id()
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * @var string
     *
     * @ORM\Column(name="addon_key", type="string", length=255)
     */
    private $addonKey;

    /**
     * @var string
     *
     * @ORM\Column(name="client_key", type="string", length=255, unique=true)
     */
    private $clientKey;

    /**
     * @var string|null
     *
     * @ORM\Column(name="oauth_client_id", type="string", length=255, nullable=true)
     */
    private $oauthClientId;

    /**
     * @var string
     */
    private $username;

    /**
     * @var string
     *
     * @ORM\Column(name="public_key", type="string", length=255)
     */
    private $publicKey;

    /**
     * @var string
     *
     * @ORM\Column(name="shared_secret", type="string", length=255)
     */
    private $sharedSecret;

    /**
     * @var string
     *
     * @ORM\Column(name="server_version", type="string", length=255)
     */
    private $serverVersion;

    /**
     * @var string
     *
     * @ORM\Column(name="plugins_version", type="string", length=255)
     */
    private $pluginsVersion;

    /**
     * @var string
     *
     * @ORM\Column(name="base_url", type="string", length=255)
     */
    private $baseUrl;

    /**
     * @var string
     *
     * @ORM\Column(name="product_type", type="string", length=255)
     */
    private $productType;

    /**
     * @var string
     *
     * @ORM\Column(name="description", type="string", length=255)
     */
    private $description;

    /**
     * @var string
     *
     * @ORM\Column(name="event_type", type="string", length=255)
     */
    private $eventType;

    /**
     * @var \DateTime
     *
     * @ORM\Column(name="created_at", type="datetime", nullable=false)
     */
    private $createdAt;

    /**
     * @var \DateTime
     *
     * @ORM\Column(name="updated_at", type="datetime", nullable=false)
     */
    private $updatedAt;

    /**
     * @var bool
     *
     * @ORM\Column(name="is_white_listed", type="boolean", options={"default":0})
     */
    private $isWhiteListed = false;

    /**
     * @var \DateTime
     *
     * @ORM\Column(name="white_listed_until", type="datetime", nullable=true)
     */
    private $whiteListedUntil;

    /**
     * @ORM\PrePersist()
     */
    public function setCreatedAt(): void
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    /**
     * @ORM\PreUpdate()
     */
    public function setUpdatedAt(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getUpdatedAt(): \DateTime
    {
        return $this->updatedAt;
    }

    /**
     * Get id.
     */
    public function getId(): ?int
    {
        return $this->id;
    }

    /**
     * Set addonKey.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setAddonKey(string $addonKey): TenantInterface
    {
        $this->addonKey = $addonKey;

        return $this;
    }

    /**
     * Get addonKey.
     */
    public function getAddonKey(): ?string
    {
        return $this->addonKey;
    }

    /**
     * Set clientKey.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setClientKey(string $clientKey): TenantInterface
    {
        $this->clientKey = $clientKey;

        return $this;
    }

    /**
     * Get clientKey.
     */
    public function getClientKey(): ?string
    {
        return $this->clientKey;
    }

    /**
     * Set publicKey.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setPublicKey(string $publicKey): TenantInterface
    {
        $this->publicKey = $publicKey;

        return $this;
    }

    /**
     * Get publicKey.
     */
    public function getPublicKey(): ?string
    {
        return $this->publicKey;
    }

    /**
     * Set sharedSecret.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setSharedSecret(string $sharedSecret): TenantInterface
    {
        $this->sharedSecret = $sharedSecret;

        return $this;
    }

    /**
     * Get sharedSecret.
     */
    public function getSharedSecret(): ?string
    {
        return $this->sharedSecret;
    }

    /**
     * Set serverVersion.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setServerVersion(string $serverVersion): TenantInterface
    {
        $this->serverVersion = $serverVersion;

        return $this;
    }

    /**
     * Get serverVersion.
     */
    public function getServerVersion(): ?string
    {
        return $this->serverVersion;
    }

    /**
     * Set pluginsVersion.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setPluginsVersion(string $pluginsVersion): TenantInterface
    {
        $this->pluginsVersion = $pluginsVersion;

        return $this;
    }

    /**
     * Get pluginsVersion.
     */
    public function getPluginsVersion(): ?string
    {
        return $this->pluginsVersion;
    }

    /**
     * Set baseUrl.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setBaseUrl(string $baseUrl): TenantInterface
    {
        $this->baseUrl = $baseUrl;

        return $this;
    }

    /**
     * Get baseUrl.
     */
    public function getBaseUrl(): ?string
    {
        return $this->baseUrl;
    }

    /**
     * Set productType.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setProductType(string $productType): TenantInterface
    {
        $this->productType = $productType;

        return $this;
    }

    /**
     * Get productType.
     */
    public function getProductType(): ?string
    {
        return $this->productType;
    }

    /**
     * Set description.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setDescription(string $description): TenantInterface
    {
        $this->description = $description;

        return $this;
    }

    /**
     * Get description.
     */
    public function getDescription(): ?string
    {
        return $this->description;
    }

    /**
     * Set eventType.
     *
     * @return TenantTrait|TenantInterface
     */
    public function setEventType(string $eventType): TenantInterface
    {
        $this->eventType = $eventType;

        return $this;
    }

    /**
     * Get eventType.
     */
    public function getEventType(): ?string
    {
        return $this->eventType;
    }

    /**
     * Implementing UserInterface.
     *
     * @return array<string>
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    public function getPassword(): string
    {
        return '';
    }

    public function getSalt(): string
    {
        return '';
    }

    public function getUsername(): ?string
    {
        return $this->getUserIdentifier();
    }

    /**
     * @return string|null
     */
    public function getUserIdentifier(): string
    {
        return $this->username;
    }

    /**
     * @return TenantTrait|TenantInterface
     */
    public function setUsername(string $name): TenantInterface
    {
        $this->username = $name;

        return $this;
    }

    public function eraseCredentials(): void
    {
    }

    public function getIsWhiteListed(): bool
    {
        return $this->isWhiteListed;
    }

    public function setIsWhiteListed(bool $isWhiteListed): self
    {
        $this->isWhiteListed = $isWhiteListed;

        return $this;
    }

    public function getWhiteListedUntil(): ?\DateTime
    {
        return $this->whiteListedUntil;
    }

    public function setWhiteListedUntil(\DateTime $whiteListedUntil): self
    {
        $this->whiteListedUntil = $whiteListedUntil;

        return $this;
    }

    public function isWhiteListed(): bool
    {
        $now = new \DateTime();

        return $this->getIsWhiteListed() && (null === $this->getWhiteListedUntil() || ($now < $this->getWhiteListedUntil()));
    }

    /**
     * @return TenantTrait|TenantInterface
     */
    public function setOauthClientId(?string $oauthClientId): TenantInterface
    {
        $this->oauthClientId = $oauthClientId;

        return $this;
    }

    public function getOauthClientId(): ?string
    {
        return $this->oauthClientId;
    }
}
