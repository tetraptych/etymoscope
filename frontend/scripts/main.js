const S3_BUCKET = "https://etymoscope.com/"

const defaultWidth = 1000
const color = d3.scaleOrdinal(d3.schemeCategory20);

const fullGraph = requestFullGraphFromS3()
const emptyGraph = JSON.parse("{\"nodes\": [], \"links\": []}")

var form = d3.select("form")
    .on("submit", function () { getSubgraphAndDrawIt(this.wordInput.value, 2) });

function requestFullGraphFromS3() {
  // Get the full etymology graph from S3.
  let request = new XMLHttpRequest();
  let path = S3_BUCKET + "data/etymograph.json"
  request.open("GET", path, false);
  request.send();
  return JSON.parse(request.responseText)
}

function getSubgraph(word, depth) {
  // Get the part of the graph within depth steps from word.
  // TODO: Confirm that duplicate links are not included.
  // If the word is not found, return nothing.
  if (fullGraph.nodes.filter(function(item) { return (item.id == word) }).length == 0) {
    return emptyGraph
  }

  let foundWords = new Set([word]);

  for (let currentDepth = 0; currentDepth < depth; currentDepth++) {
    // Find all links matching any relevant word.
    var relevantLinks = fullGraph["links"].filter(
      function(item) {
        if ((foundWords.has(item["source"])) || (foundWords.has(item["target"]))) {
          return true
        }
        else {
          return false
        }
      }
    );
    // Add all adjacent nodes to the set of relevant nodes.
    relevantLinks.forEach(function(edge){
      foundWords.add(edge["source"]);
      foundWords.add(edge["target"]);
    });
  }

  // Create deep copies to avoid updating pieces of fullGraph while drawing.
  let nodes = JSON.parse(JSON.stringify(
    Array.from(foundWords).map(function(word) { return {"id": word} })
  ));
  let links = JSON.parse(JSON.stringify(Array.from(relevantLinks)));
  let responseGraph = {
    "nodes": nodes,
    "links": links
  };
  return responseGraph;
}

function selectSatisfactoryDimensions(graph) {
  // Choose SVG width and height, using the graph to assess what is reasonable.
  var numNodes = graph.nodes.length;
  var width = defaultWidth;
  var height = Math.min(Math.round(3 * numNodes + 500), 1600);
  return [width, height]
}

function getViewportWidth() {
  return d3.select("#d3-container").node().getBoundingClientRect().width
}

function draw(graph, word) {
  // Draw a graph for the given word.
  var dimensions = selectSatisfactoryDimensions(graph)
  var targetWidth = dimensions[0]
  var targetHeight = dimensions[1]
  var nodeRadius = 5

  var viewportWidth = getViewportWidth()

  // Allow mobile devices to scroll horizontally.
  // All other devices fit
  if (viewportWidth < 500) {
    var trueWidth = 1.4 * viewportWidth;
    var trueHeight = 2.0 * trueWidth / targetWidth * targetHeight;
    d3.select("#d3-container")
      .append("div")
      .classed("svg-container", true)
      .append("svg")
      .attr("width",  trueWidth)
      .attr("height", trueHeight);
  }
  else {
    var trueWidth = targetWidth;
    var trueHeight = targetHeight;
    d3.select("#d3-container")
      .append("div")
      .classed("svg-container", true)
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 " + targetWidth + " " + targetHeight)
      .classed("svg-content-responsive", true);
  }

  var svg = d3.select("svg")

  var simulation = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink()
        .id(function(d) { return d.id; })
        .links(graph.links)
        .distance(10)
        .strength(1.2)
      )
      .force("charge", d3.forceManyBody()
        .strength(-800)
        .distanceMax(350)
      )
      .force("collide", d3.forceCollide()
        .strength(1.0)
        .radius(8)
      )
      .force("center", d3.forceCenter(trueWidth / 2, trueHeight / 2.5))
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
          Math.min(trueWidth - nodeRadius - dxText - wordSizeInPixels, d.x));
      })
      .attr("cy", function(d) {
        return d.y = Math.max(
          nodeRadius + dyText,
          Math.min(trueHeight - nodeRadius - dyText - wordSizeInPixels, d.y));
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
    d3.event.preventDefault();
  }
  let graph = getSubgraph(word, depth)
  // Remove svg if one exists.
  if (d3.select("div.svg-container")) {
    d3.select("div.svg-container").remove();
  }
  draw(graph, word)
}
