@rem = 'shell script
@echo off
ant -e -q %*
goto :EOF
@rem ';
#!/bin/sh
ant -e -q $*
