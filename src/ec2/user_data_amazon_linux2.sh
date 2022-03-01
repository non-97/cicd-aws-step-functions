# -x to display the command to be executed
set -x

# Redirect /var/log/user-data.log and /dev/console
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Install the necessary packages.
yum update -y
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
yum install -y collectd
yum install -y httpd
amazon-linux-extras install -y php8.0

# Add ec2-user to the apache group.
usermod -a -G apache ec2-user

# Change the group ownership of /var/www and its contents to the apache group.
chown -R ec2-user:apache /var/www
# Change the directory permissions for /var/www and its subdirectories to set write permission for the group, and set the group ID for future subdirectories.

chmod 2775 /var/www
find /var/www -type d -exec chmod 2775 {} \;

# Repeatedly change the file permissions for /var/www and its subdirectories to add group write permissions.
find /var/www -type f -exec chmod 0664 {} \;
echo "<?php phpinfo(); ?>" > /var/www/html/phpinfo.php

# Script for starting httpd
cat - << "EOF" > /usr/local/sbin/startHttpd.sh
#!/bin/bash

EXIT_CODE=0
TIME=`date +"%Y-%m-%dT%H:%M:%S.%3NZ"`

systemctl start httpd

EXIT_CODE=$?

if [ $EXIT_CODE != 0 ]
then
    echo "$TIME ERROR Failed to start httpd service by startHttpd.sh." >> /var/log/messages
    exit 1
else
    echo "$TIME INFO As a result of running startHttpd.sh, httpd.service started successfully."  >> /var/log/messages
    exit 0
fi
EOF

# Script to stop httpd
cat - << "EOF" > /usr/local/sbin/stopHttpd.sh
#!/bin/bash

EXIT_CODE=0
TIME=`date +"%Y-%m-%dT%H:%M:%S.%3NZ"`

systemctl stop httpd

EXIT_CODE=$?

if [ $EXIT_CODE != 0 ]
then
    echo "$TIME ERROR Stopping httpd.service by stopHttpd.sh failed." >> /var/log/messages
    exit 1
else
    echo "$TIME INFO As a result of running stopHttpd.sh, httpd.service was stopped successfully."  >> /var/log/messages
    exit 0
fi
EOF

# Script for checking httpd status
cat - << "EOF" > /usr/local/sbin/checkHttpd.sh
#!/bin/bash

EXIT_CODE=0
TIME=`date +"%Y-%m-%dT%H:%M:%S.%3NZ"`

systemctl status httpd

EXIT_CODE=$?

if [ $EXIT_CODE = 3 ]; then
    echo "$TIME INFO The result of running checkHttpd.sh is that httpd.service is stopped." >> /var/log/messages
    exit 3
elif [ $EXIT_CODE != 0 ]; then
    echo "$TIME ERROR checkHttpd.sh could not be executed successfully."  >> /var/log/messages
    exit 1
else
    echo "$TIME INFO As a result of running checkHttpd.sh, httpd.service was started."  >> /var/log/messages
    exit 0
fi
EOF

# Grant execution privileges to shell scripts.
chmod 744 /usr/local/sbin/startHttpd.sh
chmod 744 /usr/local/sbin/stopHttpd.sh
chmod 744 /usr/local/sbin/checkHttpd.sh
