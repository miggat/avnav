/**
 * Created by andreas on 04.05.14.
 */
avnav.provide('avnav.nav.NavObject');
avnav.provide('avnav.nav.NavEvent');
avnav.provide('avnav.nav.NavEventSource');

/**
 * the navevent type
 * @enum {number}
 */
avnav.nav.NavEventType={
    GPS:0,
    AIS:1,
    TRACK:2,
    NAV:3,
    ROUTE: 4,
    BARO: 5,   // bd
    BAROGRAPH: 6   // bd
};

/**
 * a definition of the source that caused an event
 * to avoid endless loops
 * @enum {number}
 */
avnav.nav.NavEventSource={
    NAV:0,
    GUI:1,
    MAP:2
};

/**
 * the center mode for ais
 * @type {{NONE: number, GPS: number, MAP: number}}
 */
avnav.nav.AisCenterMode={
    NONE:0,
    GPS:1,
    MAP:2
};

/**
 *
 * @param {avnav.nav.NavEventType} type
 * @param {Array.<string>} changedNames the display names that have changed data
 * @param {avnav.nav.NavEventSource} source
 * @param {avnav.nav.NavObject} navobject
 * @constructor
 */
avnav.nav.NavEvent=function(type,changedNames,source,navobject){
    /**
     * @type {avnav.nav.NavEventType}
     */
    this.type=type;
    /**
     * the list of changed display elements
     * @type {Array.<string>}
     */
    this.changedNames=changedNames;
    /**
     * @type {avnav.nav.NavEventSource}
     */
    this.source=source;
    /**
     * @type {avnav.nav.NavObject}
     */
    this.navobject=navobject;
};

avnav.nav.NavEvent.EVENT_TYPE="navevent";

/**
 *
 * @param {avnav.util.PropertyHandler} propertyHandler
 * @constructor
 */
avnav.nav.NavObject=function(propertyHandler){
    /** @private */
    this.propertyHandler=propertyHandler;

    /**
     * @private
     * @type {avnav.util.Formatter}
     */
    this.formatter=new avnav.util.Formatter();
    /**
     * a map from the display names to the function that provides the data
     * @type {{}}
     * @private
     */
    this.valueMap={};
    /** @type {avnav.nav.GpsData}
     * @private
     */
    this.gpsdata=new avnav.nav.GpsData(propertyHandler,this);
    /**
     * @private
     * @type {avnav.nav.TrackData}
     */
    this.trackHandler=new avnav.nav.TrackData(propertyHandler,this);

    this.aisHandler=new avnav.nav.AisData(propertyHandler,this);
    this.routeHandler=new avnav.nav.RouteData(propertyHandler,this);
    /**
     * @private
     * @type {avnav.nav.navdata.Point}
     */
    this.maplatlon=new avnav.nav.navdata.Point(0,0);

    this.aisMode=avnav.nav.AisCenterMode.NONE;


    /**
     * our computed data...
     * @type {{centerCourse: number, centerDistance: number, markerCourse: number, markerDistance: number}}
     */
    this.data={
        centerCourse:0,
        centerDistance:0,
        centerMarkerCourse:0,
        centerMarkerDistance:0,
        markerCourse:0,
        markerDistance:0,
        /**
         * @type {Date}
         */
        markerEta:null,
        markerLatlon:new avnav.nav.navdata.Point(0,0),
        /* data for the active route */
        routeName: undefined,
        routeNumPoints: 0,
        routeLen: 0,
        routeRemain: 0,
        routeEta: null,
        routeNextCourse: 0,
        routeXte: 0,
        /* data for the route we are editing */
        edRouteName: undefined,
        edRouteNumPoints: 0,
        edRouteLen: 0,
        /* the next 2 will only be filled when the editing route is the current */
        edRouteRemain: 0,
        edRouteEta: 0,
        baroHPa: 0, // bd
        baro1h: 0,
        baro3h: 0,
        baroHist: {},
        baroScope: 3,
        baroMagnified: false
    };
    this.formattedValues={
        markerEta:"--:--:--",
        markerCourse:"--",
        markerDistance:"--",
        markerPosition:"none",
        centerCourse:"--",
        centerDistance:"--",
        centerMarkerCourse:"--",
        centerMarkerDistance:"--",
        centerPosition:"--",
        routeName: "default",
        routeNumPoints: "--",
        routeLen: "--",
        routeRemain: "--",
        routeEta: "--:--:--",
        routeNextCourse: "---",
        routeXte: "---",
        edRouteName: "default",
        edRouteNumPoints: "--",
        edRouteLen: "--",
        edRouteRemain: "--",
        edRouteEta: "--:--:--"
    };
    for (var k in this.formattedValues){
        this.registerValueProvider(k,this,this.getFormattedNavValue);
    }
    this.barodata = new avnav.nav.BaroData(propertyHandler, this);
};

