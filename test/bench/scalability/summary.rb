#!/usr/bin/ruby
# jff 2015
# This takes a file containing a list of integers as input
# It calculates the mean, max, and min of the list and writes the results to the bottom of the file
# Expects arguments: outFile, csvFile, concurrency, workers

if (ARGV.length < 4)
  puts "requires four arguments"
  exit 1
end

outFile = ARGV[0]
csvFile = ARGV[1]
concurrency = ARGV[2]
workers = ARGV[3]
times = []
  
f = File.open(outFile, 'r+')
csv = File.open(csvFile, 'a')

f.each_line do |l|
  times.push(l.to_i)
end

f.puts("\nMin: " + times.min.to_s)
f.puts("Max: " + times.max.to_s)
total = times.inject(:+)
average = (total/times.length).to_s
f.puts("Average: #{average}") 
f.puts("Total events: " + times.length.to_s)
csv.puts("#{concurrency},#{average},#{workers}\n") 

f.close
csv.close

