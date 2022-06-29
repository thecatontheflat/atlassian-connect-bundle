<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

interface AtlassianRestClientInterface
{
    public function setTenant(TenantInterface $tenant): self;

    public function actAsUser(string $userId): self;

    public function get(string $restUrl): string;

    public function post(string $restUrl, array $json): string;

    public function put(string $restUrl, array $json): string;

    public function delete(string $restUrl): string;

    public function sendFile(UploadedFile $file, string $restUrl): string;

    public function doRequest(string $method, string $restUrl, array $options): string;
}