/**
 * compute the raw and formtted valued
 * @private
 */
avnav.nav.NavObject.prototype.computeValues=function(){
    var gps=this.gpsdata.getGpsData();
    //copy the marker to data to make it available extern
    this.data.markerLatlon=this.routeHandler.getRouteData().to;
    var vmgapp=0;
    if (gps.valid){
        if (this.routeHandler.getLock()) {
            var markerdst = avnav.nav.NavCompute.computeDistance(gps, this.data.markerLatlon);
            this.data.markerCourse = markerdst.course;
            this.data.markerDistance = markerdst.dtsnm;
            var coursediff = Math.min(Math.abs(markerdst.course - gps.course), Math.abs(markerdst.course + 360 - gps.course),
                Math.abs(markerdst.course - (gps.course + 360)));
            if (gps.rtime && coursediff <= 85) {
                //TODO: is this really correct for VMG?
                vmgapp = gps.speed * Math.cos(Math.PI / 180 * coursediff);
                //vmgapp is in kn
                var targettime = gps.rtime.getTime();
                if (vmgapp > 0) {
                    targettime += this.data.markerDistance / vmgapp * 3600 * 1000; //time in ms
                    var targetDate = new Date(Math.round(targettime));
                    this.data.markerEta = targetDate;
                }
                else {
                    this.data.markerEta = null;
                }

            }
            else  this.data.markerEta = null;
            var rstart=this.routeHandler.getRouteData().from;
            this.data.routeXte=avnav.nav.NavCompute.computeXte(rstart,this.data.markerLatlon,gps);
        }
        else {
            this.data.markerCourse=undefined;
            this.data.markerDistance=undefined;
            this.data.markerEta=undefined;
            this.data.routeXte=undefined;
        }
        var centerdst=avnav.nav.NavCompute.computeDistance(gps,this.maplatlon);
        this.data.centerCourse=centerdst.course;
        this.data.centerDistance=centerdst.dtsnm;
    }
    else{
        this.data.centerCourse=0;
        this.data.centerDistance=0;
        this.data.markerCourse=0;
        this.data.markerDistance=0;
        this.data.markerEta=null;
        this.data.routeXte=undefined;
    }

    //distance between marker and center
    var mcdst=avnav.nav.NavCompute.computeDistance(this.data.markerLatlon,this.maplatlon);
    this.data.centerMarkerCourse=mcdst.course;
    this.data.centerMarkerDistance=mcdst.dtsnm;
    //route data
    var curRoute=this.routeHandler.getRouteData().currentRoute;
    if (this.routeHandler.hasActiveRoute()) {
        this.data.routeName = curRoute.name;
        this.data.routeNumPoints = curRoute.points.length;
        this.data.routeLen = this.routeHandler.computeLength(0,curRoute);
        if (this.routeHandler.getLock()) {
            this.data.routeRemain = this.routeHandler.computeLength(-1,curRoute) + this.data.markerDistance;
            var routetime = gps.rtime ? gps.rtime.getTime() : 0;
            if (vmgapp > 0) {
                routetime += this.data.routeRemain / vmgapp * 3600 * 1000; //time in ms
                var routeDate = new Date(Math.round(routetime));
                this.data.routeEta = routeDate;
            }
            else {
                this.data.routeEta = undefined;
            }
            this.data.routeNextCourse = undefined;
            if ( gps.valid) {
                var nextwp = this.routeHandler.getCurrentLegNextWp();
                if (nextwp) {
                    var dst = avnav.nav.NavCompute.computeDistance(gps, nextwp);
                    this.data.routeNextCourse = dst.course;
                }
            }
        }
        else {
            this.data.routeRemain=0;
            this.data.routeEta=undefined;
            this.data.routeNextCourse=undefined;
        }
    }
    else {
        this.data.routeName=undefined;
        this.data.routeNumPoints=0;
        this.data.routeLen=0;
        this.data.routeRemain=0;
        this.data.routeEta=undefined;
        this.data.routeNextCourse=undefined;
    }
    if (this.routeHandler.isEditingActiveRoute()){
        this.data.edRouteName=this.data.routeName;
        this.data.edRouteNumPoints=this.data.routeNumPoints;
        this.data.edRouteLen=this.data.routeLen;
        this.data.edRouteRemain=this.data.routeRemain;
        this.data.edRouteEta=this.data.routeEta;
    }
    else {
        var edRoute=this.routeHandler.getEditingRoute();
        this.data.edRouteRemain=0
        this.data.edRouteEta=undefined;
        this.data.edRouteName=edRoute.name;
        this.data.edRouteNumPoints=edRoute.points.length;
        this.data.edRouteLen=this.routeHandler.computeLength(0,edRoute);
    }

    //now create text values
    this.formattedValues.markerEta=(this.data.markerEta)?
        this.formatter.formatTime(this.data.markerEta):"--:--:--";
    this.formattedValues.markerCourse=(this.data.markerCourse !== undefined)?this.formatter.formatDecimal(
        this.data.markerCourse,3,0):'---';
    this.formattedValues.markerDistance=(this.data.markerDistance !== undefined)?this.formatter.formatDecimal(
        this.data.markerDistance,3,1):'----';
    this.formattedValues.markerPosition=this.formatter.formatLonLats(
        this.data.markerLatlon
    );
    this.formattedValues.centerCourse=this.formatter.formatDecimal(
        this.data.centerCourse,3,0
    );
    this.formattedValues.centerDistance=this.formatter.formatDecimal(
        this.data.centerDistance,3,1
    );
    this.formattedValues.centerMarkerCourse=this.formatter.formatDecimal(
        this.data.centerMarkerCourse,3,0
    );
    this.formattedValues.centerMarkerDistance=this.formatter.formatDecimal(
        this.data.centerMarkerDistance,3,1
    );
    this.formattedValues.centerPosition=this.formatter.formatLonLats(
        this.maplatlon
    );
    this.formattedValues.routeName=this.data.routeName||"default";
    this.formattedValues.routeNumPoints=this.formatter.formatDecimal(this.data.routeNumPoints,4,0);
    this.formattedValues.routeLen=this.formatter.formatDecimal(this.data.routeLen,4,1);
    this.formattedValues.routeRemain=this.formatter.formatDecimal(this.data.routeRemain,4,1);
    this.formattedValues.routeEta=this.data.routeEta?this.formatter.formatTime(this.data.routeEta):"--:--:--";
    this.formattedValues.routeNextCourse=(this.data.routeNextCourse !== undefined)?this.formatter.formatDecimal(this.data.routeNextCourse,3,0):"---";
    this.formattedValues.routeXte=(this.data.routeXte !== undefined)?this.formatter.formatDecimal(this.data.routeXte,2,2):"---";

    this.formattedValues.edRouteName=this.data.edRouteName||"default";
    this.formattedValues.edRouteNumPoints=this.formatter.formatDecimal(this.data.edRouteNumPoints,4,0);
    this.formattedValues.edRouteLen=this.formatter.formatDecimal(this.data.edRouteLen,4,1);
    this.formattedValues.edRouteRemain=this.formatter.formatDecimal(this.data.edRouteRemain,4,1);
    this.formattedValues.edRouteEta=this.data.edRouteEta?this.formatter.formatTime(this.data.edRouteEta):"--:--:--";
};


