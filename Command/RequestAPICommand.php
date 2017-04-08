<?php
namespace AtlassianConnectBundle\Command;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Model\JWTRequest;
use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class RequestAPICommand extends ContainerAwareCommand
{
    protected function configure()
    {
        $this
            ->setName('ac:request-api')
            ->addArgument('rest-url', InputArgument::REQUIRED, "REST api endpoint, like /rest/api/2/issue/{issueIdOrKey}")
            ->addOption('client-key', "c", InputOption::VALUE_OPTIONAL | InputOption::VALUE_REQUIRED, "Client-key from tenant")
            ->addOption('tenant-id', "t", InputOption::VALUE_OPTIONAL | InputOption::VALUE_REQUIRED, "Tenant-id")
            ->setDescription('Request REST end-points. 
Documentation available on https://docs.atlassian.com/jira/REST/cloud/');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $restUrl = $input->getArgument('rest-url');
        $em = $this->getContainer()->get('doctrine')->getManager();
        if($input->getOption("tenant-id")) {
            $tenant = $em->getRepository('AtlassianConnectBundle:Tenant')
                ->find($input->getOption("tenant-id"));
        } elseif($input->getOption("client-key")) {
            $tenant = $em->getRepository('AtlassianConnectBundle:Tenant')
                ->findOneByClientKey($input->getOption('client-key'));
        } else {
            throw new \Exception("Please provide client-key or tenant-id");
        }

        $request = new JWTRequest($tenant);
        $json = $request->get($restUrl);

        $output->writeln('');
        print json_encode($json, JSON_PRETTY_PRINT);
        $output->writeln('');
    }
}
