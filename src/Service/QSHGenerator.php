<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

/**
 * Class QSHGenerator
 */
class QSHGenerator
{
    /**
     * Create Query String Hash
     *
     * More details:
     * https://developer.atlassian.com/static/connect/docs/latest/concepts/understanding-jwt.html#creating-token
     *
     * @param string $url    URL of the request
     * @param string $method HTTP method
     *
     * @return string
     */
    public static function generate(string $url, string $method): string
    {
        $parts = \parse_url($url);

        // Remove "/wiki" part from the path for the Confluence
        // Really, I didn't find this part in the docs, but it works
        $path = \str_replace('/wiki', '', $parts['path']);
        $canonicalQuery = '';

        if (\array_key_exists('query', $parts) && $parts['query'] !== null && $parts['query'] !== '') {
            $query = $parts['query'];
            $queryParts = \explode('&', $query);
            $queryArray = [];

            foreach ($queryParts as $queryPart) {
                $pieces = \explode('=', $queryPart);
                $key = \array_shift($pieces);
                $key = \rawurlencode($key);
                $value = \mb_substr($queryPart, \mb_strlen($key) + 1);
                $value = \rawurlencode($value);
                $queryArray[$key][] = $value;
            }

            \ksort($queryArray);

            foreach ($queryArray as $key => $pieceOfQuery) {
                $pieceOfQuery = \implode(',', $pieceOfQuery);
                $canonicalQuery .= $key.'='.$pieceOfQuery.'&';
            }

            $canonicalQuery = \rtrim($canonicalQuery, '&');
        }

        return \hash('sha256', \implode('&', [\mb_strtoupper($method), $path, $canonicalQuery]));
    }
}
