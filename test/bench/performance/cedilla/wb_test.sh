#! /bin/bash
# Runs a single websocket-bench test in the background

filename=$1

function wb {
  concurrency="1"
  total="1"
  workers="1"
  websocket-bench -a $total -c $concurrency -w $workers -g cdla_generator.js  -t socket.io -p socket.io -k http://d2d-cdla-dev.cdlib.org:3005 &
  proc=$!
  # give time for all processes to initialize
  sleep 1
  # get child process of prod
  worker=$(pgrep -P $proc)

  # kill them now? or later? (Pirate Jenny)
  sleep 5
  kill -9 $worker
  kill -9 $proc
}

outfile="~qry"
while read -r line
do
    name=$line
    echo "loop"
    echo $name > $outfile
    wb 
done < "$filename"

sleep 2
./summarize.rb
