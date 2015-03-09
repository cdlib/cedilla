# Job is kicked off by cron every evening at 1:07 am
# 07 01 * * * if [ -x $HOME/cdl/cron/log_cleanup.sh ] ; then $HOME/cdl/cron/log_cleanup.sh ; fi
set -e
set -u
 
# remove older log files
find /apps/cdla/cedilla/log/ -type f -name "*.gz" -mtime +32 -exec /bin/rm {} \;
 
# compress files older than 2 weeks
find /apps/cdla/cedilla/log/ -type f -name "*.log"  -mtime +16 -exec /bin/gzip {} \;

# compress (non-apache) files larger than 30MB
find /apps/cdla/cedilla/log/ -type f -name "*.log" -size +30000k -exec /bin/gzip {} \;
