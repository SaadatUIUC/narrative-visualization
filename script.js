// Set up SVG
const width = 700;
const height = 500;
const margin = {top: 50, right: 50, bottom: 50, left: 50};

const svg = d3.select("#visualization")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let currentScene = 1;

// Create tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load data
d3.csv("auto_data_2017.csv").then(function(data) {
  // Convert string values to numbers
  data.forEach(d => {
    d.EngineCylinders = +d.EngineCylinders;
    d.AverageHighwayMPG = +d.AverageHighwayMPG;
    d.AverageCityMPG = +d.AverageCityMPG;
  });

  // Function to update the visualization based on the current scene
  function updateVisualization(scene) {
    svg.selectAll("*").remove();  // Clear previous content
    
    switch(scene) {
      case 1:
        drawIntroduction();
        break;
      case 2:
        drawScatterPlot(data);
        break;
      case 3:
        drawFuelTypeComparison(data);
        break;
      case 4:
        drawTopBrands(data);
        break;
      case 5:
        drawConclusion();
        break;
    }
  }
  
  // Initialize with the first scene
  updateVisualization(1);
  
  // Add navigation buttons
  d3.select("#prev-button").on("click", function() {
    currentScene = Math.max(1, currentScene - 1);
    updateVisualization(currentScene);
  });
  
  d3.select("#next-button").on("click", function() {
    currentScene = Math.min(5, currentScene + 1);
    updateVisualization(currentScene);
  });
});

function drawIntroduction() {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .text("Introduction to 2017 Automobile Data")
    .attr("class", "title")
    .style("opacity", 0)
    .transition()
    .duration(1000)
    .style("opacity", 1);
  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 + 30)
    .attr("text-anchor", "middle")
    .text("Click 'Next' to explore the data")
    .attr("class", "subtitle")
    .style("opacity", 0)
    .transition()
    .duration(1000)
    .delay(500)
    .style("opacity", 1);
}

function drawScatterPlot(data) {
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.AverageCityMPG)])
    .range([0, width]);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.AverageHighwayMPG)])
    .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Add X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .attr("class", "x-axis");

  // Add Y axis
  svg.append("g")
    .call(d3.axisLeft(y))
    .attr("class", "y-axis");

  // Add dots
  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.AverageCityMPG))
    .attr("cy", d => y(d.AverageHighwayMPG))
    .attr("r", 5)
    .style("fill", d => color(d.Make))
    .style("opacity", 0.7)
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Make: ${d.Make}<br/>City MPG: ${d.AverageCityMPG}<br/>Highway MPG: ${d.AverageHighwayMPG}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  // Add labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Average City MPG");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Average Highway MPG");

  // Add zoom functionality
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  svg.call(zoom);

  function zoomed(event) {
    const newX = event.transform.rescaleX(x);
    const newY = event.transform.rescaleY(y);
    
    svg.selectAll(".x-axis").call(d3.axisBottom(newX));
    svg.selectAll(".y-axis").call(d3.axisLeft(newY));
    
    svg.selectAll("circle")
      .attr("cx", d => newX(d.AverageCityMPG))
      .attr("cy", d => newY(d.AverageHighwayMPG));
  }
}

