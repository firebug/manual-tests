/*
    SvgSnow Library
    Copyright(c) 2006, Jeff Schiller, CodeDread
    http://blog.codedread.com/

    Description
    ===========
    This script gives the effect of snow falling (and accumulating) within SVG images.  The script
    allows you to customize the behavior to some extent (# of snowflakes, speed, bounding box of
    snow falling).  To use in your SVG images, include this script in a <script> element and
    call the initSnow() function whenever you want it to start (generally in the onload event).

    The initSnow() function declaration below has complete instructions.  This script is just a toy,
    really but I thought I'd expand it into a more generic library.

    Tested Configurations
    =====================
    + tested and works in IE6 + ASV (3 and 6)
    + tested and works in Firefox 1.5 (native SVG)
    + tested and works in Opera 9 TP1 (native SVG)

    Thanks To
    =========
    - Rob Russell (http://rr.latenightpc.com/wp/) for his comments, suggestions and profiling
    - Scott Schiller for his original DHTML snow library which served as an rough sort of
      inspiration: http://www.schillmania.com/projects/snowstorm/

    History
    =======
    Version  Date         Notes
    ----------------------------------------------------------------------------
      1.0    2006-01-04   Initial version

    Disclaimer and License
    ======================
    This script is free to use and/or modify, but please provide credit and (where applicable)
    a link to http://www.codedread.com/ would be nice.

    TO DO:
    ======
    1) Future versions might use a nicer masking technique instead of constantly checking each
       snowflake's position to determine if it's in the bounding box and then toggling its "display"
       property.  This should improve performance but would otherwise be transparent to users.
    2) Future versions might provide even more optional parameters to the initSnow() method (see
       the code for likely candidates).
    3) Future versions may figure out a way to make the accumulating snow pile up in a more level
       fashion.
    4) Future versions may use DOM attributes natively (this is dependent upon deployed implementations
       like ASV supporting all SVGPathElement attributes, which it currently does not).  This should
       also improve performance avoiding all the substring joining.

    Contact
    =======
    Email comments/suggestions/bugs to jeff at codedread dot com.
*/

// CONSTANTS
var SVGNS = "http://www.w3.org/2000/svg";
var cdSNOWFLAKEGRAD = "CodeDread.snow.snowflakegrad";
var cdSNOWFALLGRAD = "CodeDread.snow.snowfallgrad";
var cdSNOWFALLELEM = "CodeDread.snow.snowfall";
var VIEW_MARGIN = 20;
// These are now overridden in initSnow()
var MIN_X = -30;
var MAX_X = 918;
var DELTA_X = MAX_X - MIN_X;
var MIN_Y = -20;
var MAX_Y = 218;
var DELTA_Y = MAX_Y - MIN_Y;
var gLeft = 0;
var gTop = 0;
var gRight = 0;
var gBottom = 0;

// global variables

// determines whether snow accumulates
var gbAccumulateSnow = false;

// the element to add the flakes to
var gSnow = null;

// this is the array of all flakes
var flakes = new Array();

var gSnowfallElem = null;

// these are the point values (i.e. numeric values)
var snowfall = new Array();
// these are the point strings that will be joined
var snowfallStrs = new Array();

function Point(_x,_y) { this.x = _x; this.y = _y; }
Point.prototype.toString = function() { return this.x + "," + this.y; }

// Tweakable Parameters
var gSpeedFactor = 0.33;
var driftFactor = 1.5;
var driftChaos = 0.33;
var snowFallXInc = 4;
var snowFallAccumFactor = 1.0;

