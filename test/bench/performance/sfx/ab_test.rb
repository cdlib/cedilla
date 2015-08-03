#! /usr/bin/ruby
# Makes a list of request queries from a list of queries derived from an SFX logfile
# Two arguments: input url file, number of lines

i = 0
TOTAL_REGX = /^Total:\s+(\d+)\s+/
queries_filename = ARGV[0]
limit = ARGV[1].to_i
queries = File.open(queries_filename, 'r')
TARGET_PREFIX = 'http://cdla-dev.cdlib.org:3005/'
#TARGET_PREFIX = 'http://ucelinks.cdlib.org:8888/sfx_test'
BASE_QUERY = '?sfx.response_type=multi_obj_detailed_xml&sfx.show_availability=1&'
outfiles = []
totals = []

queries.each do |l|
  query = l.chomp
  i += 1
  puts "#{TARGET_PREFIX}#{BASE_QUERY}#{query}"
  `ab -c 1 -n 1 -S -g abresults/fileout#{i} "#{TARGET_PREFIX}#{BASE_QUERY}#{query}" > abresults/streamout#{i}`   
  outfiles << "abresults/streamout#{i}"
  break if i >= limit && limit >= 1
  sleep 5
end

outfiles.each do |file|
  contents = File.read(file)
  totals <<  contents.match(TOTAL_REGX).captures()[0].to_i
end

puts "\nTotals"
puts totals
puts "\nSummary"
puts "Average response time: #{totals.reduce(:+).to_f / totals.size}"
puts "Max response time: #{totals.max}"
puts "Min response time: #{totals.min}"
  
   
