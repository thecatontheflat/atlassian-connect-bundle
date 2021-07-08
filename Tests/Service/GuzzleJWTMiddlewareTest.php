<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Service;

use AtlassianConnectBundle\Service\GuzzleJWTMiddleware;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Psr7\Uri;
use PHPUnit\Framework\TestCase;

/**
 * Class GuzzleJWTMiddlewareTest
 *
 * @covers \AtlassianConnectBundle\Service\GuzzleJWTMiddleware
 */
final class GuzzleJWTMiddlewareTest extends TestCase
{
    /**
     * Test if authorization header is set when using auth tokens
     */
    public function testAuthTokenMiddleware(): void
    {
        $middleware = GuzzleJWTMiddleware::authTokenMiddleware('atlassian-connect', 'secret');

        $invokable = $middleware(function (Request $request, array $options) {
            $this->assertTrue($request->hasHeader('Authorization'));
            $this->assertTrue($request->hasHeader('existing-header'));
            $this->assertSame('GET', $request->getMethod());
            $this->assertEquals((string) new Uri('https://atlassian.io/api/test'), (string) $request->getUri());
        });

        $request = new Request('GET', 'https://atlassian.io/api/test', [
            'existing-header' => 'existing-value',
        ]);

        $invokable($request, []);
    }

    /**
     * Test if authorization and accept headers are set with user auth middleware
     */
    public function testAuthUserTokenMiddleware(): void
    {
        $mock = new MockHandler([
            new Response(200, [], \json_encode(['access_token' => 'token'])),
        ]);
        $client = new Client(['handler' => HandlerStack::create($mock)]);

        $middleware = GuzzleJWTMiddleware::authUserTokenMiddleware(
            $client,
            'oathClientId',
            'secret',
            'https://atlassian.io',
            'username'
        );

        $invokable = $middleware(function (Request $request, array $options) {
            $this->assertSame('application/json', $request->getHeader('Accept')[0]);
            $this->assertSame('Bearer token', $request->getHeader('Authorization')[0]);
            $this->assertEquals(new Uri('https://atlassian.io/api/test'), $request->getUri());
        });

        $request = new Request('GET', 'https://atlassian.io/api/test', [
            'existing-header' => 'existing-value',
        ]);

        $invokable($request, []);
    }
}
