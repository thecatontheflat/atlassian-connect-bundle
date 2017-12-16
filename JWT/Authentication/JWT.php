<?php declare(strict_types = 1);
/**
 * This class is based on the https://github.com/firebase/php-jwt
 * Thanks for the inspiration and the sources!
 */

namespace AtlassianConnectBundle\JWT\Authentication;

use AtlassianConnectBundle\JWT\Exceptions\BeforeValidException;
use AtlassianConnectBundle\JWT\Exceptions\ExpiredException;
use AtlassianConnectBundle\JWT\Exceptions\SignatureInvalidException;

/**
 * Class JWT
 */
class JWT
{
    /**
     * @var mixed[]
     */
    public static $supportedAlgs = [
        'HS256' => ['hash_hmac', 'SHA256'],
        'HS512' => ['hash_hmac', 'SHA512'],
        'HS384' => ['hash_hmac', 'SHA384'],
        'RS256' => ['openssl', 'SHA256'],
    ];

    public static function decode(string $jwt, $key = null, array $allowedAlgs = [], int $extraSeconds = 0)
    {
        $tks = \explode('.', $jwt);
        if (\count($tks) !== 3) {
            throw new \UnexpectedValueException('Wrong number of segments');
        }
        [$headb64, $bodyb64, $cryptob64] = $tks;
        if (($header = \json_decode(JWT::urlsafeB64Decode($headb64))) === null) {
            throw new \UnexpectedValueException('Invalid header encoding');
        }
        $payload = \json_decode(JWT::urlsafeB64Decode($bodyb64));
        if ($payload === null) {
            throw new \UnexpectedValueException('Invalid claims encoding');
        }
        $sig = JWT::urlsafeB64Decode($cryptob64);
        if (isset($key)) {
            if (empty($header->alg)) {
                throw new \DomainException('Empty algorithm');
            }
            if (empty(self::$supportedAlgs[$header->alg])) {
                throw new \DomainException('Algorithm not supported');
            }
            if (!\is_array($allowedAlgs) || !\in_array($header->alg, $allowedAlgs, true)) {
                throw new \DomainException('Algorithm not allowed');
            }
            if (\is_array($key)) {
                if (isset($header->kid)) {
                    $key = $key[$header->kid];
                } else {
                    throw new \DomainException('"kid" empty, unable to lookup correct key');
                }
            }

            if (!JWT::verify("$headb64.$bodyb64", $sig, $key, $header->alg)) {
                throw new SignatureInvalidException('Signature verification failed');
            }

            // Check if the nbf if it is defined. This is the time that the
            // token can actually be used. If it's not yet that time, abort.
            if (isset($payload->nbf) && $payload->nbf > \time()) {
                throw new BeforeValidException(
                    'Cannot handle token prior to '.\date(\DateTime::ISO8601, $payload->nbf)
                );
            }

            // Check that this token has been created before 'now'. This prevents
            // using tokens that have been created for later use (and haven't
            // correctly used the nbf claim).
            if (isset($payload->iat) && $payload->iat > \time()) {
                throw new BeforeValidException(
                    'Cannot handle token prior to '.\date(\DateTime::ISO8601, $payload->iat)
                );
            }

            // Check if this token has expired.
            if (isset($payload->exp) && \time() >= ($payload->exp + $extraSeconds)) {
                throw new ExpiredException('Expired token');
            }
        }

        return $payload;
    }

    public static function encode($payload, $key, $alg = 'HS256', $keyId = null)
    {
        $header = ['typ' => 'JWT', 'alg' => $alg];
        if ($keyId !== null) {
            $header['kid'] = $keyId;
        }
        $segments = [];
        $segments[] = JWT::urlsafeB64Encode(\json_encode($header));
        $segments[] = JWT::urlsafeB64Encode(\json_encode($payload));
        $signing_input = \implode('.', $segments);

        $signature = JWT::sign($signing_input, $key, $alg);
        $segments[] = JWT::urlsafeB64Encode($signature);

        return \implode('.', $segments);
    }

    public static function sign($msg, $key, $alg = 'HS256')
    {
        if (empty(self::$supportedAlgs[$alg])) {
            throw new \DomainException('Algorithm not supported');
        }
        [$function, $algorithm] = self::$supportedAlgs[$alg];
        switch ($function) {
            case 'hash_hmac':
                return \hash_hmac($algorithm, $msg, $key, true);
            case 'openssl':
                $signature = '';
                $success = \openssl_sign($msg, $signature, $key, $algorithm);
                if (!$success) {
                    throw new \DomainException('OpenSSL unable to sign data');
                }

                return $signature;
        }
    }

    public static function urlsafeB64Decode($input)
    {
        $remainder = \mb_strlen($input) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $input .= \str_repeat('=', $padlen);
        }

        return \base64_decode(\strtr($input, '-_', '+/'), true);
    }

    public static function urlsafeB64Encode($input)
    {
        return \str_replace('=', '', \strtr(\base64_encode($input), '+/', '-_'));
    }

    private static function verify($msg, $signature, $key, $alg)
    {
        if (empty(self::$supportedAlgs[$alg])) {
            throw new \DomainException('Algorithm not supported');
        }

        [$function, $algorithm] = self::$supportedAlgs[$alg];
        switch ($function) {
            case 'openssl':
                $success = \openssl_verify($msg, $signature, $key, $algorithm);
                if (!$success) {
                    throw new \DomainException('OpenSSL unable to verify data: '.\openssl_error_string());
                }

                return $signature;

            case 'hash_hmac':
            default:
                $hash = \hash_hmac($algorithm, $msg, $key, true);
                if (\function_exists('hash_equals')) {
                    return \hash_equals($signature, $hash);
                }
                $len = \min(self::safeStrlen($signature), self::safeStrlen($hash));

                $status = 0;
                for ($i = 0; $i < $len; ++$i) {
                    $status |= (\ord($signature[$i]) ^ \ord($hash[$i]));
                }
                $status |= (self::safeStrlen($signature) ^ self::safeStrlen($hash));

                return $status === 0;
        }
    }

    /**
     * @param string $str
     *
     * @return int
     */
    private static function safeStrlen(string $str): int
    {
        if (\function_exists('mb_strlen')) {
            return \mb_strlen($str, '8bit');
        }

        return \mb_strlen($str);
    }
}
