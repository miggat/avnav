/**
 * Created by Andreas on 27.04.2014.
 */

avnav.provide('avnav.gui.Handler');
avnav.provide('avnav.gui.PageEvent');
/**
 * the page change event
 * @param {avnav.gui.Handler} gui
 * @param {avnav.nav.NavObject} navobject
 * @param {string} oldpage
 * @param {string} newpage
 * @param {object} opt_options
 * @constructor
 * @extends {
 */
avnav.gui.PageEvent=function(gui,navobject,oldpage,newpage,opt_options){
    this.gui=gui;
    this.navobject=navobject;
    this.oldpage=oldpage;
    this.newpage=newpage;
    this.options=opt_options;
};
/**
 * the type for the page event
 * @type {string}
 * @const
 */
avnav.gui.PageEvent.EVENT_TYPE='cangepage';


/**
 *
 * @param {avnav.util.PropertyHandler} properties
 * @param {avnav.nav.NavObject} navobject
 * @param {ol.Map} map
 * @constructor
 */
avnav.gui.Handler=function(properties,navobject,map){
    /**
     * @type {avnav.util.PropertyHandler}
     * */
    this.properties=properties;
    /**
     * @type {avnav.nav.NavObject}
     * */
    this.navobject=navobject;
    /**
     * @type{avnav.map.MapHolder}
     * */
    this.map=map;
    /**
     * the current chart (url,charturl)
     * @type {}
     */
    this.chart={};
    try {
        var currentMap = localStorage.getItem(this.properties.getProperties().chartStorageName);
        if (currentMap) {
            var decoded = JSON.parse(currentMap);
            if (decoded.url){
                this.chart={
                    url: decoded.url,
                    charturl: decoded.charturl
                };
            }
        }
    }catch (e){}
    /**
     * keep the data of the last chart we have shown
     * @private
     * @type {undefined}
     */
    this.lastChownChart={};
    /**
     * @private
     * @type {avnav.util.Formatter}
     */
    this.formatter=new avnav.util.Formatter();
};


/**
 * return to a page or show a new one if returnpage is not set
 * set the returning flag in options if we return
 * @param returnpage
 * @param page
 * @param opt_options
 * @returns {boolean|*}
 */
avnav.gui.Handler.prototype.showPageOrReturn=function(returnpage,page,opt_options){
    var spage=page;
    if (returnpage !== undefined){
        if (! opt_options) opt_options={};
        opt_options.returning=true;
        spage=returnpage;
    }
    this.storeNewChart(opt_options);
    return this.showPage(spage,opt_options);
};
/**
 * show a certain page
 * @param {String} name
 * @param {Object} options options to be send as options with the event
 * @returns {boolean}
 */

avnav.gui.Handler.prototype.showPage=function(name,options){
    if (! name) return false;
    if (name == this.page) return false;
    this.storeNewChart(options);
    $('.avn_page').hide();
    $('#avi_'+name).show();
    var oldname=this.page;
    this.page=name;
    log("trigger page event");
    $(document).trigger(avnav.gui.PageEvent.EVENT_TYPE, new avnav.gui.PageEvent(
        this,
        this.navobject,
        oldname,
        name,
        options
    ));

};
/**
 * check whether we are on mobile
 * @returns {boolean}
 */
avnav.gui.Handler.prototype.isMobileBrowser=function(){
    //return true;
    return ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )||
        this.properties.getProperties().forceMobile;
    };

/**
 * check if the provided options contain a new url/charturl
 * and store this locally and in localStorage
 * @private
 * @param options
 */
avnav.gui.Handler.prototype.storeNewChart=function(options) {
    if (! options) return;
    if (options.url) {
        this.chart={
            url:options.url,
            charturl:options.charturl
        };
        try {
            var encoded = JSON.stringify({
                url: options.url,
                charturl: options.charturl
            });
            localStorage.setItem(this.properties.getProperties().chartStorageName, encoded);
        } catch (e) {
        }
    }
};
/**
 * check if the new chart url is the same like the last chown
 * @private
 * @returns {boolean}
 */
avnav.gui.Handler.prototype.chartChanged=function(){
    if (this.lastChownChart.url == this.chart.url &&
        this.lastChownChart.charturl == this.chart.charturl) return false;
    return true;
};
/**
 * check if a chart is set
 * @returns {boolean}
 */
avnav.gui.Handler.prototype.hasChart=function(){
    if (this.chart && this.chart.url) return true;
    return false;
};


/**
 * show the map handling the charturl options
 */