/**
 * get the current map center (lon/lat)
 * @returns {avnav.nav.navdata.Point}
 */
avnav.nav.NavObject.prototype.getMapCenter=function(){
    return this.maplatlon;
};

/**
 * get the center for AIS queries
 * @returns {avnav.nav.navdata.Point|avnav.nav.NavObject.maplatlon|*}
 */
avnav.nav.NavObject.prototype.getAisCenter=function(){
    if (this.aisMode == avnav.nav.AisCenterMode.NONE) return undefined;
    if (this.aisMode == avnav.nav.AisCenterMode.GPS) {
        var data=this.gpsdata.getGpsData();
        if (data.valid) return data;
        return undefined;
    }
    return this.maplatlon;
};

/**
 * set the mode for the AIS query
 * @param {avnav.nav.AisCenterMode} mode
 */
avnav.nav.NavObject.prototype.setAisCenterMode=function(mode){
    this.aisMode=mode;
};
/**
 * @private
 * @param name
 * @returns {*}
 */
avnav.nav.NavObject.prototype.getFormattedNavValue=function(name){
    return this.formattedValues[name];
};


/**
 * get the raw data of the underlying object
 * @param {avnav.nav.NavEventType} type
 */
avnav.nav.NavObject.prototype.getRawData=function(type){
    if (type == avnav.nav.NavEventType.GPS) return this.gpsdata.getGpsData();
    if (type == avnav.nav.NavEventType.NAV) return this.data;
    if (type == avnav.nav.NavEventType.TRACK) return this.trackHandler.getTrackData();
    if (type == avnav.nav.NavEventType.AIS) return this.aisHandler.getAisData();
    if (type == avnav.nav.NavEventType.ROUTE) return this.routeHandler.getRouteData();
    if (type == avnav.nav.NavEventType.BARO) {  // bd
        return this.barodata.getBaroData()
    }
    return undefined;
};
/**
 * get the value of a display item
 * @param {string} name
 * @returns {string}
 */
