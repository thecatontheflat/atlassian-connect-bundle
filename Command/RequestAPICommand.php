<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Command;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Model\JWTRequest;
use Doctrine\Common\Persistence\ManagerRegistry;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Class RequestAPICommand
 */
class RequestAPICommand extends Command
{
    /**
     * @var bool
     */
    protected $shouldNotRun;

    /**
     * @var \Doctrine\ORM\EntityManager
     */
    private $em;

    /**
     * @var string
     */
    private $tenantClass;

    /**
     * @param ManagerRegistry $registry
     * @param string          $tenantClass
     */
    public function __construct(ManagerRegistry $registry, string $tenantClass)
    {
        $this->em = $registry->getManager();
        $this->tenantClass = $tenantClass;

        parent::__construct();
    }

    /**
     * @return void
     */
    protected function configure(): void
    {
        $this
            ->setName('ac:request-api')
            ->addArgument('rest-url', InputArgument::REQUIRED, 'REST api endpoint, like /rest/api/2/issue/{issueIdOrKey}')
            ->addOption('client-key', 'c', InputOption::VALUE_REQUIRED, 'Client-key from tenant')
            ->addOption('tenant-id', 't', InputOption::VALUE_REQUIRED, 'Tenant-id')
            ->setDescription('Request REST end-points. Documentation available on https://docs.atlassian.com/jira/REST/cloud/');
    }

    /**
     * @param InputInterface  $input
     * @param OutputInterface $output
     *
     * @return void
     */
    protected function execute(InputInterface $input, OutputInterface $output): void
    {
        $restUrl = $input->getArgument('rest-url');

        /** @var TenantInterface $tenant */
        if ($input->getOption('tenant-id')) {
            $tenant = $this->em->getRepository($this->tenantClass)->find($input->getOption('tenant-id'));
        } elseif ($input->getOption('client-key')) {
            /** @noinspection PhpUndefinedMethodInspection */
            $tenant = $this->em->getRepository($this->tenantClass)->findOneByClientKey($input->getOption('client-key'));
        } else {
            throw new \RuntimeException('Please provide client-key or tenant-id');
        }

        $request = new JWTRequest($tenant);
        $json = $request->get($restUrl);

        $output->writeln('');
        echo \json_encode($json, \JSON_PRETTY_PRINT);
        $output->writeln('');
    }
}
