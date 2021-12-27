<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Command;

use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use AtlassianConnectBundle\Service\AtlassianRestClientInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class RequestAPICommand extends Command
{
    private TenantRepositoryInterface $repository;
    private AtlassianRestClientInterface $restClient;

    public function __construct(TenantRepositoryInterface $repository, AtlassianRestClientInterface $restClient)
    {
        parent::__construct();
        $this->repository = $repository;
        $this->restClient = $restClient;
    }

    protected function configure(): void
    {
        $this
            ->setName('ac:request-api')
            ->addArgument('rest-url', InputArgument::REQUIRED, 'REST api endpoint, like /rest/api/2/issue/{issueIdOrKey}')
            ->addOption('client-key', 'c', InputOption::VALUE_REQUIRED, 'Client-key from tenant')
            ->addOption('tenant-id', 't', InputOption::VALUE_REQUIRED, 'Tenant-id')
            ->setDescription('Request REST end-points. Documentation available on https://docs.atlassian.com/jira/REST/cloud/');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $restUrl = $input->getArgument('rest-url');

        if ($input->getOption('tenant-id')) {
            $tenant = $this->repository->findById($input->getOption('tenant-id'));
        } elseif ($input->getOption('client-key')) {
            $tenant = $this->repository->findByClientKey($input->getOption('client-key'));
        } else {
            throw new \RuntimeException('Please provide client-key or tenant-id');
        }

        $this->restClient->setTenant($tenant);

        $json = $this->restClient->get($restUrl);

        $output->writeln('');
        $output->writeln($json);
        $output->writeln('');

        return 0;
    }
}
