var API_ROOT = "http://localhost"
var S3_BUCKET = "https://s3-us-west-2.amazonaws.com/etymoscope-public/"

var defaultWidth = 1000
var defaultHeight = 700
var minWidth = 1000
var minHeight = 500
var maxWidth = 1200
var maxHeight = 1400

var color = d3.scaleOrdinal(d3.schemeCategory20);

var fullGraph = requestFullGraphFromS3()
var emptyGraph = JSON.parse("{\"nodes\": [], \"edges\": []}")

var form = d3.select("form")
    .on("submit", function () { getSubgraphAndDrawIt(this.wordInput.value, 2) });

function requestFullGraphFromS3() {
  // Get the full etymology graph from S3.
  var request = new XMLHttpRequest();
  var path = S3_BUCKET + "data/etymograph.json"
  console.log(path)
  request.open("GET", path, false);
  request.send();
  return JSON.parse(request.responseText)
}

function getSubgraph(graph, word, depth) {
  // Get the part of the graph within depth steps from word.
  // TODO: Confirm that duplicate links are not included.
  var foundWords = new Set([word]);
  var currentDepth = 0;

  while (currentDepth < depth) {
    // Find all links matching any relevant word.
    var links = graph.links.filter(function(item) {
      if ((foundWords.has(item["source"])) || (foundWords.has(item["target"]))) {
        return true
      }
      else {
        return false
      }
    });
    // Add all adjacent nodes to the set of relevant nodes.
    links.forEach(function(edge){
      foundWords.add(edge["source"]);
      foundWords.add(edge["target"]);
    });
    currentDepth = currentDepth + 1
  }

  var nodes = Array.from(foundWords).map(function(word) { return {"id": word} })
  var responseGraph = {
    "nodes": nodes,
    "links": links
  };
  return responseGraph;
}

function selectSatisfactoryDimensions(graph) {
  // Choose SVG width and height, using the graph to assess what is reasonable.
  var numNodes = graph.nodes.length;
  if (numNodes < 20) {
    var width = minWidth
    var height = minHeight
  }
  else if (numNodes < 100) {
    var width = defaultWidth
    var height = defaultHeight
  }
  else {
    var width = maxWidth
    var height = maxHeight
  }
  return [width, height]
}

function draw(graph, word) {
  // Draw a graph for the given word.
  dimensions = selectSatisfactoryDimensions(graph)
  var width = dimensions[0]
  var height = dimensions[1]
  var nodeRadius = 6

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
    .on("click", onClick)
    .on("dblclick", openLink)

  node.append("circle")
    .attr("r", function (d) { return nodeRadius; })
    .attr("fill", function(d) { return color(d.group); })

  node.append("title")
    .text(function(d) { return d.id; });

  var dxText = 12
  var dyText = 6
  var wordSizeInPixels = 80
  node.append("text")
    .attr("dx", dxText)
    .attr("dy", dyText)
    .text(function(d) { return d.id });

  d3.selectAll(".node")
    .filter(function(d) { return d.id === word })
    .selectAll("circle")
      .style("fill", "orange")

  var activeNodes = []

  simulation
    .nodes(graph.nodes)
    .on("tick", ticked)

  function ticked() {
    node.
      attr("cx", function(d) {
        return d.x = Math.max(
          nodeRadius + dxText,
          Math.min(width - nodeRadius - dxText - wordSizeInPixels, d.x));
      })
      .attr("cy", function(d) {
        return d.y = Math.max(
          nodeRadius + dyText,
          Math.min(height - nodeRadius - dyText - wordSizeInPixels, d.y));
      });

    link
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  }

  // Placeholder function for on-click behavior.
  function onClick(d, i) {
    activeNodes.push(d3.select(this).node())
  }

  // Open a link to etymonline for the given word.
  function openLink(d, i) {
    window.open("https://www.etymonline.com/word/" + d.id, '_blank')
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

// Find the subgraph corresponding to the word and depth and display it.
function getSubgraphAndDrawIt(word, depth) {
  if (d3.event !== null) {
    d3.event.preventDefault()
  }
  var graph = getSubgraph(fullGraph, word, depth)
  d3.select("svg").remove()
  draw(graph, word)
}
