/*
 ###############################################################################
 # Copyright (c) 2014-2016, Andreas Vogel andreas@wellenvogel.net
 # parts of software from movable-type
 # http://www.movable-type.co.uk/
 # for their license see the file latlon.js
 #
 #  Permission is hereby granted, free of charge, to any person obtaining a
 #  copy of this software and associated documentation files (the "Software"),
 #  to deal in the Software without restriction, including without limitation
 #  the rights to use, copy, modify, merge, publish, distribute, sublicense,
 #  and/or sell copies of the Software, and to permit persons to whom the
 #  Software is furnished to do so, subject to the following conditions:
 #
 #  The above copyright notice and this permission notice shall be included
 #  in all copies or substantial portions of the Software.
 #
 #  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 #  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 #  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 #  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 #  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 #  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 #  DEALINGS IN THE SOFTWARE.
 ###############################################################################
 * 2015-12-19: Added barometer and barograph functionality. Berthold Daum (bd)
 */
avnav.provide("avnav.nav.navdata.BaroInfo");  //bd
avnav.provide("avnav.nav.navdata.BarographInfo");  //bd
avnav.provide("avnav.nav.BaroData");   //bd
avnav.nav.navdata.BaroInfo = function() {
    this.hPa = 0.0;
    this.d1h = 0.0;
    this.d3h = 0.0;
    this.valid = false;
    this.rtime = null;
};
avnav.nav.navdata.BarographInfo = function() {
    this.hist = {};
    this.valid = false;
    this.rtime = null;
    this.localTime = null;
    this.timediff = 0;
    this.interval = 300000;
};
avnav.nav.navdata.BarographInfo.prototype.getGraphData = function() {
    var offset = this.localTime.getTimezoneOffset();
    var t = this.localTime.getTime() - this.timediff - offset*60*1000;
    var l = this.hist.length;
    var data = new Array(l);
    for (var i = l-1; i >= 0; i--) {
        data[i] = [t, this.hist[i]];
        t -= this.interval;
    }
    return data;
}
avnav.nav.BaroData = function(propertyHandler, navobject) {
    this.propertyHandler = propertyHandler;
    this.navobject = navobject;
    this.barodata = new avnav.nav.navdata.BaroInfo();
    this.barographdata = new avnav.nav.navdata.BarographInfo();
    this.formattedData = {
        baroHpa: "--",
        baro1h: "--",
        baro3h: "--",
        baroHist: {}
    };
    this.formatter = new avnav.util.Formatter();
    this.timer = null;
    this.timer2 = null;
    this.validPosition = false;
    this.baroErrors = 0;
    this.NM = this.propertyHandler.getProperties().NM;
    this.startQuery();
    for (var k in this.formattedData) {
        this.navobject.registerValueProvider(k, this, this.getFormattedValue)
    }
};
avnav.nav.BaroData.prototype.handleBaroResponse = function(data) {
    var barodata = new avnav.nav.navdata.BaroInfo();
    barodata.rtime = null;
    if (data['time'] != null) {
        barodata.rtime = new Date(data['time'])
    }
    if (data['timediff'] != null) {
        barodata.timediff = new Date(data['timediff'])
    }
    barodata.localTime = new Date();
    barodata.hPa = data['hPa'];
    barodata.d1h = data['d1h'];
    barodata.d3h = data['d3h'];
    barodata.valid = true;
    this.barodata = barodata;
    var formattedData = {};
    formattedData.baroHpa = barodata.hPa == 0 ? "--" : this.formatter.formatDecimal( barodata.hPa  || 0, 1, 1);
    formattedData.baro1h = barodata.d1h == null ||  barodata.d1h == 0 ? "--" : this.formatter.formatDecimal(barodata.d1h || 0, 1, 2);
    formattedData.baro3h = barodata.d3h == null ||  barodata.d3h == 0 ? "--" : this.formatter.formatDecimal(barodata.d3h || 0, 1, 2);
    formattedData.baroHist = barodata.hist;
    this.formattedData = formattedData
};
avnav.nav.BaroData.prototype.handleBarographResponse = function(data) {
    var barographdata = new avnav.nav.navdata.BarographInfo();
    barographdata.rtime = null;
    if (data['time'] != null) {
        barographdata.rtime = new Date(data['time'])
    }
    barographdata.localTime = new Date();
    barographdata.hist = data['hist'];
    barographdata.interval = data['interval']
    barographdata.valid = true;
    this.barographdata = barographdata;
};
avnav.nav.BaroData.prototype.startQuery = function() {
    var url = this.propertyHandler.getProperties().navUrl + "?request=baro";
    var timeout = this.propertyHandler.getProperties().baroQueryTimeout;
    var self = this;
    $.ajax({
        url: url,
        dataType: "json",
        cache: false,
        success: function(data, status) {
            if (data["class"] != null && data["class"] == "BARO" && data['hPa'] != null) {
                self.handleBaroResponse(data);
                log("barodata: " + self.formattedData.baroHpa);
                self.handleBaroStatus(true)
            } else {
                self.handleBaroStatus(false)
            }
            self.timer = window.setTimeout(function() {
                self.startQuery()
            }, timeout)
        },
        error: function(status, data, error) {
            log("query barometer error");
            self.handleBaroStatus(false);
            self.timer = window.setTimeout(function() {
                self.startQuery()
            }, timeout)
        },
        timeout: 10000
    })
};
avnav.nav.BaroData.prototype.startGraphQuery = function() {
    window.clearTimeout(this.navobject.barodata.timer2);
    var url = this.propertyHandler.getProperties().navUrl + "?request=barograph"+"&scope="+this.navobject.data.baroScope;
    var timeout = this.propertyHandler.getProperties().barographQueryTimeout*60000;
    var self = this;
    $.ajax({
        url: url,
        dataType: "json",
        cache: false,
        success: function(data, status) {
            if (data["class"] != null && data["class"] == "BAROGRAPH" && data['hist'] != null && data['interval'] != null) {
                self.handleBarographResponse(data);
                log("barograph data received");
                self.handleBarographStatus(true)
            } else {
                self.handleBarographStatus(false)
            }
            self.timer2 = window.setTimeout(function() {
                self.startGraphQuery()
            }, timeout)
        },
        error: function(status, data, error) {
            log("query barograph error");
            self.handleBarographStatus(false);
            self.timer2 = window.setTimeout(function() {
                self.startGraphQuery()
            }, timeout)
        },
        timeout: 10000
    })
};
avnav.nav.BaroData.prototype.handleBaroStatus = function(success) {
    if (!success) {
        $("#avb_ShowBaro").hide();
        this.baroErrors++;
        if (this.baroErrors > this.propertyHandler.getProperties().maxBaroErrors) {
            log("lost barometer");
            this.validPressure = false;
            this.barodata.valid = false
        } else {
            return
        }
    } else {
        $("#avb_ShowBaro").show();
        this.baroErrors = 0;
        this.validPressure = true
    }
    this.navobject.baroEvent()
};
avnav.nav.BaroData.prototype.handleBarographStatus = function(success) {
    if (!success) {
        this.baroErrors++;
        if (this.baroErrors > this.propertyHandler.getProperties().maxBaroErrors) {
            log("lost barograph");
            this.validGraph = false;
        } else {
            return
        }
    } else {
        this.baroErrors = 0;
        this.validGraph = true
    }
    var data = this.barographdata.getGraphData();
    this.navobject.barographEvent(data);
};
avnav.nav.BaroData.prototype.getBaroData = function() {
    return this.barodata
};
avnav.nav.BaroData.prototype.getFormattedBaroValue = function(name) {
    return this.formattedData[name]
};
avnav.nav.BaroData.prototype.getValueNames = function() {
    var rt = new Array();
    for (var k in this.formattedData) {
        rt.push(k)
    }
    return rt
};
