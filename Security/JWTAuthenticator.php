<?php

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Model\QSH;
use Doctrine\ORM\EntityManager;
use AtlassianConnectBundle\JWT\Authentication\JWT;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Authentication\Token\PreAuthenticatedToken;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\Authentication\AuthenticationFailureHandlerInterface;
use Symfony\Component\Security\Http\Authentication\SimplePreAuthenticatorInterface;

class JWTAuthenticator implements SimplePreAuthenticatorInterface, AuthenticationFailureHandlerInterface
{
    /** @var JWTUserProvider */
    protected $userProvider;
    /**
     * @var KernelInterface
     */
    protected $kernel;
    /**
     * @var EntityManager
     */
    protected $em;
    protected $tenantEntityClass;
    protected $devTenant;

    public function __construct(JWTUserProvider $userProvider, KernelInterface $kernel, EntityManager $em, $tenantEntityClass, $devTenant)
    {
        $this->userProvider = $userProvider;
        $this->kernel = $kernel;
        $this->em = $em;
        $this->tenantEntityClass = $tenantEntityClass;
        $this->devTenant = $devTenant;
    }

    public function createToken(Request $request, $providerKey)
    {
        $jwt = $request->query->get('jwt');
        if(!$jwt && $request->headers->has("authorization")) {
            $authorizationHeaderArray = explode(" ",$request->headers->get("authorization"));
            if(count($authorizationHeaderArray) > 1) {
                $jwt = $authorizationHeaderArray[1];
            }
        }

        if (!$jwt && ($this->kernel->getEnvironment() == 'dev') && ($this->devTenant)) {
            if(!$tenant = $this->em->getRepository($this->tenantEntityClass)->find($this->devTenant)) {
                throw new \Exception("Cant find tenant with id ".$this->devTenant." - please set atlassian_connect.dev_tenant to false to disable dedicated dev tenant OR add valid id");
            }
            $clientKey = $tenant->getClientKey();
            $sharedSecret = $tenant->getSharedSecret();
            $qshHelper = new QSH();
            $qsh = $qshHelper->create('GET', $request->getRequestUri());
            $payload = [
                'iss' => $clientKey,
                'iat' => time(),
                'exp' => time() + 86400,
                'qsh' => $qsh,
                'sub' => 'admin'
            ];

            $jwt = JWT::encode($payload, $sharedSecret);
        }

        if (!$jwt) {
            throw new BadCredentialsException('No JWT token found');
        }

        return new PreAuthenticatedToken('anon.', $jwt, $providerKey);
    }

    public function authenticateToken(TokenInterface $token, UserProviderInterface $userProvider, $providerKey)
    {
        $jwt = $token->getCredentials();
        $token = $this->userProvider->getDecodedToken($jwt);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new AuthenticationException(
                sprintf('API Key "%s" does not exist.', $jwt)
            );
        }

        /** @var $user Tenant */
        $user = $this->userProvider->loadUserByUsername($clientKey);
        if(property_exists($token,"sub")) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        return new PreAuthenticatedToken($user, $jwt, $providerKey, $user->getRoles());
    }

    public function supportsToken(TokenInterface $token, $providerKey)
    {
        return $token instanceof PreAuthenticatedToken && $token->getProviderKey() === $providerKey;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception)
    {
        return new Response('Authentication Failed: '.$exception->getMessage(), 403);
    }
}
