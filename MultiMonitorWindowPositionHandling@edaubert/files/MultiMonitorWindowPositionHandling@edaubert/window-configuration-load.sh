#!/bin/bash

DIR=`dirname $0`

. ${DIR}/windows-configuration-manager.sh

getNbMonitor

getConfigurationName
restoreConfiguration $DIR/$configurationName