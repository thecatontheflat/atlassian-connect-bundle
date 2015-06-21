<?php

namespace AtlassianConnectBundle\Model;

class QSH
{
    public function create($method, $url)
    {
        $method = strtoupper($method);

        $parts = parse_url($url);
        $path = $parts['path'];

        $canonicalQuery = '';
        if (!empty($parts['query'])) {
            $query = $parts['query'];
            $queryParts = explode('&', $query);
            $queryArray = [];

            foreach ($queryParts as $queryPart) {
                $pieces = explode('=', $queryPart);
                $key = array_shift($pieces);
                $key = rawurlencode($key);

                $value = substr($queryPart, strlen($key) + 1);
                $value = rawurlencode($value);

                $queryArray[$key][] = $value;
            }

            ksort($queryArray);

            foreach ($queryArray as $key => $pieceOfQuery) {
                $pieceOfQuery = implode(',', $pieceOfQuery);
                $canonicalQuery .= $key.'='.$pieceOfQuery.'&';
            }

            $canonicalQuery = rtrim($canonicalQuery, '&');
        }

        $qshString = $method.'&'.$path.'&'.$canonicalQuery;
        $qsh = hash('sha256', $qshString);

        return $qsh;
    }
}