avnav.gui.Handler.prototype.showMap=function(mapdom){
    if (!this.chartChanged() && this.lastChownChart.mapdom == mapdom) return false;
    if (! this.chart ||  ! this.chart.url){
        alert("invalid page call - no chart selected");
        return true;
    }
    var brightness=1;
    if (this.properties.getProperties().style.nightMode < 100) {
        brightness=this.properties.getProperties().nightChartFade/100;
    }
    if (this.chartChanged()) {
        //chartbase: optional url for charts
        //list: the base url
        var chartbase = this.chart.charturl;
        var list = this.chart.url;
        if (!chartbase) {
            chartbase = list;
        }
        if (!list.match(/^http:/)) {
            if (list.match(/^\//)) {
                list = window.location.href.replace(/^([^\/:]*:\/\/[^\/]*).*/, '$1') + list;
            }
            else {
                list = window.location.href.replace(/[?].*/, '').replace(/[^\/]*$/, '') + "/" + list;
            }
        }
        var url = list + "/avnav.xml";
        var self = this;
        $.ajax({
            url: url,
            dataType: 'xml',
            cache: false,
            success: function (data) {
                self.map.initMap(mapdom, data, chartbase);
                self.map.setBrightness(brightness);
                self.lastChownChart.url = self.chart.url;
                self.lastChownChart.charturl = self.chart.charturl;
                self.lastChownChart.mapdom=mapdom;
            },
            error: function (ev) {
                alert("unable to load charts " + ev.responseText);
            }
        });
    }
    else {
        self.map.setBrightness(brightness);
        if (mapdom != this.lastChownChart.mapdom) {
            self.map.setDom(mapdom);
            this.lastChownChart.mapdom = mapdom;
        }
    }
    return true;

};

/**
 * create/upadte a list of route points
 * @param {avnav.nav.Route} route
 * @param {number} active - the id of the active WP
 * @param {string} domId - the domId of the list (jQuery)
 * @param {boolean} opt_force
 * @returns {boolean} true if rebuild
 */
avnav.gui.Handler.prototype.updateRoutePoints=function(route,active,domId,opt_force){
    var html="";
    var i;
    var self=this;
    var curlen=$(domId).find('.avn_route_info_point').length;
    var rebuild=opt_force||false;
    if (curlen != route.points.length || rebuild){
        //rebuild
        for (i=0;i<route.points.length;i++){
            html+='<div class="avn_route_info_point ';
            html+='">';
            html+='<input type="text" id="avi_route_point_'+i+'"/>';
            if (this.properties.getProperties().routeShowLL) {
                html += '<span class="avn_route_point_ll">';
            }
            else{
                html += '<span class="avn_route_point_course">';
            }
            html+='</span>';
            html+='</div>';
        }
        $(domId).html(html);
        rebuild=true;
    }
    else {
        //update
    }
    $(domId).find('.avn_route_info_point').each(function(i,el){
        var txt=route.points[i].name?route.points[i].name:i+"";
        if (i == active) {
            $(el).addClass('avn_route_info_active_point');
            if (rebuild){
                el.scrollIntoView();
            }
            else {
                //ensure element is visible
                var eltop = $(el).position().top;
                var ph = $('#avi_route_info_list').height();
                var eh = $(el).height();
                if (eltop < 0)el.scrollIntoView(true);
                if ((eltop + eh) > (ph)) el.scrollIntoView(false);
            }
        }
        else $(el).removeClass('avn_route_info_active_point');
        $(el).find('input').val(txt);
        $(el).find('.avn_route_point_ll').html(self.formatter.formatLonLats(route.points[i]));
        var courseLen="--- &#176;<br>---- nm";
        if (i>0) {
            var dst=avnav.nav.NavCompute.computeDistance(route.points[i-1],route.points[i]);
            courseLen=self.formatter.formatDecimal(dst.course,3,0)+" &#176;<br>";
            courseLen+=self.formatter.formatDecimal(dst.dtsnm,3,1)+" nm";
        }
        $(el).find('.avn_route_point_course').html(courseLen);
        var idx=i;
        if (rebuild) {
            $(el).attr('avn_idx',idx);
            if (self.isMobileBrowser()){
                $(el).find('input').attr('readonly','true');
            }
        }
    });
    return rebuild;
};
/**
 * update a waypoint popup
 * @param {} domId
 * @param {number} idx
 * @param {avnav.nav.navdata.WayPoint} currWp - the current active WP
 * @param {avnav.nav.navdata.WayPoint} prevWp - the previous WP (if any)
 */
avnav.gui.Handler.prototype.updateWpPopUp=function(domId,idx,currWp,prevWp){
    $(domId).attr('wpid',idx);
    if (currWp){
        var txt=currWp.name||idx+"";
        $(domId).find('input').val(txt);
        $(domId).find('.avn_route_point_ll').text(this.formatter.formatLonLats(currWp));
        if (prevWp){
            var dst=avnav.nav.NavCompute.computeDistance(prevWp,currWp);
            var courseLen=this.formatter.formatDecimal(dst.course,3,0)+" °, ";
            courseLen+=this.formatter.formatDecimal(dst.dtsnm,3,1)+" nm";
            $(domId).find('.avn_route_point_course').html(courseLen);
        }
        else{
            $(domId).find('.avn_route_point_course').html("");
        }
    }
    else{
        $(domId).find('input').val("");
        $(domId).find('.avn_route_point_ll').text('');
        $(domId).find('.avn_route_point_course').html("");
    }
};





