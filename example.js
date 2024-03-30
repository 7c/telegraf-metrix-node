var Metrix = require("./index.js");

var metrix = new Metrix("udp://10.211.55.9:8094");

metrix.pulseAuto('random-generator-script-auto',1500);

function tick() {

    console.log(metrix.pulse('random-generator-script-inside',1500));
    setTimeout(()=>{
        console.log("Sending >",
        metrix.send("Random Generator",{type:"random"},{
            'rand 1..100':Math.random()*100,
            'rand 1..500':Math.random()*500,
        })
        );
        tick();
    },500);
}

tick();