avnav.nav.NavObject.prototype.getValue=function(name){
    var handler=this.valueMap[name];
    if(handler) return handler.provider.call(handler.context,name);
    return "undef";
};
/**
 * get a list of known display names
 */
avnav.nav.NavObject.prototype.getValueNames=function(){
    var rt=[];
    for (var k in this.valueMap){
        rt.push(k);
    }
    return rt;
};
/**
 * get the AIS data handler
 * @returns {avnav.nav.AisData|*}
 */
avnav.nav.NavObject.prototype.getAisData=function(){
    return this.aisHandler;
};
/**
 * called back from gpshandler
 */
avnav.nav.NavObject.prototype.gpsEvent=function(){
    this.computeValues();
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE,new avnav.nav.NavEvent (
        avnav.nav.NavEventType.GPS,
        this.getValueNames(),
        avnav.nav.NavEventSource.NAV,
        this
    ));
};

/**
 * called back from trackhandler
 */
avnav.nav.NavObject.prototype.trackEvent=function(){
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE,new avnav.nav.NavEvent (
        avnav.nav.NavEventType.TRACK,
        [],
        avnav.nav.NavEventSource.NAV,
        this
    ));
};

/**
 * called back from aishandler
 */
avnav.nav.NavObject.prototype.aisEvent=function(){
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE,new avnav.nav.NavEvent (
        avnav.nav.NavEventType.AIS,
        [],
        avnav.nav.NavEventSource.NAV,
        this
    ));
};

/**
 * called back from routeHandler
 */
avnav.nav.NavObject.prototype.routeEvent=function(){
    this.computeValues();
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE,new avnav.nav.NavEvent (
        avnav.nav.NavEventType.ROUTE,
        [],
        avnav.nav.NavEventSource.NAV,
        this
    ));
    this.triggerUpdateEvent(avnav.nav.NavEventSource.NAV);
};