function drawFuelTypeComparison(data) {
  const fuelTypes = [...new Set(data.map(d => d.Fuel))];
  const fuelData = fuelTypes.map(fuel => ({
    fuel: fuel,
    avgCityMPG: d3.mean(data.filter(d => d.Fuel === fuel), d => d.AverageCityMPG),
    avgHighwayMPG: d3.mean(data.filter(d => d.Fuel === fuel), d => d.AverageHighwayMPG)
  }));

  const x = d3.scaleBand()
    .range([0, width])
    .domain(fuelTypes)
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(fuelData, d => Math.max(d.avgCityMPG, d.avgHighwayMPG))])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Add bars with transition
  svg.selectAll(".bar-city")
    .data(fuelData)
    .enter()
    .append("rect")
    .attr("class", "bar-city")
    .attr("x", d => x(d.fuel))
    .attr("y", height)
    .attr("width", x.bandwidth() / 2)
    .attr("height", 0)
    .attr("fill", "#69b3a2")
    .transition()
    .duration(1000)
    .attr("y", d => y(d.avgCityMPG))
    .attr("height", d => height - y(d.avgCityMPG));

  svg.selectAll(".bar-highway")
    .data(fuelData)
    .enter()
    .append("rect")
    .attr("class", "bar-highway")
    .attr("x", d => x(d.fuel) + x.bandwidth() / 2)
    .attr("y", height)
    .attr("width", x.bandwidth() / 2)
    .attr("height", 0)
    .attr("fill", "#404080")
    .transition()
    .duration(1000)
    .attr("y", d => y(d.avgHighwayMPG))
    .attr("height", d => height - y(d.avgHighwayMPG));

  // Add interactivity
  svg.selectAll("rect")
    .on("mouseover", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("opacity", 0.7);
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Fuel: ${d.fuel}<br/>City MPG: ${d.avgCityMPG.toFixed(2)}<br/>Highway MPG: ${d.avgHighwayMPG.toFixed(2)}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition()
        .duration(500)
        .attr("opacity", 1);
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Fuel Type");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Average MPG");

  // Legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 100}, 0)`);

  legend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", "#69b3a2");

  legend.append("rect")
    .attr("x", 0)
    .attr("y", 20)
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", "#404080");

  legend.append("text")
    .attr("x", 15)
    .attr("y", 10)
    .text("City")
    .style("font-size", "12px")
    .attr("alignment-baseline","middle");

  legend.append("text")
    .attr("x", 15)
    .attr("y", 30)
    .text("Highway")
    .style("font-size", "12px")
    .attr("alignment-baseline","middle");
}

function drawTopBrands(data) {
  const brandData = d3.rollup(data, 
    v => ({
      avgCityMPG: d3.mean(v, d => d.AverageCityMPG),
      avgHighwayMPG: d3.mean(v, d => d.AverageHighwayMPG)
    }), 
    d => d.Make
  );

  const sortedBrands = Array.from(brandData, ([name, value]) => ({name, ...value}))
    .sort((a, b) => (b.avgCityMPG + b.avgHighwayMPG) / 2 - (a.avgCityMPG + a.avgHighwayMPG) / 2)
    .slice(0, 10);

  const x = d3.scaleBand()
    .range([0, width])
    .domain(sortedBrands.map(d => d.name))
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(sortedBrands, d => Math.max(d.avgCityMPG, d.avgHighwayMPG))])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append("g")
    .call(d3.axisLeft(y));

  // Add bars with transition
  svg.selectAll(".bar-city")
    .data(sortedBrands)
    .enter()
    .append("rect")
    .attr("class", "bar-city")
    .attr("x", d => x(d.name))
    .attr("y", height)
    .attr("width", x.bandwidth() / 2)
    .attr("height", 0)
    .attr("fill", "#69b3a2")
    .transition()
    .duration(1000)
    .attr("y", d => y(d.avgCityMPG))
    .attr("height", d => height - y(d.avgCityMPG));

  svg.selectAll(".bar-highway")
    .data(sortedBrands)
    .enter()
    .append("rect")
    .attr("class", "bar-highway")
    .attr("x", d => x(d.name) + x.bandwidth() / 2)
    .attr("y", height)
    .attr("width", x.bandwidth() / 2)
    .attr("height", 0)
    .attr("fill", "#404080")
    .transition()
    .duration(1000)
    .attr("y", d => y(d.avgHighwayMPG))
    .attr("height", d => height - y(d.avgHighwayMPG));

  // Add interactivity
  svg.selectAll("rect")
    .on("mouseover", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("opacity", 0.7);
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Brand: ${d.name}<br/>City MPG: ${d.avgCityMPG.toFixed(2)}<br/>Highway MPG: ${d.avgHighwayMPG.toFixed(2)}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition()
        .duration(500)
        .attr("opacity", 1);
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Top 10 Brands by Average MPG");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2
