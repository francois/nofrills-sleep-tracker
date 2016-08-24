# Always run apt-get update and upgrade before installing any package
exec{'/usr/bin/apt-get update':} -> exec{'/usr/bin/apt-get upgrade -y': timeout => 0} -> Package <| |>

package{[
  'build-essential',
  'byobu',
  'daemontools',
  'default-jre',
  'git',
  'heroku-toolbelt',
  'htop',
  'libpq5',
  'libpq-dev',
  'libreadline-dev',
  'nodejs',
  'ntp',
  'postgresql-9.5',
  'postgresql-client-9.5',
  'postgresql-contrib-9.5',
  'postgresql-server-dev-9.5',
  'python-setuptools',
  'unzip',
  'vim-nox',
  'wget',
  'zsh',
]:
  ensure => latest,
}

group{'francois':
  ensure => present,
}

user{'francois':
  ensure     => present,
  gid        => 'francois',
  groups     => ['sudo'],
  managehome => true,
  shell      => '/bin/zsh',
  require    => Package['zsh']
}

ssh_authorized_key{'francois@m481':
  ensure => present,
  type   => 'ssh-rsa',
  key    => 'AAAAB3NzaC1yc2EAAAADAQABAAABAQC2VWbsTL59eN/kOcVsps9QeFZQGpFqK6GU9cI/qRA+YUybQahdz+vW38kLyF2kcBPpIHI5lP/WnFL/UWqeHpM1wsOK3pQ8Aw9swV/3OnZ/4pLGkZoof+5fieyDiTe1Gdy2grBCyfEklVQmqLCMvGYix4Ka2IsyYYJu/lAEZk6lC/4ccPU7Gm42oWMjhysNGU6aguePe4xMVfoxVrCy9URzK+f5mQsxtTkdPTSB5aNIM6poCtbbIbrwOuALLvifN9etWdb4UWryIIKERxrJN1sUa77f5g+WN5YOhnJeHC0aLLrScDGMH6B6K+d7L0+4oOlWsCQ0eXQdfD/eqBtm/ZOJ',
  user   => 'francois',
}

file{'/usr/local/bin/edb':
  ensure  => file,
  mode    => 0775,
  content => '#!/bin/sh
exec bundle exec "${@}"',
}

file{'/etc/apt/sources.list.d/pgdg.list':
  ensure  => file,
  content => 'deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main
',
}

exec{'/usr/bin/wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | /usr/bin/apt-key add -':
  creates => '/etc/apt/trusted.gpg.d/apt.postgresql.org.gpg',
}

File['/etc/apt/sources.list.d/pgdg.list'] -> Exec['/usr/bin/wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | /usr/bin/apt-key add -'] -> Exec['/usr/bin/apt-get update']

exec{'/usr/bin/git clone git://github.com/francois/dotfiles.git':
  user    => 'francois',
  cwd     => '/home/francois',
  creates => '/home/francois/dotfiles/.git',
  require => [
    Package['git'],
    User['francois'],
  ],
}

exec{'use-zsh':
  command => '/usr/bin/chsh --shell /bin/zsh francois',
  unless  => '/bin/grep --quiet --extended-regexp "^francois:.*:/bin/zsh$" /etc/passwd',
  require => [
    Package['zsh'],
    User['francois'],
  ],
}

file{'/home/francois/.config':
  ensure  => directory,
  owner   => 'francois',
  group   => 'francois',
  mode    => 0700,
  recurse => true,
}

file{'/etc/apt/sources.list.d/heroku.list':
  ensure  => file,
  content => 'deb http://toolbelt.heroku.com/ubuntu ./
',
}

exec{'/usr/bin/wget --quiet -O - https://toolbelt.heroku.com/apt/release.key | /usr/bin/apt-key add -':
  creates => '/etc/apt/trusted.gpg.d/apt.postgresql.org.gpg',
}

File['/etc/apt/sources.list.d/heroku.list'] -> Exec['/usr/bin/wget --quiet -O - https://toolbelt.heroku.com/apt/release.key | /usr/bin/apt-key add -'] -> Exec['/usr/bin/apt-get update']


$ruby_version = '9.1.2.0'
exec{"download ruby-${ruby_version}":
  command => "/usr/bin/wget -O /usr/local/src/jruby-bin-${ruby_version}.tar.gz https://s3.amazonaws.com/jruby.org/downloads/${ruby_version}/jruby-bin-${ruby_version}.tar.gz",
  creates => "/usr/local/src/jruby-bin-${ruby_version}.tar.gz",
  require => Package['wget'],
} -> exec{"extract ruby-${ruby_version}":
  command => "/bin/tar --strip-components 1 -xzf /usr/local/src/jruby-bin-${ruby_version}.tar.gz",
  cwd     => '/usr/local',
  creates => "/usr/local/bin/jruby",
} -> file{'/usr/local/bin/ruby':
  ensure => link,
  target => "/usr/local/bin/jruby",
} -> file{'/usr/local/bin/irb':
  ensure => link,
  target => "/usr/local/bin/jirb",
} -> file{'/usr/local/bin/gem':
  ensure => link,
  target => "/usr/local/bin/jgem",
}

file{'/etc/zsh/zshprofile':
  ensure  => file,
  require => Package['zsh'],
  content => '# THIS FILE MANAGED BY PUPPET!
# Do not edit

# /etc/zsh/zprofile: system-wide .zprofile file for zsh(1).
#
# This file is sourced only for login shells (i.e. shells
# invoked with "-" as the first character of argv[0], and
# shells invoked with the -l flag.)
#
# Global Order: zshenv, zprofile, zshrc, zlogin

# Database connection string to connect to the development database server
DATABASE_URL="jdbc:postgresql:///vagrant?user=vagrant&password=vagrant"
',
}