avnav.nav.NavObject.prototype.baroEvent = function() { //bd
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE, new avnav.nav.NavEvent(avnav.nav.NavEventType.BARO, this.getValueNames(), avnav.nav.NavEventSource.NAV, this))
};
avnav.nav.NavObject.prototype.barographEvent = function(data) { //bd

    var dim = this.propertyHandler.getValueByName("style.nightMode");
    if (dim != 100) {
        // night theme
        Highcharts.createElement('link', {
            href: '//fonts.googleapis.com/css?family=Unica+One',
            rel: 'stylesheet',
            type: 'text/css'
        }, null, document.getElementsByTagName('head')[0]);

        Highcharts.theme = {
            colors: ["#2b908f", "#90ee7e", "#f45b5b", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
                "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
            chart: {
                backgroundColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
                    stops: [
                        [0, '#2a2a2b'],
                        [1, '#3e3e40']
                    ]
                },
                style: {
                    fontFamily: "'Unica One', sans-serif"
                },
                plotBorderColor: '#606063'
            },
            title: {
                style: {
                    color: '#E0E0E3',
                    textTransform: 'uppercase',
                    fontSize: '20px'
                }
            },
            subtitle: {
                style: {
                    color: '#E0E0E3',
                    textTransform: 'uppercase'
                }
            },
            xAxis: {
                gridLineColor: '#707073',
                labels: {
                    style: {
                        color: '#E0E0E3'
                    }
                },
                lineColor: '#707073',
                minorGridLineColor: '#505053',
                tickColor: '#707073',
                title: {
                    style: {
                        color: '#A0A0A3'

                    }
                }
            },
            yAxis: {
                gridLineColor: '#707073',
                labels: {
                    style: {
                        color: '#E0E0E3'
                    }
                },
                lineColor: '#707073',
                minorGridLineColor: '#505053',
                tickColor: '#707073',
                tickWidth: 1,
                title: {
                    style: {
                        color: '#A0A0A3'
                    }
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                style: {
                    color: '#F0F0F0'
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        color: '#B0B0B3'
                    },
                    marker: {
                        lineColor: '#333'
                    }
                },
                boxplot: {
                    fillColor: '#505053'
                },
                candlestick: {
                    lineColor: 'white'
                },
                errorbar: {
                    color: 'white'
                }
            },
            legend: {
                itemStyle: {
                    color: '#E0E0E3'
                },
                itemHoverStyle: {
                    color: '#FFF'
                },
                itemHiddenStyle: {
                    color: '#606063'
                }
            },
            credits: {
                style: {
                    color: '#666'
                }
            },
            labels: {
                style: {
                    color: '#707073'
                }
            },

            drilldown: {
                activeAxisLabelStyle: {
                    color: '#F0F0F3'
                },
                activeDataLabelStyle: {
                    color: '#F0F0F3'
                }
            },

            navigation: {
                buttonOptions: {
                    symbolStroke: '#DDDDDD',
                    theme: {
                        fill: '#505053'
                    }
                }
            },

            // scroll charts
            rangeSelector: {
                buttonTheme: {
                    fill: '#505053',
                    stroke: '#000000',
                    style: {
                        color: '#CCC'
                    },
                    states: {
                        hover: {
                            fill: '#707073',
                            stroke: '#000000',
                            style: {
                                color: 'white'
                            }
                        },
                        select: {
                            fill: '#000003',
                            stroke: '#000000',
                            style: {
                                color: 'white'
                            }
                        }
                    }
                },
                inputBoxBorderColor: '#505053',
                inputStyle: {
                    backgroundColor: '#333',
                    color: 'silver'
                },
                labelStyle: {
                    color: 'silver'
                }
            },

            navigator: {
                handles: {
                    backgroundColor: '#666',
                    borderColor: '#AAA'
                },
                outlineColor: '#CCC',
                maskFill: 'rgba(255,255,255,0.1)',
                series: {
                    color: '#7798BF',
                    lineColor: '#A6C7ED'
                },
                xAxis: {
                    gridLineColor: '#505053'
                }
            },

            scrollbar: {
                barBackgroundColor: '#808083',
                barBorderColor: '#808083',
                buttonArrowColor: '#CCC',
                buttonBackgroundColor: '#606063',
                buttonBorderColor: '#606063',
                rifleColor: '#FFF',
                trackBackgroundColor: '#404043',
                trackBorderColor: '#404043'
            },

            // special colors for some of the
            legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
            background2: '#505053',
            dataLabelsColor: '#B0B0B3',
            textColor: '#C0C0C0',
            contrastTextColor: '#F0F0F3',
            maskColor: 'rgba(255,255,255,0.3)'
        };

        // Apply the theme
        Highcharts.setOptions(Highcharts.theme);
    } else {
        var defaultOptions = Highcharts.getOptions();
        for (var prop in defaultOptions) {
            if (typeof defaultOptions[prop] != 'function') delete defaultOptions[prop];
        }
        Highcharts.setOptions(HCDefaults);
    }
    var ontick = false;
    var min = 900;
    var max = 1080;
    if (this.data.baroMagnified) {
        min = 1080;
        max = 900;
        ontick = true;
        var hist = this.barodata.barographdata.hist;
        var i = hist.length
        while (i--) {
            if (hist[i] > max) max = hist[i];
            if (hist[i] < min) min = hist[i];
        }
    }
    $('#avi_baro_page_container').highcharts({
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'Barometric pressure in hectoPascal'
        },
        subtitle: {
            text: document.ontouchstart === undefined ?
                'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 36,
            gridLineWidth: 0.2,
            gridLineColor: '#197F07'
        },
        yAxis: {
            title: {
                text: 'Pressure'
            },
            min: min,
            max: max,
            startOnTick: ontick,
            endOnTick: ontick,
            tickPixelInterval: 36,
            gridLineWidth: 0.2,
            gridLineColor: '#197F07'
        },
        legend: {
            enabled: false
        },
        credits: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },

        series: [{
            type: 'area',
            name: 'Pressure',
            data: data
        }],
        tooltip: {
            headerFormat: '<span style="font-size: 12px;">{point.key}</span><br/>',
            dateTimeLabelFormats: {
                millisecond: '%a, %H:%M',
                second: '%a, %H:%M',
                minute: '%a, %H:%M',
                hour: '%a, %H:%M',
                day: '%a, %e. %b',
                week: '%e. %b',
                month: '%b /%y',
                month: '%y'
            },
            valueDecimals: 2,
            valueSuffix: ' hPa'
        }
    });
};

