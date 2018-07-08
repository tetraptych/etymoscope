const API_ROOT = "http://localhost"
const S3_BUCKET = "https://s3-us-west-2.amazonaws.com/etymoscope-public/"

const defaultWidth = 1000
const defaultHeight = 700
const minWidth = 1000
const minHeight = 500
const maxWidth = 1200
const maxHeight = 1400

const color = d3.scaleOrdinal(d3.schemeCategory20);

const fullGraph = requestFullGraphFromS3()
const emptyGraph = JSON.parse("{\"nodes\": [], \"links\": []}")

var form = d3.select("form")
    .on("submit", function () { getSubgraphAndDrawIt(this.wordInput.value, 2) });

function requestFullGraphFromS3() {
  // Get the full etymology graph from S3.
  let request = new XMLHttpRequest();
  let path = S3_BUCKET + "data/etymograph.json"
  console.log(path)
  request.open("GET", path, false);
  request.send();
  return JSON.parse(request.responseText)
}

function getSubgraph(word, depth) {
  // Get the part of the graph within depth steps from word.
  // TODO: Confirm that duplicate links are not included.
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

  // If no links were found, return nothing.
  // This prevents a single node from being displayed when a word is not found.
  if (links.length == 0) {
    return emptyGraph
  }

  let responseGraph = {
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
  let dimensions = selectSatisfactoryDimensions(graph)
  let width = dimensions[0]
  let height = dimensions[1]
  let nodeRadius = 6

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
  let graph = getSubgraph(word, depth)
  d3.select("svg").remove()
  draw(graph, word)
}
