# !/usr/local/bin/python
#
#  dependencies : install pip
#                  pip install numpy
#
#
# #
__author__ = "Priyank Doshi"
__copyright__ = "Copyright 2015, The Cedilla Project CDL"
__credits__ = ["Priyank Doshi", "Joe Ferrie"]
__license__ = ""
__version__ = "1.0"
__maintainer__ = "Rob Knight"
__email__ = "pdoshi@ucop.edu"
__status__ = "Pre Production"

import re
import time
import sys
import getopt
import numpy
#import plotly.plotly as py
#py.sign_in('doshipriyank', 'nulnzeszbb')
#from plotly.graph_objs import *

# initialize variables
avgResponseTime = 1.5  # assumption if the time difference between 2 requests is less than 1.5 second then consider it as concurrent requests
startTimeLabel = "startTime"
endTimeLabel = "endTime"
EXIT_ERROR = 2
EXIT_OK = 0
rowcount = 0

# init Collections
timeDict = dict()  # initialize concurrency map
timeStampList = []  # list to add time
timeTypeList = []  # list to add name
totalConcurrSet = set()  # add concurrency
x_axis = set()  # x-axis no of days
y_axis = []  # no of concurrency
inputfile = ''


# This method is used to pass an argument.
def parseLog(line):
    """This function parses the log and filters the HTTP GET request"""

    # define globals
    global dayList
    global x_axis

    searchGetRequest = \
        re.search(r'(.*) "GET.*" (.*)', line, re.M
                  | re.I)  # get request and respomse time from log

    if searchGetRequest:
        httpRequestTime = searchGetRequest.group(1)  # getting date & time from request url
        rawTime = httpRequestTime.split(" - - ", 1)  # spliting the time from http request url

        date = (rawTime[1][1:12])  # add date to dictionary

        x_axis.add(date)  # create a set of days

        requestTime = (rawTime[1][13:21])  # normalizing time to hh:mm:ss
        startTime = convertToSeconds(requestTime)  # convert hh:mm:ss to seconds
        addToDictionary(date, startTime, startTimeLabel)

        responseTime = searchGetRequest.group(2)  # get response time
        responseTimeInSeconds = float(responseTime) / 1000000  # convert microseconds to seconds
        endTime = startTime + responseTimeInSeconds  # calculate endtime = starttime + responsetimeinseconds
        addToDictionary(date, endTime, endTimeLabel)

    else:
        print  "Error: cannot parse log line no - " + str(rowcount)
    return


# convert hh:mm:ss to seconds
def convertToSeconds(time):
    """This function converts hh:mm:ss to seconds"""
    s = time.split(':')
    return int(s[0]) * 3600 + int(s[1]) * 60 + int(s[2])


#
# add date and time in dictionary
def addToDictionary(date, time, timeType):
    """This function adds a timestamp to list"""

    global timeStampList  # add total timestanp
    global timeTypeList  # add total timetype
    global timeDict  # add concurrency based on datys

    time_list = [time]
    timeType_list = [timeType]

    # add to dictionary to sort out by
    if date in timeDict:
        timeDict[date].append(zip(time_list, timeType_list))
    else:
        timeDict[date] = [zip(time_list, timeType_list)]

    timeStampList.append(time)
    timeTypeList.append(timeType)

    return


def getConcurrency(l1, l2):
    """update concurrency count based on the requests."""

    global totalConcurrSet
    localSet = set()

    concurrencyCounter = 0
    indexes = [i[0] for i in sorted(enumerate(l1), key=lambda x: x[1])]

    for t in indexes:
        if l2[t] == startTimeLabel:
            concurrencyCounter += 1
            totalConcurrSet.add(concurrencyCounter)
            localSet.add(concurrencyCounter)
        else:
            concurrencyCounter -= 1
            totalConcurrSet.add(concurrencyCounter)
            localSet.add(concurrencyCounter)

    mean = numpy.mean(list(localSet))
    max = numpy.max(list(localSet))

    return (mean, max)


