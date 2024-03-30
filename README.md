# Telegraf Metrix-Node

Supports telegraf line protocol and sends metrics over udp (for now). Line protocol uses nanosecond precision timestamp. You can add nanosecond timestamp as last parameter optionally since the version 1.1.4. If you omit this timestamp telegraf will add it based on its local time to your data. Sometimes you may want to add this timestamp to send data from the past

I preper UDP protocol because its fault-tolerant, I do not want to block my operations with TCP which has a handshake and many checks

Planning to support TCP by next versions. Also maintaining PHP version of metrix

## Install

npm install telegraf-metrix-node --save

## Telegraf Configuration
Enable [[inputs.socket_listener]] inside telegraf.conf with a service address like udp://:8094 to enable UDP from 0.0.0.0. You may also choose to activate UDP for 127.0.0.1 which is recommended way

## Usage
- default target is udp://127.0.0.1:8094
- scheme must be defined if default value is not taken
- target structure is scheme://host:port
- measurement name: ^[a-zA-Z0-9_, .-]+$
- tag keys, tag values: ^[a-zA-Z0-9_,. =]+$
- tags are optional
- fields are optional
- time will be stamped from telegraf (for now)

```
var Metrix = require("telegraf-metrix-node");
var metrix = new Metrix("udp://127.0.0.1:8094",'myapp'); 

function tick() {
    setTimeout(()=>{
        console.log("Sending >",
        metrix.send("Random Generator",{type:"random"},{
            'rand 1..100':Math.random()*100,
            'rand 1..500':Math.random()*500,
        }));
        tick();
    },1000);
}

tick();
```


## Pulse Feature
beta pulse feature is implemented. Pulse will send heartbeats to telegraf, this way you can detect if an app or part of an app has stopped working. You can either use .pulse() method or .pulseAuto() to make it automatic. Please do not call pulseAuto more then 10 times. .pulse() is designed to be called inside your loops to send manual signals. Pulse supports throttling to avoid sending heartbeats more then necessary. Default value is 1000 (ms) which will send the HB only every 1000ms even though you send it from a fast loop.

I recommend using AppName from the constructor `constructor(target="udp://127.0.0.1", appName=false, appVersion=false, debug = false)` which will be attached to the heartbeat automatically. If you do not specify appName it will try to find corresponding package.json to the host app but most of the time it might fail.

```
metrix.pulseAuto('myappPulse',1500);
while(true) {
    metrix.pulse('mainloop',2000);
}
```

## Line protocol details
https://docs.influxdata.com/influxdb/v0.9/write_protocols/line/

[key] [tags] [fields] [timestamp]

```
Fields are key-value metrics associated with the measurement. Every line must have at least one field. Multiple fields must be separated with commas and not spaces.

Field keys are always strings and follow the same syntactical rules as described above for tag keys and values. Field values can be one of four types. The first value written for a given field on a given measurement defines the type of that field for all series under that measurement.

Integers are numeric values that do not include a decimal and are followed by a trailing i when inserted (e.g. 1i, 345i, 2015i, -10i). Note that all values must have a trailing i. If they do not they will be written as floats.

Floats are numeric values that are not followed by a trailing i. (e.g. 1, 1.0, -3.14, 6.0e5, 10).

Boolean values indicate true or false. Valid boolean strings are (t, T, true, True, TRUE, f, F, false, False and FALSE).

Strings are text values. All string values must be surrounded in double-quotes ". If the string contains a double-quote, it must be escaped with a backslash, e.g. \".
```