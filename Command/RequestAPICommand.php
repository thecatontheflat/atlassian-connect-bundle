<?php
namespace AtlassianConnectBundle\Command;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Model\JWTRequest;
use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class RequestAPICommand extends ContainerAwareCommand
{
    protected function configure()
    {
        $this
            ->setName('ac:request-api')
            ->addArgument('client-key', InputArgument::REQUIRED,"Client-key from tenant OR tenant id macro, like t#123")
            ->addArgument('rest-url', InputArgument::REQUIRED, "REST api endpoint, like /rest/api/2/issue/{issueIdOrKey}")
            ->setDescription('Request REST end-points. 
Documentation available on https://docs.atlassian.com/jira/REST/cloud/');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $restUrl = $input->getArgument('rest-url');
        $em = $this->getContainer()->get('doctrine')->getManager();
        if(preg_match("'^t\#(\d+)$'",$input->getArgument('client-key'),$m)) {
            $tenant = $em->getRepository('AtlassianConnectBundle:Tenant')
                ->find($m[1]);
        } else {
            $tenant = $em->getRepository('AtlassianConnectBundle:Tenant')
                ->findOneByClientKey($input->getArgument('client-key'));
        }

        $request = new JWTRequest($tenant);
        $json = $request->get($restUrl);

        $output->writeln('');
        print json_encode($json, JSON_PRETTY_PRINT);
        $output->writeln('');
    }
}
