<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Model;

/**
 * Class QSH
 */
class QSH
{
    /**
     * @param string $methodIn
     * @param string $url
     *
     * @return string
     */
    public function create(string $methodIn, string $url): string
    {
        $method = \mb_strtoupper($methodIn);

        $parts = \parse_url($url);
        $path = $parts['path'];

        $canonicalQuery = '';
        if (!empty($parts['query'])) {
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

        $qshString = $method.'&'.$path.'&'.$canonicalQuery;

        return \hash('sha256', $qshString);
    }
}
