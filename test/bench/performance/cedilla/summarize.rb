#! /usr/bin/ruby
# Summarizes the results of the test

results = File.open('wb_result.csv', 'r')
resource_times = []
complete_times = []
results.each do |l|
  both = l.split(',')
  resource_times << both[0].to_i
  complete_times << both[1].to_i
end
puts "\nResource times:"
puts "Max: #{resource_times.max}"
puts "Min: #{resource_times.min}"
puts "Mean: #{resource_times.reduce(:+).to_f / resource_times.size}"
puts "\nComplete times:"
puts "Max: #{complete_times.max}"
puts "Min: #{complete_times.min}"
puts "Mean #{complete_times.reduce(:+).to_f / complete_times.size}"
