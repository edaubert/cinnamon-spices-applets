#!/bin/bash

DIR=`dirname $0`

# shellcheck source=windows-configuration-manager.sh
. ${DIR}/windows-configuration-manager.sh

getNbMonitor

configurationName="unknown"
getConfigurationName
restoreConfiguration $DIR/$configurationName
