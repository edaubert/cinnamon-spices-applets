#!/bin/bash

function listen_xev_and_react () {
  xev -root -event substructure | while IFS= read -r line;
    do
      local event=`echo $line | cut -d' ' -f1`
      test "$event" = "CreateNotify"
      local CREATE_WINDOW=`echo $?`
      test "$event" = "DestroyNotify"
      local DESTROY_WINDOW=`echo $?`
      test "$event" = "ConfigureNotify"
      local CONFIGURE_WINDOW=`echo $?`

      echo $line
    done
}
listen_xev_and_react