/**
 * register the provider of a display value
 * @param {string} name
 * @param {object} providerContext
 * @param {function} provider
 */
avnav.nav.NavObject.prototype.registerValueProvider=function(name,providerContext,provider){
    this.valueMap[name]={provider:provider,context:providerContext};
};

/**
 * set the current map center position
 * @param {Array.<number>} lonlat
 */
avnav.nav.NavObject.prototype.setMapCenter=function(lonlat){
    var p=new avnav.nav.navdata.Point();
    p.fromCoord(lonlat);
    if (p.compare(this.maplatlon)) return;
    p.assign(this.maplatlon);
    this.computeValues();
    this.triggerUpdateEvent(avnav.nav.NavEventSource.MAP);
};

/**
 * get the routing handler
 * @returns {avnav.nav.RouteData|*}
 */
avnav.nav.NavObject.prototype.getRoutingData=function(){
    return this.routeHandler;
};

avnav.nav.NavObject.prototype.resetTrack=function(){
    return this.trackHandler.resetTrack();
};

/**
 * send out an update event
 * @param {avnav.nav.NavEventSource} source
 */
avnav.nav.NavObject.prototype.triggerUpdateEvent=function(source){
    $(document).trigger(avnav.nav.NavEvent.EVENT_TYPE,
        new avnav.nav.NavEvent(avnav.nav.NavEventType.GPS,this.getValueNames(),source,this)
    );
};




