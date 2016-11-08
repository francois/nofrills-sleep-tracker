# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/xenial64"
  config.vm.box_check_update = false

  config.vm.network "private_network", ip: "10.9.1.15"
  config.vm.network "forwarded_port", guest: 80, host: 8080
  config.vm.network "forwarded_port", guest: 2300, host: 2300
  config.vm.network "forwarded_port", guest: 4321, host: 4321
  config.vm.network "forwarded_port", guest: 5432, host: 5432

  config.ssh.forward_agent = true

  config.vm.provider "virtualbox" do |vb|
    vb.customize ["modifyvm", :id, "--memory", "2048"]
  end

  config.vm.provision "shell", inline: "test -f /opt/puppetlabs/bin/puppet || ( cd /usr/local/src && /usr/bin/wget --quiet https://apt.puppetlabs.com/puppetlabs-release-pc1-wheezy.deb && dpkg -i puppetlabs-release-pc1-wheezy.deb && apt-get update && apt-get install -y puppet-agent )"
  config.vm.provision "shell", inline: "/opt/puppetlabs/bin/puppet apply /vagrant/manifests/site.pp"
end
