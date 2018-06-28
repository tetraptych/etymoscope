var API_ROOT = "http://localhost"

var width = 900
var height = 900
var color = d3.scaleOrdinal(d3.schemeCategory20);

var form = d3.select("form")
    .on("submit", function () { fetchAndDraw(this.wordInput.value, 2) });

/*
var tmp_graph = {
  "nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1}
  ],
  "links": [
    {"source": "Napoleon", "target": "Myriel", "value": 1}
  ]
}

var tmp_graph2 = {
  "nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1}
  ],
  "links": []
}

function proxy_request(name) {
  if (name == 'tmp_graph') {
    result = tmp_graph
  }
  else {
    result = tmp_graph2
  }
  return result
}
*/

function requestGraph(word, depth) {
  var request = new XMLHttpRequest();
  var rootPath = API_ROOT + ":8081/api/"
  var uri = "?word=" + word + "&depth=" + depth; 
  console.log(rootPath + uri)
  request.open("GET", rootPath + uri, false);
  request.send();
  return JSON.parse(request.responseText)
}

function draw(graph){
  d3.select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

  var svg = d3.select("svg")


  var simulation = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink()
        .id(function(d) { return d.id; })
        .links(graph.links)
        .distance(15)
        .strength(1.0)
      )
      .force("charge", d3.forceManyBody()
        .strength(-800)
        .distanceMax(350)
      )
      .force("collide", d3.forceCollide()
        .strength(1.0)
        .radius(8)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
  ;

  var activeNodes = []

  var link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", function(d) { return 4; });

  var node = svg.selectAll(".node")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "node")
    .on("click", setActive);
  
  node.append("circle")
    .attr("r", function (d) { return 6; })
    .attr("fill", function(d) { return color(d.group); })

  node.append("title")
    .text(function(d) { return d.word; });

  node.append("text")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(function(d) { return d.word });

  simulation
    .nodes(graph.nodes)
    .on("tick", ticked)

  /*
  simulation.force("link")
    .links(graph.links);
  */

  function ticked() {
    link
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  }

  function setActive(d, i) {
    activeNodes.push(d3.select(this).node())
    d3.select(this).select("circle").transition()
      .duration(750)
      .attr("r", 16)
      .style("fill", "orange")
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
  }
}

function fetchAndDraw(word, depth) {
  d3.event.preventDefault()
  var graph = requestGraph(word, depth)
  d3.select("svg").remove()
  draw(graph)
}

fetchAndDraw("", 1);