def plotGraph(x, y):
    """plot the graph """
    import plotly.plotly as py
    py.sign_in('doshipriyank', 'nulnzeszbb')
    from plotly.graph_objs import Bar, Data, Layout, Figure

    y_mean = [i[0] for i in y_axis]
    y_max = [i[1] for i in y_axis]

    _x=list(x_axis)

    trace1 = Bar(
        x=_x,
        y=y_mean,
        name='avg concurrency'
    )

    trace2 = Bar(
        x=_x,
        y=y_max,
        name='max concurrency'
    )


    # trace1 = Bar(
    #     x=['giraffes', 'orangutans', 'monkeys'],
    #     y=[20, 14, 23],
    #     name='SF Zoo'
    # )
    #
    # trace2 = Bar(
    #     x=['giraffes', 'orangutans', 'monkeys'],
    #     y=[12, 18, 29],
    #     name='LA Zoo'
    # )
    #
    data = Data([trace1, trace2])
    layout = Layout(
        barmode='group'
    )

    fig = Figure(data=data, layout=layout)
    plot_url = py.plot(fig, filename='grouped-bar')

    return


def run():
    startTime = time.time()
    print "parser.py start time - " + str(time.ctime(startTime))

    # read a file.
    # The with statement handles opening and closing the file, including if an exception is raised
    # in the inner block. The for line in f treats the file object f as an iterable, which automatically uses buffered IO
    # and memory management.
    with open(inputfile, 'r') as file:
        global rowcount
        for line in file:
            parseLog(line)
            rowcount += 1

   # global y_axis
    for date in x_axis:
        listOfLists = timeDict[date]
        flattened = [val for sublist in listOfLists for val in sublist]
        l1 = [i[0] for i in flattened]
        l2 = [i[1] for i in flattened]
        y_axis.append(getConcurrency(l1, l2))

    plotGraph(x_axis, y_axis)

    userconcurr = list(totalConcurrSet)
    print "Running log analysis on file"
    print "Total Requests - " + str(rowcount)
    print "Overall min concurrency - " + str(numpy.min(userconcurr))
    print "Overall avg concurrency - " + str(numpy.mean(userconcurr))
    print "Overall max concurrency - " + str(numpy.max(userconcurr))

    endTime = time.time()

    elapsedTime = int(endTime - startTime)

    print "parser.py end time - " + str(time.ctime(endTime))

    print "Run time of parser.py - " + str(elapsedTime) + " sec"

    return


#
# this method is called to get fiie as command line argument
def main(argv):
    """retrive file passed as an argument or exit"""

    global inputfile
    try:
        opts, args = getopt.getopt(argv, "hi:", ["ifile"])
    except getopt.GetoptError:
        print 'usage: parser.py -i <inputfile>'
        sys.exit(EXIT_ERROR)
    for opt, arg in opts:
        if opt == '-h':
            print 'usage: parser.py -i <inputfile>'
            sys.exit()
        elif opt in ("-i", "--ifile"):
            inputfile = arg
            print 'process file  -  ', inputfile
            run()
        else:
            print "invalid option. usage: parser.py -i <inputfile>"
        return


# starting of the program
if __name__ == "__main__":

    if len(sys.argv) == 1:
        print "usage: parser.py -i <inputfile>"
        sys.exit(2)
    else:
        main(sys.argv[1:])




    # trace1 = Bar(
    #     x_axis,
    #     y_mean,
    #     name="sfx_logs"
    # )
    #
    # trace2 = Bar(
    #     x_axis,
    #     y_max
    # )
    #
    # data = plotly.graph_objs.Data([trace1, trace2])
    #
    # layout = plotly.graph_objs.Layout(
    #     barmode='group'
    # )
    #
    # fig = plotly.graph_objs.Figure(data=data, layout=layout)
    #
    # unique_url = py.plot(fig, filename='grouped-bar')
