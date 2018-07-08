const API_ROOT="http://localhost",S3_BUCKET="https://s3-us-west-2.amazonaws.com/etymoscope-public/",defaultWidth=1e3,defaultHeight=700,minWidth=1e3,minHeight=500,maxWidth=1200,maxHeight=1400,color=d3.scaleOrdinal(d3.schemeCategory20),fullGraph=requestFullGraphFromS3(),emptyGraph=JSON.parse('{"nodes": [], "links": []}');var form=d3.select("form").on("submit",function(){getSubgraphAndDrawIt(this.wordInput.value,2)});function requestFullGraphFromS3(){let t=new XMLHttpRequest,e=S3_BUCKET+"data/etymograph.json";return console.log(e),t.open("GET",e,!1),t.send(),JSON.parse(t.responseText)}function getSubgraph(t,e){let n=new Set([t]);for(let t=0;t<e;t++){var r=fullGraph.links.filter(function(t){return!(!n.has(t.source)&&!n.has(t.target))});r.forEach(function(t){n.add(t.source),n.add(t.target)})}let a=JSON.parse(JSON.stringify(Array.from(n).map(function(t){return{id:t}}))),i=JSON.parse(JSON.stringify(Array.from(r)));return 0==i.length?emptyGraph:{nodes:a,links:i}}function selectSatisfactoryDimensions(t){var e=t.nodes.length;if(e<20)var n=minWidth,r=minHeight;else if(e<100)n=defaultWidth,r=defaultHeight;else n=maxWidth,r=maxHeight;return[n,r]}function draw(t,e){let n=selectSatisfactoryDimensions(t),r=n[0],a=n[1],i=6;d3.select("#d3-container").append("svg").attr("width",r).attr("height",a);var o=d3.select("svg"),l=d3.forceSimulation(t.nodes).force("link",d3.forceLink().id(function(t){return t.id}).links(t.links).distance(15).strength(1)).force("charge",d3.forceManyBody().strength(-800).distanceMax(350)).force("collide",d3.forceCollide().strength(1).radius(8)).force("center",d3.forceCenter(r/2,a/2)),s=o.append("g").attr("class","links").selectAll("line").data(t.links).enter().append("line").attr("stroke-width",function(t){return 4}),c=o.selectAll(".node").data(t.nodes).enter().append("g").attr("class","node").on("click",function(t,e){h.push(d3.select(this).node())}).on("dblclick",function(t,e){window.open("https://www.etymonline.com/word/"+t.id,"_blank")});c.append("circle").attr("r",function(t){return i}).attr("fill",function(t){return color(t.group)}),c.append("title").text(function(t){return t.id});var d=12,u=6,f=80;c.append("text").attr("dx",d).attr("dy",u).text(function(t){return t.id}),d3.selectAll(".node").filter(function(t){return t.id===e}).selectAll("circle").style("fill","orange");var h=[];l.nodes(t.nodes).on("tick",function(){c.attr("cx",function(t){return t.x=Math.max(i+d,Math.min(r-i-d-f,t.x))}).attr("cy",function(t){return t.y=Math.max(i+u,Math.min(a-i-u-f,t.y))}),s.attr("x1",function(t){return t.source.x}).attr("y1",function(t){return t.source.y}).attr("x2",function(t){return t.target.x}).attr("y2",function(t){return t.target.y}),c.attr("transform",function(t){return"translate("+t.x+","+t.y+")"})})}function getSubgraphAndDrawIt(t,e){null!==d3.event&&d3.event.preventDefault();let n=getSubgraph(t,e);d3.select("svg").remove(),draw(n,t)}