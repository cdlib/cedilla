#! /usr/bin/ruby
# Makes a list of request queries from an SFX logfile
# Two arguments: input log file, number of lines

i = 0
query_regex = /"GET\s\/sfx_local(.+)\sHTTP/
log = ARGV[0]
f = File.open(log, 'r')
f.each_line do |l|
  i += 1
  puts l.match(query_regex).captures
  break if i > ARGV[1].to_i
end