function SnowFlake(size)
{
    this.fSize = size;

    this.fSpeed = ((2+Math.random()*4)*this.fSize)*gSpeedFactor;
    this.fDrift = Math.random()*driftFactor - driftFactor/2.0;

    this.elem = document.createElementNS(SVGNS, "circle");
    if(this.elem) {
        this.elem.setAttributeNS(null, "stroke", "none");
        this.elem.setAttributeNS(null, "r", ""+this.fSize);
        this.elem.setAttributeNS(null, "fill-opacity", "1.0");
        this.elem.setAttributeNS(null, "fill", "url(#"+cdSNOWFLAKEGRAD+")");

        // start flake somewhere above the viewport
//        this.elem.cy.baseVal.value = MIN_Y-(Math.random()*(DELTA_Y));
//        this.elem.cx.baseVal.value = MIN_X+(Math.random()*(DELTA_X));
        this.cy = MIN_Y-(Math.random()*(DELTA_Y));
        this.cx = MIN_X+(Math.random()*(DELTA_X));
        this.elem.setAttributeNS(null, "cy", this.cy);
        this.elem.setAttributeNS(null, "cx", this.cx);

        if(gSnow) {
            gSnow.appendChild(this.elem);
        }
    }
}
SnowFlake.prototype.reset = function() {
    // set flake back to top
//    this.elem.cy.baseVal.value = MIN_Y;
//    this.elem.cx.baseVal.value = MIN_X+(Math.random()*(DELTA_X));
    this.cy = MIN_Y;
    this.cx = MIN_X+(Math.random()*(DELTA_X));
    this.elem.setAttributeNS(null, "cy", this.cy);
    this.elem.setAttributeNS(null, "cx", this.cx);

    this.fSpeed = ((2+Math.random()*4)*this.fSize)*gSpeedFactor;
    this.fDrift = driftFactor * (Math.random() - 0.5);
}

function tick()
{
    // move all flakes down by their speed
    var theFlake = null;
    var theFlakeElem = null;
    var newy = 0;
    var newx = 0;

    if(document.documentElement.suspendRedraw) {
        document.documentElement.suspendRedraw(200);
    }

    for(var flake = 0; flake < flakes.length; ++flake) {
        theFlake = flakes[flake];
        theFlakeElem = theFlake.elem;

        // update the flake's y-position
//        theFlakeElem.cy.baseVal.value += theFlake.fSpeed;
        theFlake.cy += theFlake.fSpeed;
        theFlakeElem.setAttributeNS(null, "cy", theFlake.cy);

        // one in three chances of modifying the drift
        if(Math.random() < driftChaos) {
            theFlake.fDrift += Math.random()*(driftFactor/4.0) - driftFactor/8.0;
        }

//        theFlakeElem.cx.baseVal.value += theFlake.fDrift;
        theFlake.cx += theFlake.fDrift;
        theFlakeElem.setAttributeNS(null, "cx", theFlake.cx);

        // if the cx/cy values are outside of the range, then turn off the display
        var r = parseFloat(theFlakeElem.getAttributeNS(null, "r"));
        var bOutside = ((theFlake.cx+r) < gLeft) || ((theFlake.cx-r) > gRight) ||
                        ((theFlake.cy+r) < gTop) || ((theFlake.cy-r) > gBottom);
        theFlakeElem.setAttributeNS(null, "display", (bOutside ? "none" : "inline"));

        var bResetFlake = false;
        if(gbAccumulateSnow) {
            // if a flake reaches the bottom (>=MAX_Y) then set it inactive
            // put it at top and decrement number of active flakes
            // also increment the relevant snowfall path segment
            var x = Math.round((theFlake.cx-gLeft)/snowFallXInc);
            // get the appropriate path segment
            if( x >= 0 && x < snowfall.length && theFlake.cy > snowfall[x].y )
            {
                bResetFlake = true;

                var ind = x-2;
                var accum = theFlake.fSize*snowFallAccumFactor;

                if(ind >= 0) {
                    snowfall[ind].y -= accum*0.1;
                    snowfallStrs[ind] = snowfall[ind].toString();
                }
                ++ind;
                if(ind >= 0) {
                    snowfall[ind].y -= accum*0.2;
                    snowfallStrs[ind] = snowfall[ind].toString();
                }

                ++ind;
                snowfall[ind].y -= accum*0.4;
                snowfallStrs[ind] = snowfall[ind].toString();

                ++ind;
                if(ind <= snowfall.length-1) {
                    snowfall[ind].y -= accum*0.2;
                    snowfallStrs[ind] = snowfall[ind].toString();
                }

                ++ind;
                if(ind <= snowfall.length-1) {
                    snowfall[ind].y -= accum*0.1;
                    snowfallStrs[ind] = snowfall[ind].toString();
                }

                if(x <= 2) {
                    snowfallStrs[0] = "M" + gLeft + "," + gBottom + " L" + snowfallStrs[0];
                }
                if(x >= snowfall.length-3) {
                    snowfallStrs[snowfall.length-1] += (" " + gRight + "," + gBottom + " Z");
                }
            }
        } // if we are to accumulate snow

        if(bResetFlake || theFlake.cy >= MAX_Y ) {
            theFlake.reset();
        }

    } // for each flake

    if(gbAccumulateSnow) {
        gSnowfallElem.setAttributeNS(null, "d", snowfallStrs.join(" "));
    }

    if(document.documentElement.unsuspendRedrawAll) {
        document.documentElement.unsuspendRedrawAll();
    }
}

