#! /usr/bin/ruby
# Makes a list of request queries from an SFX logfile
# Two arguments: input log file, number of lines

i = 0
query_regex = /"GET\s\/sfx_local\??&?(url_ver=Z39.88.+)\sHTTP/
log = ARGV[0]
f = File.open(log, 'r')
f.each do |l|
  i += 1
  unless l.match(query_regex).nil?
    unless l.match(/pmid/) || l.match(/doi/)
      puts l.match(query_regex).captures
    end
  end
  break if i > ARGV[1].to_i
end
