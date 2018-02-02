var Metrix = require("./index.js");

var metrix = new Metrix("udp://10.211.55.9:8094",true);

metrix.pulseAuto('random-generator-script',1500);

function tick() {

    setTimeout(()=>{
        console.log("Sending >",
        metrix.send("Random Generator",{type:"random"},{
            'rand 1..100':Math.random()*100,
            'rand 1..500':Math.random()*500,
        })
        );
        tick();
    },1000);
}

tick();