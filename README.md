# No Frills Sleep Tracker

This is the No Frills Sleep Tracker, an app to track your sleep and help you understand your patterns. It includes the strict bare minimum: night start/end and nap start/end. It has some graphs, but I want to have more data before I add more graphs.

To run:

    vagrant up && vagrant ssh
    sudo -u postgres createuser vagrant
    sudo -u postgres psql -c "alter role vagrant password 'vagrant'"
    sudo -u postgres createdb -O vagrant vagrant
    cd /vagrant && heroku local
    # Visit http://localhost:4321/

Deploy on Heroku using the button I will eventually add here.

# Why?

To understand the reasons why I built this software, I encourage you to read the `doc/` folder, in sequence.
