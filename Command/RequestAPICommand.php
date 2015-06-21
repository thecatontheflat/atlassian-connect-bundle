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
            ->addArgument('client-key', InputArgument::REQUIRED)
            ->addArgument('rest-url', InputArgument::REQUIRED)
            ->setDescription('Request REST end-points');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $tenant = $input->getArgument('client-key');
        $restUrl = $input->getArgument('rest-url');
        $em = $this->getContainer()->get('doctrine')->getManager();
        $tenant = $em->getRepository('AtlassianConnectBundle:Tenant')
            ->findOneByClientKey($tenant);

        $request = new JWTRequest($tenant);
        $json = $request->get($restUrl);

        $output->writeln('');
        var_export($json);
        $output->writeln('');
    }
}