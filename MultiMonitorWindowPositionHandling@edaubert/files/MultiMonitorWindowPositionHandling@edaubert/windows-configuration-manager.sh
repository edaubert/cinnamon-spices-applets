#!/bin/bash

function getNbMonitor () {
	nbMonitor=`xrandr | grep connected | grep -v disconnected | cut -d' ' -f1 | wc -l`
	echo $nbMonitor
}

function getConfigurationName () {
	monitors=`xrandr | grep connected | grep -v disconnected | cut -d' ' -f1`
	configurationName=`echo -n ".${monitors}.hotplug"`
	configurationName=`echo -n $configurationName | sed -e "s/ /_/g"`
	echo $configurationName
}

function saveConfiguration () {
	rm -rf $1
	wmctrl -p -G -l | awk '($2 != -1)&&($3 != 0)&&($NF != "Desktop")' | awk '{print $1}' | while read mywinid
	do
		local info=`xwininfo -stats -wm -id "$mywinid"`
		local x=$(echo -e "$info" | grep "Absolute upper-left X" | awk '{print $NF}')
		local y=$(echo -e "$info" | grep "Absolute upper-left Y" | awk '{print $NF}')
		local width=$(echo -e "$info" | grep "Width" | awk '{print $NF}')
		local height=$(echo -e "$info" | grep "Height" | awk '{print $NF}')
		local maximizedHorizontally=$(echo -e "$info" | grep "Maximized Horz")
		local maximizedVertically=$(echo -e "$info" | grep "Maximized Vert")
		
		test -z "$maximizedHorizontally"
		maximizedHorizontally=`echo $?`
		test -z "$maximizedVertically"
		maximizedVertically=`echo $?`
		
		echo "-r -i $mywinid -e 0,${x},${y},${width},${height}"
		echo "$maximizedHorizontally $maximizedVertically"
		echo "-i -r $mywinid -e 0,${x},${y},${width},${height}" >> $1
		
		if [[ "$maximizedHorizontally" = "1" && "$maximizedVertically" = "1" ]] ; then
			echo "-i -r ${mywinid} -b add,maximized_horz,maximized_vert"
			echo "-i -r ${mywinid} -b add,maximized_horz,maximized_vert" >> $1
		else
			if [ "$maximizedHorizontally" = "1" ]; then
						echo "-i -r ${mywinid} -b add,maximized_horz"
						echo "-i -r ${mywinid} -b add,maximized_horz" >> $1
					else
						echo "-i -r ${mywinid} -b remove,maximized_horz"
						echo "-i -r ${mywinid} -b remove,maximized_horz" >> $1
					fi
					if [ "$maximizedVertically" = "1" ]; then
						echo "-i -r ${mywinid} -b add,maximized_vert"
						echo "-i -r ${mywinid} -b add,maximized_vert" >> $1
					else
						echo "-i -r ${mywinid} -b remove,maximized_vert"
						echo "-i -r ${mywinid} -b remove,maximized_vert" >> $1
					fi
		fi
		
		# echo "$mywinid $x $y $width $height $maximizedHorizontally $maximizedVertically"
		# echo "$mywinid $x $y $width $height $maximizedHorizontally $maximizedVertically" >> $1
	done
}

function restoreConfiguration () {
	file=$1
	echo $1
	declare -a mywinid
	declare -a x
	declare -a y
	declare -a width
	declare -a height

	cat "$file" | while read -r line;
	do
		echo "wmctrl $line"
		wmctrl $line
		# local mywinid=$(echo "$line" | cut -d' ' -f1)
		# echo $mywinid
		# if [ "$mywinid" == "0x07e00007" ] ; then
		# 	local x=$(echo "$line" | cut -d' ' -f2)
		# 	local y=$(echo "$line" | cut -d' ' -f3)
		# 	local width=$(echo "$line" | cut -d' ' -f4)
		# 	local height=$(echo "$line" | cut -d' ' -f5)
		# 	local maximizedHorizontally=$(echo "$line" | cut -d' ' -f6)
		# 	local maximizedVertically=$(echo "$line" | cut -d' ' -f7)
		# 	
		# 	echo $line
		# 	echo "$mywinid $x $y $width $height $maximizedHorizontally $maximizedVertically"
		# 	echo -e `xwininfo -stats -wm -id "$mywinid"`
		# 
		# 	if [[ "$maximizedHorizontally" = "1" && "$maximizedVertically" = "1" ]] ; then
		# 		wmctrl -ir ${mywinid} -b add,maximized_horz,maximized_vert
		# 	else
		# 		if [ "$maximizedHorizontally" = "1" ]; then
		# 			wmctrl -i -r ${mywinid} -b add,maximized_horz
		# 		else
		# 			echo "remove maximized_horz"
		# 			wmctrl -i -r ${mywinid} -b remove,maximized_horz
		# 			echo "wmctrl -i -r ${mywinid} -b remove,maximized_horz"
		# 		fi
		# 		if [ "$maximizedVertically" = "1" ]; then
		# 			wmctrl -i -r ${mywinid} -b add,maximized_vert
		# 		else
		# 			echo "remove maximized_vert"
		# 			wmctrl -i -r ${mywinid} -b remove,maximized_vert
		# 			echo "wmctrl -i -r ${mywinid} -b remove,maximized_vert"
		# 		fi
		# 		wmctrl -i -r ${mywinid} -e 0,${x},${y},${width},${height}
		# 		echo "wmctrl -i -r ${mywinid} -e 0,${x},${y},${width},${height}"
		# 	fi
		# fi
	done
}

function loadSpecificConfiguration () {
	if [[ -e $1 ]] ; then
		restoreConfiguration $1
	fi
}