//
// snowElemID is the ID of the <g> element to which this script will append the snowflakes. This
// script creates the snowfall path element and inserts it immediately after the snowElemID snowfall.
// This script will fail with an alert error if the element cannot be found by the given ID.
//
// x, y, width, height are coordinates that correspond to the rectangle that the snowflakes should
// center on.  These parameters must be specified (the simplest case is to use 0, 0, document width,
// document height.  If width/height are not positive, non-zero numbers, this script will fail with
// an alert error.  Note that the snowflake edges will appear slightly outside of this rectangle since
// I did not use a fancy masking technique (I just toggle the display attribute as appropriate).
//
// maxNumFlakes is a positive non-zero integer that represents the maximum number of snowflakes
// to appear in the image at any one time.  If it is not specified it defaults to 50.  If it
// specified but is not a positive, non-zero integer, this script will fail with an alert error.
//
// speedFactor is a positive, non-negative float value that indicates the speed.  The default value
// if unspecified is 0.33.  An invalid value will cause this script to fail with an alert error.
//
// bAccumulateSnow is a binary value.  A value of true indicates that the snow will accumulate in
// the SVG image.  A value of false indicates that the snow will not accumulate.  If this parameter
// is not specified, it defaults to false.
//
function initSnow( snowElemID, left, top, width, height, maxNumFlakes, speedFactor, bAccumulateSnow )
{
    gSnow = document.getElementById(snowElemID);
    if(!gSnow) { alert("Fatal Error!  Could not find element '" + snowElemID + "'"); return; }

    if( (left==null || isNaN(parseInt(left))) ||
        (top==null || isNaN(parseInt(top))) ||
        (width==null || isNaN(parseInt(width))) ||
        (height==null || isNaN(parseInt(height))) )
    {
        alert("Fatal Error!  left, top, width, height must be specified ('" + !left + "', '" + !top + "', '" + !width + "', '" + !height + "')");
        return;
    }

    if(parseInt(width) <= 0 || parseInt(height) <= 0) {
        alert("Fatal Error!  width, height must be positive and non-zero");
        return;
    }

    gLeft = parseInt(left);
    gTop = parseInt(top);
    gRight = gLeft + parseInt(width);
    gBottom = gTop + parseInt(height);

    MIN_X = gLeft - VIEW_MARGIN;
    MAX_X = gRight + VIEW_MARGIN;
    DELTA_X = MAX_X - MIN_X;

    MIN_Y = gTop - VIEW_MARGIN;
    MAX_Y = gBottom + VIEW_MARGIN;
    DELTA_Y = MAX_Y - MIN_Y;

    maxNumFlakes = maxNumFlakes || 50;
    maxNumFlakes = parseInt(maxNumFlakes);
    if( maxNumFlakes < 1 || isNaN(maxNumFlakes)) {
        alert("Fatal Error!  Could not start script with maxNumFlakes = '" + maxNumFlakes + "'");
        return;
    }

    speedFactor = speedFactor || 0.33;
    if(parseFloat(speedFactor) <= 0.0) {
        alert("Fatal Error!  Invalid speedFactor '" + speedFactor + "'");
        return;
    }
    gSpeedFactor = parseFloat(speedFactor);

    gbAccumulateSnow = bAccumulateSnow || false;
    if(gbAccumulateSnow) {
        var snowfallPath = document.createElementNS(SVGNS, "path");
        if(!snowfallPath) { alert("Fatal Error!  Could not create a svg:path element"); return; }
        snowfallPath.setAttributeNS(null, "id", cdSNOWFALLELEM);
        snowfallPath.setAttributeNS(null, "fill", "url(#" + cdSNOWFALLGRAD + ")");

        // assemble the path

        // initialize snowfall
        for(var inc = 0; inc < (gRight-gLeft)/snowFallXInc + 1; ++inc) {
            snowfall[inc] = new Point(gLeft + inc*snowFallXInc, gBottom);
            snowfallStrs[inc] = snowfall[inc].toString();
        }
        snowfallStrs[0] = "M" + gLeft + "," + gBottom + " L" + snowfallStrs[0];
        snowfallStrs[snowfall.length-1] += (" " + gRight + "," + gBottom + " Z");

        snowfallPath.setAttributeNS(null, "d", snowfallStrs.join(" "));

        gSnow.parentNode.insertBefore(snowfallPath, gSnow.nextSibling);

        gSnowfallElem = document.getElementById(cdSNOWFALLELEM);
        if(!gSnowfallElem) { alert("Fatal Error!  Could not insert the svg:path element"); return; }

    }

    var defs = document.createElementNS(SVGNS, "defs");
    if(!defs) { alert("Fatal Error!  Could not create a svg:defs element"); return; }

    // create the two gradients used here
    var snowflakegrad = document.createElementNS(SVGNS, "radialGradient");
    snowflakegrad.setAttributeNS(null, "id", cdSNOWFLAKEGRAD);
    snowflakegrad.setAttributeNS(null, "cx", "50%");
    snowflakegrad.setAttributeNS(null, "cy", "50%");
    snowflakegrad.setAttributeNS(null, "r", "50%");
    var stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "0%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "0.8");
    snowflakegrad.appendChild(stop);
    stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "80%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "0.4");
    snowflakegrad.appendChild(stop);
    stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "100%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "0.3");
    snowflakegrad.appendChild(stop);

    var snowfallgrad = document.createElementNS(SVGNS, "linearGradient");
    snowfallgrad.setAttributeNS(null, "id", cdSNOWFALLGRAD);
    snowfallgrad.setAttributeNS(null, "x1", "50%");
    snowfallgrad.setAttributeNS(null, "y1", "0%");
    snowfallgrad.setAttributeNS(null, "x2", "50%");
    snowfallgrad.setAttributeNS(null, "y2", "100%");
    var stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "0%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "0.4");
    snowfallgrad.appendChild(stop);
    stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "10%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "0.8");
    snowfallgrad.appendChild(stop);
    stop = document.createElementNS(SVGNS, "stop");
    stop.setAttributeNS(null, "offset", "100%");
    stop.setAttributeNS(null, "stop-color", "white");
    stop.setAttributeNS(null, "stop-opacity", "1.0");
    snowfallgrad.appendChild(stop);

    defs.appendChild(snowflakegrad);
    defs.appendChild(snowfallgrad);

    document.documentElement.appendChild(defs);

    // create a number of snow flakes
    for(var flake = 0; flake < maxNumFlakes; ++flake) {
        var size = 1.0;
        if(flake >= maxNumFlakes*1/5) { size += 0.5; }
        if(flake >= maxNumFlakes*2/5) { size += 0.5; }
        if(flake >= maxNumFlakes*11/20) { size += 0.5; }
        if(flake >= maxNumFlakes*7/10) { size += 0.5; }
        if(flake >= maxNumFlakes*4/5) { size += 0.5; }
        if(flake >= maxNumFlakes*9/10) { size += 0.5; }
        flakes[flake] = new SnowFlake(size);
    } // for...
    window.lastTime = 0;
    function testFirebug()
    {
        var before = new Date().getTime();
        window.dump("interval time: "+(before - window.lastTime )+"ms\n");
        tick();
        var after = new Date().getTime();
        window.dump("tick time: "+ (after - before)+"ms\n");
        window.lastTime = after;
    }
    setInterval(testFirebug, 2000);

}

