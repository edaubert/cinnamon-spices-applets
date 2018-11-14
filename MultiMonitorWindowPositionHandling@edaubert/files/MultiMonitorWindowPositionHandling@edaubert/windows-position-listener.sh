#!/bin/bash

DIR=`dirname $0`

function listen_xev_and_react () {
  oldtime="0"
  while IFS= read -r line;
    do
      # INFO only process line each second
      currenttime="`date +"%s"`"
      if  [[ "$currenttime" -gt "$oldtime" ]] ; then

        local event
        event=`echo $line | cut -d' ' -f1`
        local CREATE_WINDOW
        test "$event" = "CreateNotify"
        CREATE_WINDOW="`echo $?`"
        local DESTROY_WINDOW
        test "$event" = "DestroyNotify"
        DESTROY_WINDOW="`echo $?`"
        local CONFIGURE_WINDOW
        test "$event" = "ConfigureNotify"
        CONFIGURE_WINDOW="`echo $?`"

        # TODO detect when a window changed
        # TODO detect connection and deconnection of display

        # echo $line
        if [[ "$DESTROY_WINDOW" == "0" || "$CREATE_WINDOW" == "0" || "$CONFIGURE_WINDOW" == "0" ]] ; then

          let "oldtime = $currenttime + 1"

          # echo "$DESTROY_WINDOW\t$CREATE_WINDOW\t$CONFIGURE_WINDOW"
          bash ${DIR}/window-configuration-save.sh
        fi
      fi
    done < <( xev -root -event substructure )
}
listen_xev_and_react
