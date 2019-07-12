import logging
import math
import os
import time
import utm
# from collections import deque -> maybe later
from pprint import pprint

from geopy.distance import distance
from ivy.std_api import IvyBindMsg, IvyInit, IvyStart, IvyStop, IvyUnBindMsg

# Parameters
close_enough = 1  # in seconds
log_size = 500  # number of past_positions kept in memory
origin = [43.46, 1.27]


class PprzGpsGrabber:

    def __init__(self, ipp="127.255.255.255:2010"):

        self.ivyIpp = ipp   # ip:port to launch ivybus on
        self.ivyBindId = -1  # ivy messages bind id used to unbind on stop
        self.uavs = {}      # dict {keys : uav id, values : dict {keys : data_name, values : data} }

    def start(self):

        # Ivy Agent initialization
        IvyInit("PprzGpsGrabber_" + str(os.getpid()))
        # set log level to hide INFO stdout messages
        logging.getLogger('Ivy').setLevel(logging.WARN)
        IvyStart(self.ivyIpp)
        self.ivyBindId = IvyBindMsg(
            lambda agent, msg: self.gps_callback(msg), '(.* GPS .*)')

    def stop(self):

        if self.ivyBindId > 0:
            IvyUnBindMsg(self.ivyBindId)
            self.ivyBindId = -1
            IvyStop()

    def gps_callback(self, msg):

        words = msg.split(' ')
        uavId = int(words[0])
        m_time = int(words[10]) / 1000
        altitude = int(words[6]) / 1000
        heading = int(words[5]) / 10.0
        zone = int(words[11])
        easting = float(words[3]) / 1.0e2      # utmX (cm)
        northing = float(words[4]) / 1.0e2     # utmY (cm)

        position = list(utm.to_latlon(easting, northing, zone, northern=True))
        position.append(altitude)

        simulation_position = translate_position(position)
        simulation_position.append(altitude)

        # New uav detected
        if uavId not in self.uavs.keys():

            self.uavs[uavId] = {
                "altitude": altitude,
                "heading": heading,
                "position": position,
                "simulation_position": simulation_position,
                "path": [position],
                "simulation_path": [simulation_position],
                "last_log_time": m_time,
            }

        else:

            self.uavs[uavId].update({
                "altitude": altitude,
                "heading": heading,
                "position": position,
                "simulation_position": simulation_position
            })

            # Add position to path only if it is far enough from last position
            if m_time - self.uavs[uavId]['last_log_time'] > close_enough:
                self.uavs[uavId]['path'].append(position)
                self.uavs[uavId]['simulation_path'].append(simulation_position)
                self.uavs[uavId]['last_log_time'] = m_time

                # Delete old positions
                if len(self.uavs[uavId]['path']) > log_size:
                    self.uavs[uavId]['path'].pop(0)
                    self.uavs[uavId]['simulation_path'].pop(0)


def translate_position(real_world):
    x = distance(origin, [real_world[0], origin[1]]).meters
    y = distance(origin, [origin[0], real_world[1]]).meters

    return [x, y]


if __name__ == '__main__':
    p = PprzGpsGrabber()
    p.start()
    starttime = time.time()
    while True:
        pprint(p.uavs)
        time.sleep(1.0 - ((time.time() - starttime) % 1.0))
