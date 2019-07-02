// Activate current menu in nav
document.getElementById('nav_preview').className = 'active';

// Define graph settings
var layout = {
            scene: {
                xaxis:{title: 'Longitude',showgrid: false}, // range: [1.2, 1.3],},
                yaxis:{title: 'Latitude', showgrid: false}, //range: [43.4, 43.5],},
                zaxis:{title: 'Altitude', range: [0, 300],}, fixedrange: true,
            },
        };

var config = { 
    responsive : true,
    displaylogo: false,
    modeBarButtonsToRemove: ['toImage'],
};

// Parameters 
var refresh_rate = 1000; //milliseconds
var isAlreadyDrawn = false;

$(document).ready(function(){
    setInterval(displayDrones, refresh_rate);
});

function displayDrones(){
    var data = [];

    $.get('update/', function(response){

        // Initialize drone array with drone_id and position marker
        for (var key in response){

            // Parse response data
            var drone_id = key;
            var drone_color = global_colors[key%global_colors.length];
            var drone_position = response[key].position;
            var drone_altitude = response[key].altitude;
            var past_altitudes = response[key].past_altitudes;
            var past_longitudes = response[key].past_longitudes;
            var past_latitudes = response[key].past_latitudes;

            // Update chart data with new dataset and line color corresponding to the icon
            var update = {
                type: 'scatter3d',
                x: past_longitudes,
                y: past_latitudes,
                z: past_altitudes,
                name: drone_id,
                mode: 'lines',
                lines:{
                    color: drone_color,
                }
            };
            data.push(update);
        }

        if(isAlreadyDrawn){
            Plotly.react('chart', data, layout, config)
        } else {
            // Launch livetracking if response contains data
            if(data.length == 0){
                alert("No drones detected, try launching the simulation and restart the server");
            } else {
                Plotly.newPlot('chart', data, layout, config);
                isAlreadyDrawn = true;
            }
        }
    });
}

/*
,

                type: 'scatter3d',
                x: drone_position[0],
                y: drone_position[1],
                z: drone_altitude,
                name: drone_id,
                mode: 'markers',
                markers:{
                    color: drone_color,
                }
                */