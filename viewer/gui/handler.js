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
    /** {avnav.util.PropertyHandler} */
    this.properties=properties;
    /** {avnav.nav.NavObject} */
    this.navobject=navobject;
    /** {avnav.map.MapHolder} */
    this.map=map;
    /**
     * the current chart (url,charturl)
     * @type {}
     */
    this.chart=undefined;
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
};

/**
 * get the currently active chartinfo
 * @returns {undefined|*}
 */
avnav.gui.Handler.prototype.getCurrentChart=function(){
    return this.chart;
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
}


