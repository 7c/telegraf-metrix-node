import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as dgram from "dgram";

const dgramClient = dgram.createSocket("udp4");

interface Target {
  host: string;
  port: number;
}

interface PackageInfo {
  name?: string;
  version?: string;
  [key: string]: unknown;
}

type FieldPrimitive = number | string | boolean;
type Tags = Record<string, unknown> | null;
type Fields = Record<string, FieldPrimitive> | number | string | null;
type Timestamp = number | string | null;

class Metrix {
  target: Target;
  debug: boolean;
  package: PackageInfo | false;
  appName: string | false;
  appVersion: string | false;
  pulseTimes: Record<string, number>;

  constructor(
    telegrafHost: string = "udp://127.0.0.1",
    appName: string | false = false,
    appVersion: string | false = false,
    debug: boolean = false
  ) {
    const parsed = new URL(telegrafHost);
    if (parsed.protocol !== "udp:")
      throw new Error("Invalid protocol by target");

    this.target = {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number(parsed.port) : 8094,
    };
    this.debug = debug;
    this.package = false;
    this.appName = appName;
    this.appVersion = appVersion;
    this.pulseTimes = {};
    if (fs.existsSync(process.cwd())) {
      // try to find package.json file
      const pj = path.join(process.cwd(), "package.json");
      if (fs.existsSync(pj)) this.package = require(pj) as PackageInfo;
    }

    // we intentionally do not bind the udp socket so we do not receive responses
  }

  l(...args: unknown[]): void {
    if (this.debug) console.log(...args);
  }

  pulseAuto(section: string, timeout: number = 1000): void {
    setInterval(() => {
      this.pulse(section, timeout);
    }, timeout);
  }

  pulse(section: string, throttle: number = 1000): string | boolean {
    if (
      !this.pulseTimes[section] ||
      Date.now() > this.pulseTimes[section] + throttle
    ) {
      const tags: Record<string, unknown> = { section, host: os.hostname() };
      if (this.package) {
        tags.appName = this.package.name;
        tags.appVersion = this.package.version;
      }

      if (this.appName) tags.appName = this.appName;
      if (this.appVersion) tags.appVersion = this.appVersion;

      this.pulseTimes[section] = Date.now();
      return this.send("pulse", tags, { heartbeat: 1 });
    }
    return true;
  }

  send(
    measurement: string,
    tags?: Tags,
    fields?: Fields,
    timestamp: Timestamp = null
  ): string | false {
    const l = this.line(measurement, tags, fields, timestamp);
    if (l !== false) {
      dgramClient.send(
        Buffer.from(l),
        this.target.port,
        this.target.host,
        () => {
          // lets ignore all kind of errors to be more resilient
        }
      );
    }
    return l;
  }

  line(
    measurement: string,
    tags: Tags = null,
    fields: Fields = null,
    timestamp: Timestamp = null
  ): string | false {
    // measurement must be a string
    if (measurement && measurement.search(/[^a-zA-Z0-9_, .-]/) > -1) {
      this.l("invalid measurement", measurement);
      return false;
    }
    let tagsPart = "";

    // check tags & compose the line
    // tags shall be {} or null
    if (typeof tags !== "object") return false;
    if (tags) {
      for (const ky in tags) {
        if (ky.search(/[^a-zA-Z0-9_, .=]/) > -1) {
          this.l("invalid tag key", ky);
          return false;
        }
        if (!tags[ky]) continue;
        const ky1 = ky.replace(/(,| |=)/g, (m) => "\\" + m);
        const vl1 = String(tags[ky]).replace(/(,| )/g, (m) => "\\" + m);
        tagsPart += "," + ky1 + "=" + vl1;
      }
    }

    // check fields
    const tmpFields: string[] = [];
    let fieldsPart = "";
    if (fields !== null && fields !== undefined) {
      let fieldsObj: Record<string, FieldPrimitive>;
      if (typeof fields === "number" || typeof fields === "string") {
        fieldsObj = { value: fields };
      } else if (typeof fields === "object") {
        fieldsObj = fields;
      } else {
        throw new Error("Unknown fields type " + typeof fields);
      }

      for (const ky in fieldsObj) {
        if (ky.search(/[^a-zA-Z0-9_, .=]/) > -1) {
          this.l("invalid field key", ky);
          return false;
        }
        const ky1 = ky.replace(/(,| |=)/g, (m) => "\\" + m);
        const vl1 = fieldsObj[ky];
        // field value will be escaped based on its type
        if (typeof vl1 === "boolean")
          tmpFields.push(ky1 + "=" + (vl1 ? "true" : "false"));
        else if (typeof vl1 === "string")
          tmpFields.push(ky1 + '="' + vl1.replace(/(")/g, (m) => "\\" + m) + '"');
        else if (typeof vl1 === "number") tmpFields.push(ky1 + "=" + vl1);
        else throw new Error("Unknown field value type by field " + ky);
      }
      if (tmpFields.length > 0) fieldsPart = " " + tmpFields.join(",");
    }

    // lets escape , and whitespace
    measurement = measurement.replace(/(,| )/g, (m) => "\\" + m);

    return (
      measurement +
      tagsPart +
      fieldsPart +
      (timestamp !== null ? " " + timestamp : "")
    );
  }
}

export = Metrix;
