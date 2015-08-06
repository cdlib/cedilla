#! /usr/bin/ruby
# Summarizes the results of the test

results = File.open('wb_result.csv', 'r')
filtered = File.open('filtered_result.csv', 'w+')
i = 0

# For each query there are three results
# Filter the results to move the first one
# in each series
# for the purpose of warming the cache
# and getting a more uniform result
results.each do |l|
 unless i == 0 || i % 3 == 0
  filtered << l
 end
 i += 1
end

resource_times = []
complete_times = []


# the last value in each row will be the complete time
# if there is only one value there are no resources
rows = []
filtered.seek(0)
filtered.each do |l|
  rows << l
  row = l.split(',')
  if row.size > 1
    resource_times << row[0].to_i 
  end
  complete_times << row[-1].to_i
end

# output all the results
puts "Total rows: #{rows.size}"

puts "\nResource times:"
puts "Max: #{resource_times.max}"
puts "Min: #{resource_times.min}"
puts "Mean: #{resource_times.reduce(:+).to_f / resource_times.size}"
puts "\nComplete times:"
puts "Max: #{complete_times.max}"
puts "Min: #{complete_times.min}"
puts "Mean #{complete_times.reduce(:+).to_f / complete_times.size}"
