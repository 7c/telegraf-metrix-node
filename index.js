const url = require("url");
const dgram = require("dgram");
// const buffer = require('buffer');
const dgramClient = dgram.createSocket("udp4");

class Metrix {
  constructor(target="udp://127.0.0.1", debug = false) {
    var parsed = url.parse(target);
    if (!parsed.protocol || parsed.protocol !== "udp:")
      throw new Error("Invalid protocol by target");
    parsed.host = parsed.host || "127.0.0.1";
    parsed.port = parsed.port || 8094;
    this.target = parsed;
    this.debug = debug;
    // console.log(this.target);
  }

  l(...args) {
    if (this.debug) console.log(...args);
  }

  line(measurement, tags = null, fields = null) {
    // this.l(measurement,tags,fields)
    // console.log(">",typeof fields,fields);
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
        // console.log(fields);
        if (typeof fields==='number' || typeof fields==='string') fields={value:fields};
        // console.log(fields);
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
            // console.log(tmpFields);
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

  send(measurement, tags, fields) {
    var l = this.line(measurement, tags, fields);
    if (l!==false) {
        dgramClient.send(Buffer.from(l),this.target.port,this.target.host,(err)=>{
        // lets ignore all kind of errors to be more resilient
        });
        
    }
    return l;
  }
}

module.exports = Metrix;
