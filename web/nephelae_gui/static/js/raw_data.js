// Activate current menu in nav
$('#nav_raw_data').addClass('active');

// Chart style
var chart_height = 250;
var lm = 70;
var rm = 20;
var bm = 20;
var tm = 10;

var config = {
    responsive: true,
    displaylogo: false,
    displayModeBar: false,
};

// Parameters
var parameters = {
    trail_length: parseInt(Cookies.get('trail_length')), // seconds
    streaming: true,
    socket: null,
    uav_color: {},
    start_buff: 1,
    end_buff: 100
}

$(document).ready(() => {
    setupGUI();
});

function setupGUI(){

    gui = new dat.GUI({ autoplace: false });
    $('#gui_container').html(gui.domElement);

    var f1 = gui.addFolder('Real-Time');

    f1.add(parameters, 'trail_length', 10, 2000).step(10).name("Log length (s)").onFinishChange(updateData);

    var f2 = gui.addFolder('History');

    f2.add(parameters, 'start_buff').name("Start Buffer").onChange(updateData);
    f2.add(parameters, 'end_buff').name("End Buffer").onChange(updateData);
    fieldsBehavior(parameters.streaming, f1, f2);

    var f3 = gui.addFolder('UAVs');
    var f4 = gui.addFolder('Variables');

    $.getJSON('/discover/', (response) => {

        parameters['uavs'] = {};
        parameters['variables'] = {};

        for (var uav_id in response.uavs){
            parameters['uavs'][uav_id] = true;
            parameters['uav_color'][uav_id] = response.uavs[uav_id].gui_color;
            f3.add(parameters['uavs'], uav_id).name('UAV ' + uav_id).onChange(updateData);
        }

        for (var tag of response.sample_tags){
            parameters['variables'][tag] = true;
            f4.add(parameters['variables'], tag).name(tag).onChange((state) => toggleChart(state));
        }

        gui.add(parameters, 'streaming').name("Streaming").onChange(function(state) {
            fieldsBehavior(state, f1, f2);
            toggleStreaming(state);
        });

        // Draw charts once GUI is initialized
        toggleChart(true);
        updateData();
    });
}

function updateData(){

    var data = {};
    var query = makeQuery();
    $.getJSON('update/?' + query, (response) => {

        // Parse server response
        for (var uav_id in response.data){

            for (var variable_name in response.data[uav_id]){

                var positions = response.data[uav_id][variable_name]['positions'];
                var timestamps = [];

                // Compute timestamps from path
                for(var i = 0; i < positions.length ; i++){
                    timestamps.push(positions[i][0]);
                }

                var new_data = {
                    type: 'line',
                    name: uav_id,
                    x: timestamps,
                    y: response.data[uav_id][variable_name]['values'],
                    mode: 'line',
                    line: {
                        width: 1,
                        shape: 'linear',
                        color: parameters.uav_color[uav_id],
                    },
                    meta: [uav_id],
                    hovertemplate:
                    'Time : %{x:.1f}s <br>' +
                    'Value : %{y:.2f} <br>' +
                    '<extra>UAV %{meta[0]}</extra>',
                    hoverlabel: {
                        bgcolor: 'black',
                        bordercolor: 'black',
                        font: {family: 'Roboto', si1ze: '15', color: 'white'},
                        align: 'left',
                    }
                };
                variable_name in data ? data[variable_name].push(new_data) : data[variable_name] = [new_data];
            }
        }

        // Update charts
        updateCharts(data);

        if (parameters.streaming && parameters.socket == null) {
            parameters.socket = new WebSocket('ws://' + 
                window.location.host + '/ws/sensor/raw_data/');
            parameters.socket.onmessage = (e) => handleMessage(JSON.parse(e.data));
        }

        removeLoader();
    });
}

function updateCharts(data){
    for (variable of getSelectedElements(parameters.variables)){
        Plotly.react(variable, data[variable], printLayout(variable), config);
    }
}

function toggleStreaming(state){
    if (!state){
        parameters.socket.close();
        parameters.socket = null;
    }  
    updateData();
}

function toggleChart(state){
    // not 100% sure why this works
    for (variable in parameters.variables){
        if(state == parameters.variables[variable]){
            if (state){
                $('#charts').append(
                    '<div id="container_'+ variable + '" class="row">' +
                    '<div class="col s12">' +
                    '<div id=' + variable + '></div>' +
                    '</div>' +
                    '</div>'
                );
                updateData();
            } else {
                $('#container_' + variable).find('*').addBack().remove();
            }
        }
    }
}

function printLayout(variable){
    return layout = {
        yaxis: { title: createLayout(variable)['title'] },
        height: chart_height,
        margin: { l: lm, r: rm, b: bm, t: tm },
        hovermode: 'closest',
        showlegend: false,
        uirevision: true,
    };
}

function handleMessage(messages){
    //Reads the list of messages
    for (var message of messages){
        // if variable is selected to be visible
        if(parameters.variables[message.variable_name]){

            // identify chart DOM element and compute the trace's index
            var chart = $('#'+ message.variable_name);
            var trace_index = getTraceIndexByName(chart, message.uav_id);

            // if such a trace exists
            if (trace_index > -1){

                // update data
                var document_data = document.getElementById(message.variable_name).data;
                for(var i = 0; i < document_data.length; i++){
                    var first_time = document_data[i].x[0];
                    while (message.position[0]-first_time > parameters.trail_length){
                        document_data[i].x.shift();
                        document_data[i].y.shift();
                        first_time = document_data[i].x[0];
                    }
                }
                var update = {
                    x:  [[message.position[0]]],

                    y: [[message.data[0]]]
                };
                Plotly.extendTraces(message.variable_name, update, [trace_index]);
                // The following operation is very expensive, uncomment it only if you need fixed range streaming plot
            } else {
                // if trace index is not found, reload the page
                //location.reload(); -> something has to be done
            }
            // if variable does not exist, re-setup the page
        } else if (!(message.variable_name in parameters.variables)) {
            setupGUI();
        }
    }
}

function getTraceIndexByName(chart, name){
    // find the index of the first trace in the chart with name 'name'
    return chart[0].data.findIndex(element => element.name == name);
}

function makeQuery(){
    return (parameters.streaming 
        ? 
        $.param({start: parameters.trail_length,
            variables: getSelectedElements(parameters.variables),
            uav_id: getSelectedElements(parameters.uavs)})
        :
        $.param({start: -parameters.start_buff,
            variables: getSelectedElements(parameters.variables),
            uav_id: getSelectedElements(parameters.uavs),
            step: 1,
            end: parameters.end_buff}));
}

function fieldsBehavior(state, f1, f2){
    if (state){
        f1.show();
        f1.open();
        f2.hide();
    } else {
        f1.hide();
        f2.show();
        f2.open();
    }
}
