<?php

namespace AtlassianConnectBundle\Entity;

use Serializable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\Role\Role;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Tenant
 *
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity(repositoryClass="AtlassianConnectBundle\Entity\TenantRepository")
 */
class Tenant implements UserInterface
{
    /**
     * @var integer
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
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
     * @ORM\Column(name="is_white_listed", type="boolean", options={"default":0})
     */
    private $isWhiteListed = false;

    /**
     * @ORM\Column(name="white_listed_until", type="datetime", nullable=true)
     */
    private $whiteListedUntil;
    
    /**
     * @ORM\PrePersist
     */
    public function setCreatedAt()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    /**
     * @return \DateTime
     */
    public function getCreatedAt()
    {
        return $this->createdAt;
    }

    /**
     * @ORM\PreUpdate
     */
    public function setUpdatedAt()
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * @return \DateTime
     */
    public function getUpdatedAt()
    {
        return $this->updatedAt;
    }


    /**
     * Get id
     *
     * @return integer
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Set addonKey
     *
     * @param string $addonKey
     * @return Tenant
     */
    public function setAddonKey($addonKey)
    {
        $this->addonKey = $addonKey;

        return $this;
    }

    /**
     * Get addonKey
     *
     * @return string
     */
    public function getAddonKey()
    {
        return $this->addonKey;
    }

    /**
     * Set clientKey
     *
     * @param string $clientKey
     * @return Tenant
     */
    public function setClientKey($clientKey)
    {
        $this->clientKey = $clientKey;

        return $this;
    }

    /**
     * Get clientKey
     *
     * @return string
     */
    public function getClientKey()
    {
        return $this->clientKey;
    }

    /**
     * Set publicKey
     *
     * @param string $publicKey
     * @return Tenant
     */
    public function setPublicKey($publicKey)
    {
        $this->publicKey = $publicKey;

        return $this;
    }

    /**
     * Get publicKey
     *
     * @return string
     */
    public function getPublicKey()
    {
        return $this->publicKey;
    }

    /**
     * Set sharedSecret
     *
     * @param string $sharedSecret
     * @return Tenant
     */
    public function setSharedSecret($sharedSecret)
    {
        $this->sharedSecret = $sharedSecret;

        return $this;
    }

    /**
     * Get sharedSecret
     *
     * @return string
     */
    public function getSharedSecret()
    {
        return $this->sharedSecret;
    }

    /**
     * Set serverVersion
     *
     * @param string $serverVersion
     * @return Tenant
     */
    public function setServerVersion($serverVersion)
    {
        $this->serverVersion = $serverVersion;

        return $this;
    }

    /**
     * Get serverVersion
     *
     * @return string
     */
    public function getServerVersion()
    {
        return $this->serverVersion;
    }

    /**
     * Set pluginsVersion
     *
     * @param string $pluginsVersion
     * @return Tenant
     */
    public function setPluginsVersion($pluginsVersion)
    {
        $this->pluginsVersion = $pluginsVersion;

        return $this;
    }

    /**
     * Get pluginsVersion
     *
     * @return string
     */
    public function getPluginsVersion()
    {
        return $this->pluginsVersion;
    }

    /**
     * Set baseUrl
     *
     * @param string $baseUrl
     * @return Tenant
     */
    public function setBaseUrl($baseUrl)
    {
        $this->baseUrl = $baseUrl;

        return $this;
    }

    /**
     * Get baseUrl
     *
     * @return string
     */
    public function getBaseUrl()
    {
        return $this->baseUrl;
    }

    /**
     * Set productType
     *
     * @param string $productType
     * @return Tenant
     */
    public function setProductType($productType)
    {
        $this->productType = $productType;

        return $this;
    }

    /**
     * Get productType
     *
     * @return string
     */
    public function getProductType()
    {
        return $this->productType;
    }

    /**
     * Set description
     *
     * @param string $description
     * @return Tenant
     */
    public function setDescription($description)
    {
        $this->description = $description;

        return $this;
    }

    /**
     * Get description
     *
     * @return string
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * Set eventType
     *
     * @param string $eventType
     * @return Tenant
     */
    public function setEventType($eventType)
    {
        $this->eventType = $eventType;

        return $this;
    }

    /**
     * Get eventType
     *
     * @return string
     */
    public function getEventType()
    {
        return $this->eventType;
    }

    /**
     *
     * Implementing UserInterface
     *
     */
    public function getRoles()
    {
        return ['ROLE_USER'];
    }

    public function getPassword()
    {
        return '';
    }


    public function getSalt()
    {
        return '';
    }

    public function getUsername()
    {
        return $this->username;
    }

    public function setUsername($name)
    {
        $this->username = $name;
    }

    public function eraseCredentials()
    {
    }
    
    /**
     * @return boolean
     */
    public function getIsWhiteListed()
    {
        return $this->isWhiteListed;
    }

    /**
     * @param boolean $isWhiteListed
     */
    public function setIsWhiteListed($isWhiteListed)
    {
        $this->isWhiteListed = $isWhiteListed;
        return $this;
    }

    /**
     * @return null|\DateTime
     */
    public function getWhiteListedUntil()
    {
        return $this->whiteListedUntil;
    }

    /**
     * @param \DateTime $whiteListedUntil
     */
    public function setWhiteListedUntil($whiteListedUntil)
    {
        $this->whiteListedUntil = $whiteListedUntil;
        return $this;
    }

    /**
     * @return boolean
     */
    public function isWhiteListed()
    {
        $now = new \DateTime();
        return $this->getIsWhiteListed() && (is_null($this->getWhiteListedUntil()) || ($now < $this->getWhiteListedUntil()));
    }
}
