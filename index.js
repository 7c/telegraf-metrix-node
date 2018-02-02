const path = require('path');
const fs = require('fs');
const os = require('os');
const url = require("url");
const dgram = require("dgram");
// const buffer = require('buffer');
const dgramClient = dgram.createSocket("udp4");

class Metrix {
  constructor(target="udp://127.0.0.1", appName=false, appVersion=false, debug = false) {
    var parsed = url.parse(target);    
    if (!parsed.protocol || parsed.protocol !== "udp:")
      throw new Error("Invalid protocol by target");
    parsed.host = parsed.hostname || "127.0.0.1";
    parsed.port = parsed.port || 8094;
    this.target = parsed;
    this.debug = debug;
    this.package = false;
    this.appName = appName;
    this.appVersion = appVersion;
    this.pulseTimes={};
    if (fs.existsSync(process.cwd()))
    {
      // try to find package.json file
      var pj = path.join(process.cwd(),'package.json');
      if (fs.existsSync(pj)) this.package = require(pj);
    }
    
  }

  l(...args) {
    if (this.debug) console.log(...args);
  }

  pulseAuto(section,timeout=1000) {
    setInterval(()=>{
      this.pulse(section,timeout);
    },timeout)
  }

  pulse(section,throttle=1000) {
    if (!this.pulseTimes[section] || Date.now()>this.pulseTimes[section]+throttle)
    {
      var tags = {section, host:os.hostname()};
      if (this.package) {
        tags.appName = this.package.name;
        tags.appVersion= this.package.version;
      }

      if (this.appName) tags.appName = this.appName;
      if (this.appVersion) tags.appVersion = this.appVersion;

      this.pulseTimes[section]=Date.now();
      return this.send('pulse',tags,{heartbeat:1});
    }
    return true;
  }

  send(measurement, tags, fields) {
    var l = this.line(measurement, tags, fields);
    if (l!==false) {
        dgramClient.send(Buffer.from(l),this.target.port,this.target.host,(err)=>{
        // lets ignore all kind of errors to be more resilient
        });
        
    }
    return l;
  }


  line(measurement, tags = null, fields = null) {
    // measurement must be a string
    if (measurement && measurement.search(/[^a-zA-Z0-9_, .-]/) > -1) {
      this.l("invalid measurement", measurement);
      return false;
    }
    var tagsPart = "";

    // check tags & compose the line
    // tags shall be {} or null
    if (typeof tags !== "object") return false;
    if (tags) {
      for (var ky in tags) {
        // $k = preg_replace('/(,| )/',"\\\\".'${1}',$k);
        if (ky.search(/[^a-zA-Z0-9_, .=]/) > -1) {
          this.l("invalid tag key", ky);
          return false;
        }
        var ky1 = ky.replace(/(,| |=)/g, m => "\\" + m);
        var vl1 = tags[ky].toString().replace(/(,| )/g, m => "\\" + m);
        tagsPart += "," + ky1 + "=" + vl1;
      }
    }


    
    // check fields
    var tmpFields = [];
    var fieldsPart = "";
    if (fields!==null)
    {
        if (typeof fields==='number' || typeof fields==='string') fields={value:fields};
        if (fields && typeof fields === "object") {
        for (var ky in fields) {
            if (ky.search(/[^a-zA-Z0-9_, .=]/) > -1) {
            this.l("invalid field key", ky);
            return false;
            }
            var ky1 = ky.replace(/(,| |=)/g, m => "\\" + m);
            var vl1 = fields[ky];
            // field value will be escaped based on its type
            if (typeof vl1 === "bool")
            tmpFields.push(ky1 + "=" + vl1 ? "true" : false);
            else if (typeof vl1 === "string")
            tmpFields.push(
                ky1 + '="' + vl1.replace(/(\")/g, m => "\\" + m) + '"'
            );
            else if (typeof vl1 === "number")
            tmpFields.push(ky1 + "=" + vl1);
            else throw new Error("Unknown field value type by field", ky);
        }
        } else throw new Error("Unknown fields type",typeof fields);
        // } else if (typeof fields === "number") tmpFields.push("value="+fields);
        //   else if (typeof fields === "string") tmpFields.push("value=\"+fields);
        if (tmpFields.length>0) fieldsPart=" "+tmpFields.join(",");
    }

    // lets escape , and whitespace
    measurement = measurement.replace(/(,| )/g, m => "\\" + m);

    return measurement+tagsPart+fieldsPart;
  }


}

module.exports = Metrix;
