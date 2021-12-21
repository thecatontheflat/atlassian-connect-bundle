<?php

declare(strict_types=1);

use AtlassianConnectBundle\Tests\Functional\App\Kernel;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\ConsoleOutput;

setlocale(\LC_ALL, 'en_US.UTF-8');

$file = __DIR__.'/../vendor/autoload.php';

if (!file_exists($file)) {
    throw new RuntimeException('Install dependencies using Composer to run the test suite.');
}

require $file;

$application = new Application(new Kernel('dev', true));
$application->setAutoExit(false);

$input = new ArrayInput(['command' => 'doctrine:database:drop', '--no-interaction' => true, '--force' => true]);
$application->run($input, new ConsoleOutput());

$input = new ArrayInput(['command' => 'doctrine:database:create', '--no-interaction' => true]);
$application->run($input, new ConsoleOutput());

$input = new ArrayInput(['command' => 'doctrine:schema:create']);
$application->run($input, new ConsoleOutput());

$input = new ArrayInput(['command' => 'doctrine:fixtures:load', '--no-interaction' => true, '--append' => false]);
$application->run($input, new ConsoleOutput());

unset($input, $application);
