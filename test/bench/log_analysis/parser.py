# !/usr/local/bin/python
# 
#  dependencies : install pip
#                  pip install numpy
#
#
#
__author__      = "Priyank Doshi"
__copyright__   = "Copyright 2015, The Cedilla Project CDL"
__credits__ = ["Priyank Doshi", "Joe Ferrie"]
__license__ = ""
__version__ = "1.0"
__maintainer__ = "Rob Knight"
__email__ = "pdoshi@ucop.edu"
__status__ = "Pre Production"

import plotly.plotly as py
from plotly.graph_objs import *
import re
import time
import sys
import string
import numpy
import getopt

#initialize variables
avgResponseTime = 1.5 # assumption if the time difference between 2 requests is less than 1.5 second then consider it as concurrent requests 
startTimeLabel = "startTime"
endTimeLabel = "endTime"
EXIT_ERROR = 2
EXIT_OK = 0 

#Collections 
concurrencyMap= {} #initialize concurrency map
timeStampList = [] # list to add time
timeTypeList = [] # list to add name
concurrSet = set() #add concurrency
inputfile = ''

#constant though not in python
init_time=000000


def parseLog(line):
    'This function parses the log and filters the HTTP GET request' # docString in Python 

    global listResponseTime # declare as global variable 
    
    searchGetRequest = \
        re.search(r'(.*) "GET.*" (.*)', line, re.M
                  | re.I) #get request and respomse time from log
                  
              

    if searchGetRequest:
        
        httpRequestTime = searchGetRequest.group(1) #get request time  
        rawTime = httpRequestTime.split(" - - ", 1) #spliting the time from http request string
        requestTime = (rawTime[1][13:21])#filtering time from access log
        startTime = convertToSeconds(requestTime)#convert to minutes
        addRequestAndResponseTime(startTime, startTimeLabel)    
        
        httpResponseTime = searchGetRequest.group(2) #get response time 
        responseTimeInSeconds = float(httpResponseTime)/1000000 # convert microseconds to seconds
        endTime = startTime + responseTimeInSeconds
        addRequestAndResponseTime(endTime, endTimeLabel)

    else:
        print  "Error: cannot parse log" 
	sys.exit(EXIT_ERROR)
    return
   
# convert hh:mm:ss to seconds   
def convertToSeconds(time):
     'This function converts hh:mm:ss to seconds'
     s = time.split(':')
     return int(s[0]) * 3600 + int(s[1]) * 60 + int(s[2])


#
# update concurrency count    
def addRequestAndResponseTime(time, whichTime):
    'This function adds a timestamp to list'
     
    global concurrentMap #declare d as global    
    global timeStampList # add time stamp list 
    global timeTypeList  # add the time 
    
    timeStampList.append(time)    
    timeTypeList.append(whichTime)

    return        

def getConcurrencyCount():
    concurrencyCounter = 0
    global concurrSet
    
    indexes = [i[0] for i in sorted(enumerate(timeStampList), key=lambda x:x[1])]
    
    for t in indexes:
        if (timeTypeList[t] == startTimeLabel):
            concurrencyCounter+=1
            concurrSet.add(concurrencyCounter)
        else:
            concurrencyCounter-=1
            concurrSet.add(concurrencyCounter)
    
    return concurrSet

def main(argv):
    global inputfile
    
    try:
	opts, args = getopt.getopt(argv,"hi:",["ifile"])
    except getopt.GetoptError:
	print 'usage: parser.py -i <inputfile>'
	sys.exit(2)
    for opt, arg in opts:
	if opt == '-h':
		print 'usage: parser.py -i <inputfile>'
		sys.exit()
	elif opt in ("-i", "--ifile"):
		inputfile = arg
		print 'Input file is ', inputfile 


if __name__ == "__main__":

	startTime = time.time()
	print "Parser.py start time - "+str(startTime)


	if len(sys.argv) == 1:
		print "usage: parser.py -i <inputfile>"
		sys.exit(2)
	else:
		main(sys.argv[1:])

# read a file.
# The with statement handles opening and closing the file, including if an exception is raised
# in the inner block. The for line in f treats the file object f as an iterable, which automatically uses buffered IO
# and memory management.
with open(inputfile, 'r') as file:
    
    count = 0
    for line in file:
         parseLog(line)
         count+=1
    
    concurrSet = getConcurrencyCount()
    
    concurlist = list(concurrSet)
    print "Running log analysis on file"
    print "Total Requests - "+str(count)
    print "min concurrency - "+str(numpy.min(concurlist))
    print "avg concurrency - "+str(numpy.mean(concurlist))
    print "max concurrency - "+str(numpy.max(concurlist))

        
    endTime = time.time()
    
    elapsedTime = int(endTime - startTime)
    
    print "Parser.py end time - "+str(endTime)

    print "Run time of Parser.py - "+str(elapsedTime)+" sec"
