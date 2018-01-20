var Metrix = require("./index.js");

var metrix = new Metrix("udp://127.0.0.1:8094",true);


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