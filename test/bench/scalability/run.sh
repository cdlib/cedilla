#! /bin/bash

if [ $# -eq "0" ]; then
  echo "Pass the concurrency number as an argument"
  exit 1
fi
concurrency=$1
case ${concurrency} in
  [!0-9]* ) 
    echo "Concurrency argument  must be an integer"
    exit 1
  ;;
esac

if [ $# -eq "2" ]; then
  total=$2
else
  total=$concurrency
fi

workers=$(($concurrency/10))

if [ ! -f "result.csv" ]; then
  echo "Concurrency,Average response time,workers" > result.csv
fi
if [ -f "results" ]; then
  echo "results is not a directory"
  exit 1
fi
if [ ! -d "results" ]; then
  mkdir results
fi
echo "total $total"
echo "concurrency $concurrency"
echo "workers $workers"

websocket-bench -a $total -c $concurrency -w $workers -g cdla_generator.js  -t socket.io -p socket.io -k http://d2d-cdla-dev.cdlib.org:3005
./summary.rb result.txt result.csv $concurrency $workers
mv result.txt results/${total}_${concurrency}_${workers}
