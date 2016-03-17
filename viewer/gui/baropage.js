
/*** Barometer page by bd ***/
avnav.provide("avnav.gui.Baropage");
avnav.gui.Baropage = function() {
    avnav.gui.Page.call(this, "baropage");
    this.formatter = new avnav.util.Formatter();
};
avnav.inherits(avnav.gui.Baropage, avnav.gui.Page);
avnav.gui.Baropage.prototype.showPage = function(options) {
    if (!this.gui) {
        return
    }
    this.navobject.data.baroMagnified = false;
    this.computeLayout();
    this.navobject.barodata.startGraphQuery(); // start graph here - sizing does not work if page is hidden
};
avnav.gui.Baropage.prototype.localInit = function() {
    var self = this;
    $(window).on("resize", function() {
        self.computeLayout();
    });
    $("#avi_baro_page_inner").on("click", function() {
        self.gui.showPageOrReturn(self.returnpage, "mainpage")
    });
    $(document).on(avnav.nav.NavEvent.EVENT_TYPE, function(ev, evdata) {
        var baro1h = parseFloat(self.navobject.barodata.barodata.d1h);
        self.setBaroWarning("#avi_baro_page_text_middle",Math.abs(baro1h) >= 1.5);
        var baro3h = parseFloat(self.navobject.barodata.barodata.d3h);
        self.setBaroWarning("#avi_baro_page_text_right",Math.abs(baro3h) >= 4);
    })
};
avnav.gui.Baropage.prototype.setBaroWarning = function(id, warn) {
    if (warn) {
        $(id).addClass("avn_baro_warning");
    } else {
        $(id).removeClass("avn_baro_warning");
    }
};

avnav.gui.Baropage.prototype.hidePage = function() {};
avnav.gui.Baropage.prototype.computeLayout = function() {
    var section = null;
    var numhfields = 0;
    var vheight = 0;
    this.getDiv().find("#avi_baro_page_text").each(function(i, el) {
        section = $(el);
        vheight = section.height();
    });
    if (vheight == 0) {
        return
    }
    section.find(".avn_baro_hfield").each(function(i, el) {
        numhfields++
    });
    if (numhfields == 0) {
        return
    }
    var hfieldw = 100 / numhfields;
    section.find(".avn_baro_hfield").each(function(i, el) {
        $(el).css("width", hfieldw + "%");
        var vwidth = $(el).width();
        var numhfields = 0;
        var weigthsum = 0;
        var vfieldweights = [];
        var vfieldlengths = [];
        $(el).find(".avn_baro_vfield").each(function(idx, hel) {
            numhfields++;
            vfieldweights[idx] = parseFloat($(hel).attr("avnfs"));
            weigthsum += vfieldweights[idx];
            var len = 0;
            $(hel).find(".avn_baro_value").each(function(vidx, vel) {
                len += parseFloat($(vel).attr("avnrel"))
            });
            vfieldlengths[idx] = len
        });
        $(el).find(".avn_baro_vfield").each(function(idx, hel) {
            var relheight = vfieldweights[idx] / weigthsum * 100;
            $(hel).css("height", relheight + "%");
            var fontbase = relheight * vheight * 0.65 / 100;
            var labelbase = fontbase;
            var padding = 0;
            if ((fontbase * vfieldlengths[idx]) > vwidth) {
                var nfontbase = vwidth / (vfieldlengths[idx]);
                padding = (fontbase - nfontbase) / 2;
                fontbase = nfontbase
            }
            $(hel).find(".avn_baro_value").each(function(vidx, vel) {
                $(vel).css("font-size", fontbase + "px");
                $(vel).css("padding-top", padding + "px")
            });
            $(hel).find(".avn_baro_unit").each(function(vidx, vel) {
                $(vel).css("font-size", fontbase * 0.3 + "px")
            });
            $(hel).find(".avn_baro_field_label").each(function(vidx, vel) {
                $(vel).css("font-size", labelbase * 0.4 + "px")
            })
        })
    })
};
avnav.gui.Baropage.prototype.goBack = function() {
    this.btnBaroCancel()
};
avnav.gui.Baropage.prototype.btnBaroCancel = function(button, ev) {
    log("BaroCancel clicked");
    window.clearTimeout(this.navobject.barodata.timer2);
    this.gui.showPageOrReturn(this.returnpage, "mainpage")
};
avnav.gui.Baropage.prototype.btnBaroZoomIn = function(button, ev) {
    log("BaroZoomin clicked");
    var scope = this.navobject.data.baroScope;
    scope *= 2;
    if (scope < 14)
        scope += 1;
    if (scope > 28)
        scope = 28;
    if (scope != this.navobject.data.baroScope) {
        this.navobject.data.baroScope = scope;
        this.navobject.barodata.startGraphQuery();
    }
};
avnav.gui.Baropage.prototype.btnBaroZoomOut= function(button, ev) {
    log("BaroZoomout clicked");
    var scope = this.navobject.data.baroScope;
    scope = scope >> 1;
    if (scope < 1)
        scope = 1;
    if (scope != this.navobject.data.baroScope) {
        this.navobject.data.baroScope = scope;
        this.navobject.barodata.startGraphQuery();
    }
};
avnav.gui.Baropage.prototype.btnBaroMagnify= function(button, ev) {
    log("BaroMagnifier clicked");
    this.navobject.data.baroMagnified = !this.navobject.data.baroMagnified;
    var ontick = false;
    var min = 900;
    var max = 1080;
    if (this.navobject.data.baroMagnified) {
        ontick = true;
        min = 1080;
        max = 900;
        var hist = this.navobject.barodata.barographdata.hist;
        var i = hist.length
        while (i--) {
            if (hist[i] > max) max = hist[i];
            if (hist[i] < min) min = hist[i];
        }
    }
    if (min < max) {
        var yAxis = $('#avi_baro_page_container').highcharts().yAxis[0];
        yAxis.options.min = min;
        yAxis.options.max = max;
        yAxis.options.startOnTick = ontick;
        yAxis.options.endOnTick=ontick;
        yAxis.setExtremes(min,max);
    }
    this.handleToggleButton("#avb_BaroMagnify", this.navobject.data.baroMagnified);
};
(function() {
    var page = new avnav.gui.Baropage()
}());
/*** End barometer page (bd) ***/
