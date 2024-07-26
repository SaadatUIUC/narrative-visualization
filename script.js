const width = 700;
const height = 400;
const margin = { top: 50, right: 50, bottom: 50, left: 50 };

function navigateToScene(scene) {
  switch(scene) {
    case 'scatter':
      currentScene = 2;
      break;
    case 'fuel':
      currentScene = 3;
      break;
    case 'brands':
      currentScene = 4;
      break;
  }
  updateVisualization(currentScene);
  updateButtonStates();
}

const svg = d3.select("#visualization")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom + 60)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let currentScene = 1;
let data;
const totalScenes = 5;  // Define the total number of scenes

let carPosition = 0;
const roadWidth = document.getElementById('road-svg').clientWidth;
const positionIncrement = roadWidth / totalScenes;

// Function to move the car
function moveCar() {
    carPosition += positionIncrement; // Increase the position by 100 units
    d3.select("#car-svg")
      .transition()
      .duration(1000)
      .attr("x", carPosition); // Update the x attribute to move the car
}

// Function to move the car backward
function moveCarBack() {
  carPosition -= positionIncrement; // Decrease the position by 100 units
  d3.select("#car-svg")
    .transition()
    .duration(1000)
    .attr("x", carPosition); // Update the x attribute to move the car
}

function loadData() {
  d3.csv("auto_data_2017.csv").then(function(loadedData) {
    data = loadedData;

    // Convert string values to numbers
    data.forEach(d => {
      d.EngineCylinders = +d.EngineCylinders;
      d.AverageHighwayMPG = +d.AverageHighwayMPG;
      d.AverageCityMPG = +d.AverageCityMPG;
    });

    createFilterContainer();  // Create filter container after data is loaded
    updateVisualization(currentScene);
    updateButtonStates();

    // Add navigation buttons
    d3.select("#prev-button").on("click", function() {
      if (currentScene > 1) {
        currentScene--;
        updateVisualization(currentScene);
        updateButtonStates();
        moveCarBack();
      }
    });

    d3.select("#next-button").on("click", function() {
      if (currentScene < totalScenes) {
        currentScene++;
        updateVisualization(currentScene);
        updateButtonStates();
        moveCar();  // Move the car when the "Next" button is clicked
      }
    });
  }).catch(function(error) {
    console.error("Error loading data:", error);
  });
}

loadData();

let scatterPlotElements;

function updateVisualization(scene) {
  svg.selectAll("*").remove();  // Clear previous content
  
  d3.select("#filter-container").style("display", scene === 2 ? "flex" : "none");
  
  updateAnnotation(scene);
  updateSceneDescription(scene);
  
  switch(scene) {
      case 1:
          drawIntroduction();
          break;
      case 2:
          resetFilters();
          scatterPlotElements = drawScatterPlot(data);
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

  currentScene = scene;
}

function filterAndHighlight() {
  if (!scatterPlotElements) return;

  const selectedMake = d3.select("#make-select").property("value");
  const selectedFuel = d3.select("#fuel-select").property("value");
  const selectedCylinder = d3.select("#cylinder-select").property("value");
  const cityMpg = +d3.select("#city-mpg-slider").property("value");
  const highwayMpg = +d3.select("#highway-mpg-slider").property("value");

  // Filter the data based on selections
  const filteredData = data.filter(d => {
    return (selectedMake === "All" || d.Make === selectedMake) &&
           (selectedFuel === "All" || d.Fuel === selectedFuel) &&
           (selectedCylinder === "All" || d.EngineCylinders === +selectedCylinder) &&
           d.AverageCityMPG <= cityMpg &&
           d.AverageHighwayMPG <= highwayMpg;
  });

  // Reset zoom before updating scatter plot
  scatterPlotElements.resetZoom();

  // Update the scatterplot with filtered data
  scatterPlotElements.updateScatter(filteredData);
}

function createFilterContainer() {
  const filterContainer = d3.select("#filter-container");

  // Clear existing content
  filterContainer.html("");

  // Create Make dropdown
  filterContainer.append("label").text("Select Make:");
  const makeSelect = filterContainer.append("select").attr("id", "make-select");

  // Create Fuel dropdown
  filterContainer.append("label").text("Select Fuel Type:");
  const fuelSelect = filterContainer.append("select").attr("id", "fuel-select");

  // Create Cylinder dropdown
  filterContainer.append("label").text("Select Cylinders:");
  const cylinderSelect = filterContainer.append("select").attr("id", "cylinder-select");

  // Create City MPG slider
  filterContainer.append("label").text("City MPG:");
  const cityMpgSlider = filterContainer.append("input")
    .attr("type", "range")
    .attr("id", "city-mpg-slider")
    .attr("min", 0)
    .attr("max", d3.max(data, d => d.AverageCityMPG))
    .attr("value", d3.max(data, d => d.AverageCityMPG));

  filterContainer.append("span").attr("id", "city-mpg-value");

  // Create Highway MPG slider
  filterContainer.append("label").text("Highway MPG:");
  const highwayMpgSlider = filterContainer.append("input")
    .attr("type", "range")
    .attr("id", "highway-mpg-slider")
    .attr("min", 0)
    .attr("max", d3.max(data, d => d.AverageHighwayMPG))
    .attr("value", d3.max(data, d => d.AverageHighwayMPG));

  filterContainer.append("span").attr("id", "highway-mpg-value");

  // Populate Make dropdown
  const makes = ["All"].concat([...new Set(data.map(d => d.Make))].sort());
  makeSelect.selectAll("option")
    .data(makes)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Populate Cylinder dropdown
  const cylinders = ["All"].concat([...new Set(data.map(d => d.EngineCylinders))].sort((a, b) => a - b));
  cylinderSelect.selectAll("option")
    .data(cylinders)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d === 0 ? "Electric" : d);

  // Function to update Fuel and Cylinder dropdowns
  function updateDropdowns(selectedMake) {
    let fuels = ["All"];
    let cylinders = ["All"];
    if (selectedMake === "All") {
      fuels = fuels.concat([...new Set(data.map(d => d.Fuel))].sort());
      cylinders = cylinders.concat([...new Set(data.map(d => d.EngineCylinders))].sort((a, b) => a - b));
    } else {
      const filteredData = data.filter(d => d.Make === selectedMake);
      fuels = fuels.concat([...new Set(filteredData.map(d => d.Fuel))].sort());
      cylinders = cylinders.concat([...new Set(filteredData.map(d => d.EngineCylinders))].sort((a, b) => a - b));
    }
    
    fuelSelect.html(""); // Clear previous options
    fuelSelect.selectAll("option")
      .data(fuels)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);

    cylinderSelect.html(""); // Clear previous options
    cylinderSelect.selectAll("option")
      .data(cylinders)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d === 0 ? "Electric" : d);
  }

  // Initial population of Fuel and Cylinder dropdowns
  updateDropdowns("All");

  // Event listener for Make dropdown
  makeSelect.on("change", function() {
    const selectedMake = this.value;
    updateDropdowns(selectedMake);
    filterAndHighlight();
  });

  // Event listeners for other filters
  fuelSelect.on("change", filterAndHighlight);
  cylinderSelect.on("change", filterAndHighlight);
  cityMpgSlider.on("input", function() {
    d3.select("#city-mpg-value").text(this.value);
    filterAndHighlight();
  });
  highwayMpgSlider.on("input", function() {
    d3.select("#highway-mpg-value").text(this.value);
    filterAndHighlight();
  });

  // Initial text for MPG values
  d3.select("#city-mpg-value").text(cityMpgSlider.property("value"));
  d3.select("#highway-mpg-value").text(highwayMpgSlider.property("value"));
}

function drawScatterPlot(data) {

  // Filter out invalid data points
  const validData = data.filter(d => 
    !isNaN(d.AverageCityMPG) && 
    !isNaN(d.AverageHighwayMPG) && 
    d.AverageCityMPG != null && 
    d.AverageHighwayMPG != null
  );

  let x = d3.scaleLinear()
    .domain([0, d3.max(validData, d => d.AverageCityMPG)])
    .range([0, width]);
  
  let y = d3.scaleLinear()
    .domain([0, d3.max(validData, d => d.AverageHighwayMPG)])
    .range([height, 0]);

  const tooltip = d3.select("#tooltip");

  // Clear previous content
  svg.selectAll("*").remove();

  // Create clip path
  svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  let currentTransform = d3.zoomIdentity;

  function createZoom() {
    return d3.zoom()
      .scaleExtent([1, 20])
      .extent([[0, 0], [width, height]])
      .on("zoom", zoomed);
  }

  let zoom = createZoom();

  const chartArea = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const scatterPlot = chartArea.append("g")
    .attr("clip-path", "url(#clip)")
    .call(zoom);

  scatterPlot.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

  const xAxis = chartArea.append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "x-axis")
    .call(d3.axisBottom(x));

  const yAxis = chartArea.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y));

  let currentDialogue = null;

  function updatePoints(selection, transitionDuration = 1000) {
    selection
      .attr("cx", d => {
        const value = x(d.AverageCityMPG);
        return isNaN(value) || value < 0 ? 0 : value > width ? width : value;
      })
      .attr("cy", d => {
        const value = y(d.AverageHighwayMPG);
        return isNaN(value) || value < 0 ? height : value > height ? 0 : value;
      })
      .attr("r", 5)
      .style("fill", "#007bff")
      .style("stroke", "#000")
      .style("stroke-width", "1px")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 7)
          .style("fill", "#ff5733");
        tooltip.style("display", "block")
          .html(`Make: ${d.Make}<br>Cylinders: ${d.EngineCylinders}<br>City MPG: ${d.AverageCityMPG}<br>Highway MPG: ${d.AverageHighwayMPG}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 5)
          .style("fill", "#007bff");
        tooltip.style("display", "none");
      })
      .on("click", function(event, d) {
        const xPos = x(d.AverageCityMPG) + 10;
        const yPos = y(d.AverageHighwayMPG) + 10;
        createDialogue(d, xPos, yPos);
      });
      
      selection.transition()
        .duration(transitionDuration)
        .delay((d, i) => i * 5)
        .style("opacity", 1);
  }

  const points = scatterPlot.selectAll("circle")
    .data(validData)
    .enter()
    .append("circle")
    .style("opacity", 0);

  updatePoints(points);

  // X-axis label
  chartArea.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Average City MPG");

  // Y-axis label
  chartArea.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Average Highway MPG");

  function zoomed(event) {
    currentTransform = event.transform;
    const newX = currentTransform.rescaleX(x);
    const newY = currentTransform.rescaleY(y);

    xAxis.call(d3.axisBottom(newX));
    yAxis.call(d3.axisLeft(newY));

    scatterPlot.selectAll("circle")
      .attr("cx", d => newX(d.AverageCityMPG))
      .attr("cy", d => newY(d.AverageHighwayMPG));
    
    if (currentDialogue) {
      currentDialogue.remove();
      currentDialogue = null;
    }
  }

  function resetZoom() {
    currentTransform = d3.zoomIdentity;
    
    scatterPlot.transition().duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  }

  d3.select("body").on("keydown", function(event) {
    if (event.key === "Escape") {
      resetZoom();
    }
  });

  function createDialogue(d, xPos, yPos) {
    if (currentDialogue) {
      currentDialogue.remove();
    }

    const padding = 5;
    const lineHeight = 20;
    const maxWidth = 200;

    currentDialogue = scatterPlot.append("g")
      .attr("class", "dialogue")
      .attr("transform", `translate(${xPos}, ${yPos})`);

    const textContent = [
      `Make: ${d.Make}`,
      `Cylinders: ${d.EngineCylinders}`,
      `City MPG: ${d.AverageCityMPG}`,
      `Highway MPG: ${d.AverageHighwayMPG}`
    ];

    let boxWidth = 0;
    let boxHeight = padding * 2;

    const texts = textContent.map((text, i) => {
      const textElement = currentDialogue.append("text")
        .attr("x", padding)
        .attr("y", padding + i * lineHeight)
        .text(text);

      const words = text.split(/\s+/).reverse();
      let line = [];
      let lineNumber = 0;
      let tspan = textElement.text(null).append("tspan").attr("x", padding).attr("dy", "1.2em");
      let word;
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > maxWidth - padding * 2) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textElement.append("tspan").attr("x", padding).attr("dy", "1.2em").text(word);
          lineNumber++;
        }
      }

      const textWidth = Math.min(tspan.node().getComputedTextLength() + padding * 2, maxWidth);
      boxWidth = Math.max(boxWidth, textWidth);
      boxHeight += lineHeight * (lineNumber + 1);

      return textElement;
    });

    currentDialogue.insert("rect", ":first-child")
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .style("fill", "white")
      .style("stroke", "black");

    texts.forEach((textElement, i) => {
      textElement.attr("y", padding + i * lineHeight);
    });

    currentDialogue.style("opacity", 0)
      .transition()
      .duration(300)
      .style("opacity", 1);
  }

  function updateScatter(filteredData) {

    const cityMpgMax = +d3.select("#city-mpg-slider").property("value");
    const highwayMpgMax = +d3.select("#highway-mpg-slider").property("value");

    const validFilteredData = filteredData.filter(d => 
      !isNaN(d.AverageCityMPG) && 
      !isNaN(d.AverageHighwayMPG) && 
      d.AverageCityMPG != null && 
      d.AverageHighwayMPG != null &&
      d.AverageCityMPG <= cityMpgMax &&
      d.AverageHighwayMPG <= highwayMpgMax
    );

    // Update scales
    x.domain([0, cityMpgMax]);
    y.domain([0, highwayMpgMax]);

    // Update axes
    xAxis.transition().duration(750).call(d3.axisBottom(x));
    yAxis.transition().duration(750).call(d3.axisLeft(y));

    // Update points
    const updatedPoints = scatterPlot.selectAll("circle")
      .data(validFilteredData, d => `${d.Make}-${d.Fuel}-${d.EngineCylinders}`);

     // Remove points that are no longer in the dataset
     updatedPoints.exit()
     .transition()
     .duration(750)
     .style("opacity", 0)
     .remove();

     // Add new points
    const enterPoints = updatedPoints.enter()
    .append("circle")
    .style("opacity", 0);

    // Update all points (new and existing)
    updatePoints(enterPoints.merge(updatedPoints), 750);

    // Reset zoom
    resetZoom();
  }

  return { x, y, updateScatter, resetZoom };
}

function resetFilters() {
  // Reset dropdowns
  d3.select("#make-select").property("value", "All");
  d3.select("#fuel-select").property("value", "All");
  d3.select("#cylinder-select").property("value", "All");

  // Reset sliders
  const cityMpgSlider = d3.select("#city-mpg-slider");
  const highwayMpgSlider = d3.select("#highway-mpg-slider");

  cityMpgSlider.property("value", cityMpgSlider.property("max"));
  highwayMpgSlider.property("value", highwayMpgSlider.property("max"));

  // Update displayed values
  d3.select("#city-mpg-value").text(cityMpgSlider.property("value"));
  d3.select("#highway-mpg-value").text(highwayMpgSlider.property("value"));
}

function updateAnnotation(scene) {
  const annotations = [
    "We'll explore MPG across different car models, fuel types, and brands.",
    "Which car brands offer the best fuel efficiency?",
    "Electric vehicles show the highest MPG equivalent.",
    "Hybrid and electric brands dominate the top spots.",
    "Consider fuel efficiency in your next car purchase!"
  ];

  // Select the existing annotation element or create it if it doesn't exist
  let annotationElement = d3.select(".annotation-container");
  if (annotationElement.empty()) {
    annotationElement = d3.select("#visualization-container")
      .insert("div", ":first-child")
      .attr("class", "annotation-container");
    annotationElement.append("text")
      .attr("class", "annotation");
  }

  // Update the text of the annotation
  annotationElement.select(".annotation")
    .text(annotations[scene - 1]);
}

function updateSceneDescription(scene) {
  const descriptions = [
    "Welcome to our exploration of 2017 automobile fuel efficiency.",
    "Explore how highway and city mileage compare for major car brands. Use the filter controls to select make, fuel type, and number of cylinders. Double-click to zoom in on the scatterplots and press ESC to zoom out. Hover over the data points to see detailed information through tooltips. Discover potential correlations between car brand, fuel type, and fuel efficiency.",
    "This interactive bar chart allows you to compare the average MPG for different fuel types. Use the 'Sort Highest MPG' and 'Sort Lowest MPG' buttons to rearrange the bars based on fuel efficiency. Hover over the bars to see detailed information through tooltips.",
    "Explore the top 10 car brands by average MPG. Use the 'Sort Highest MPG' and 'Sort Lowest MPG' buttons to rank the brands by fuel efficiency. Hover over the bars to see detailed information through tooltips. Notice how hybrid and electric brands dominate the top spots.",
    "In conclusion, we've seen how fuel efficiency varies across different aspects of 2017 automobiles."
  ];

  d3.select("#scene-description").text(descriptions[scene - 1]);

  const annotations = [
    "We'll explore MPG across different car models, fuel types, and brands.",
    "Notice the strong correlation between city and highway MPG, highlighting the consistency in fuel efficiency across different driving conditions.",
    "Electric vehicles show the highest MPG equivalent compared to gasoline and diesel vehicles, highlighting their superior fuel efficiency.",
    "Hybrid and electric vehicles lead in fuel efficiency among the top brands.",
    "Consider fuel efficiency in your next car purchase!"
  ];

  d3.select(".annotation").text(annotations[scene - 1]);
}

function drawIntroduction() {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 - 30)
    .attr("text-anchor", "middle")
    .text("2017 Automobile Fuel Efficiency");
  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .text("Click 'Next' to explore the data");

  // Add annotation
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 + 30)
    .attr("text-anchor", "middle")
    .attr("class", "annotation")
    .text("We'll explore MPG across different car models, fuel types, and brands");
}

function drawFuelTypeComparison(data) {
  // Clear any existing content specific to this chart
  d3.select("#visualization").selectAll(".fuel-comparison-chart").remove();

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

  const chartGroup = svg.append("g")
    .attr("class", "fuel-comparison-chart");

  const xAxis = chartGroup.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  chartGroup.append("g")
    .call(d3.axisLeft(y));

  let currentSort = null;

  function updateBars(data) {
    const bars = chartGroup.selectAll(".bar-group")
      .data(data, d => d.fuel);

    const barsEnter = bars.enter().append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(${x(d.fuel)},0)`);

    barsEnter.append("rect")
      .attr("class", "bar-city")
      .attr("y", d => y(d.avgCityMPG))
      .attr("width", x.bandwidth() / 2)
      .attr("height", d => height - y(d.avgCityMPG))
      .attr("fill", "#69b3a2");

    barsEnter.append("rect")
      .attr("class", "bar-highway")
      .attr("x", x.bandwidth() / 2)
      .attr("y", d => y(d.avgHighwayMPG))
      .attr("width", x.bandwidth() / 2)
      .attr("height", d => height - y(d.avgHighwayMPG))
      .attr("fill", "#404080");

    const allBars = barsEnter.merge(bars);

    allBars.transition().duration(750)
      .attr("transform", d => `translate(${x(d.fuel)},0)`);

    allBars.select(".bar-city")
      .transition().duration(750)
      .attr("y", d => y(d.avgCityMPG))
      .attr("height", d => height - y(d.avgCityMPG));

    allBars.select(".bar-highway")
      .transition().duration(750)
      .attr("y", d => y(d.avgHighwayMPG))
      .attr("height", d => height - y(d.avgHighwayMPG));

    allBars.on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.8);
      d3.select("#tooltip")
        .style("display", "block")
        .html(`Fuel: ${d.fuel}<br>City MPG: ${d.avgCityMPG.toFixed(2)}<br>Highway MPG: ${d.avgHighwayMPG.toFixed(2)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      d3.select("#tooltip").style("display", "none");
    })
    .on("click", function() {
      d3.selectAll(".bar-group").classed("highlighted", false);
      d3.select(this).classed("highlighted", true);
    });

    bars.exit().remove();
  }

  function sortData(sortBy, sortOrder = "descending") {
    let sortedData = [...fuelData];
    if (sortBy === "default") {
      // Sort by average of city and highway MPG
      sortedData.sort((a, b) => {
        const avgA = (a.avgCityMPG + a.avgHighwayMPG) / 2;
        const avgB = (b.avgCityMPG + b.avgHighwayMPG) / 2;
        return sortOrder === "ascending" ? avgA - avgB : avgB - avgA;
      });
    } else if (sortBy === "city") {
      sortedData.sort((a, b) => sortOrder === "ascending" ? 
        a.avgCityMPG - b.avgCityMPG : 
        b.avgCityMPG - a.avgCityMPG);
    } else if (sortBy === "highway") {
      sortedData.sort((a, b) => sortOrder === "ascending" ? 
        a.avgHighwayMPG - b.avgHighwayMPG : 
        b.avgHighwayMPG - a.avgHighwayMPG);
    }
  
    x.domain(sortedData.map(d => d.fuel));
    xAxis.transition().duration(750).call(d3.axisBottom(x));
    updateBars(sortedData);
  
    chartGroup.selectAll(".sort-arrow").text("");
    if (sortBy !== "default") {
      chartGroup.select(`#${sortBy}-sort-arrow`)
        .text(sortOrder === "ascending" ? " ▲" : " ▼");
    }
  }

  updateBars(fuelData);

  // X-axis label
  chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Fuel Type");

  // Y-axis label
  chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Average MPG");

  // Legend with sorting functionality
  const legend = chartGroup.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 80}, 0)`);

  const legendItems = [
    { label: "City MPG", color: "#69b3a2", sortBy: "city" },
    { label: "Highway MPG", color: "#404080", sortBy: "highway" }
  ];

  legendItems.forEach((item, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(-15, ${i * 25})`)
      .style("cursor", "pointer")
      .on("click", () => sortData(item.sortBy));

    legendItem.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", item.color);

    legendItem.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text(item.label);

    legendItem.append("text")
      .attr("id", `${item.sortBy}-sort-arrow`)
      .attr("class", "sort-arrow")
      .attr("x", 120)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text("");
  });

  // Function to create a button
// Update the button creation and labels
function createButton(x, text, sortOrder) {
  const buttonGroup = chartGroup.append("g")
    .attr("class", "sort-button")
    .attr("transform", `translate(${x}, -30)`)
    .style("cursor", "pointer")
    .on("click", () => sortData("default", sortOrder));

  buttonGroup.append("rect")
    .attr("width", 140)
    .attr("height", 25)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "#007bff")
    .attr("stroke", "#0056b3")
    .attr("stroke-width", 2);

  buttonGroup.append("text")
    .attr("x", 70)
    .attr("y", 17)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text(text);

  // Add hover effect
  buttonGroup.on("mouseover", function() {
    d3.select(this).select("rect").attr("fill", "#0056b3");
  })
  .on("mouseout", function() {
    d3.select(this).select("rect").attr("fill", "#007bff");
  });
}

  // Create descending sort button (highest MPG first)
  createButton(10, "Sort Highest MPG", "descending");

  // Create ascending sort button (lowest MPG first)
  createButton(160, "Sort Lowest MPG", "ascending");

  // Initially sort by highest MPG
  sortData("default", "descending");
}

function drawTopBrands(data) {
  // Clear previous content specific to this chart
  svg.selectAll(".top-brands-chart").remove();

  // Adjust margins to match Fuel Type scene
  // Just added
  const margin = { top: 50, right: 50, bottom: 70, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  // Just added

  const chartGroup = svg.append("g")
    .attr("class", "top-brands-chart")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const brandData = d3.rollup(data,
    v => ({
      avgCityMPG: d3.mean(v, d => +d.AverageCityMPG),
      avgHighwayMPG: d3.mean(v, d => +d.AverageHighwayMPG)
    }),
    d => d.Make
  );

  let sortedBrands = Array.from(brandData, ([name, value]) => ({
    name, 
    avgCityMPG: value.avgCityMPG,
    avgHighwayMPG: value.avgHighwayMPG,
    avgMPG: (value.avgCityMPG + value.avgHighwayMPG) / 2
  }))
    .sort((a, b) => b.avgMPG - a.avgMPG)
    .slice(0, 10);

  const x = d3.scaleBand()
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .range([height, 0]);

  const xAxis = chartGroup.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  const yAxis = chartGroup.append("g")
    .attr("class", "y-axis");

  function updateChart() {
    x.domain(sortedBrands.map(d => d.name));
    y.domain([0, d3.max(sortedBrands, d => Math.max(d.avgCityMPG, d.avgHighwayMPG))]);

    xAxis.transition().duration(750)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "rotate(-15)")
        .style("text-anchor", "end");

    yAxis.transition().duration(750)
      .call(d3.axisLeft(y));

    const bars = chartGroup.selectAll(".bar-group")
      .data(sortedBrands, d => d.name);

    const barsEnter = bars.enter().append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(${x(d.name)},0)`);

    barsEnter.append("rect")
      .attr("class", "bar-city")
      .attr("y", height)
      .attr("width", x.bandwidth() / 2)
      .attr("height", 0)
      .attr("fill", "#69b3a2");

    barsEnter.append("rect")
      .attr("class", "bar-highway")
      .attr("x", x.bandwidth() / 2)
      .attr("y", height)
      .attr("width", x.bandwidth() / 2)
      .attr("height", 0)
      .attr("fill", "#404080");

    const allBars = barsEnter.merge(bars);

    allBars.transition().duration(750)
      .attr("transform", d => `translate(${x(d.name)},0)`);

    allBars.select(".bar-city")
      .transition().duration(750)
      .attr("y", d => y(d.avgCityMPG))
      .attr("height", d => height - y(d.avgCityMPG));

    allBars.select(".bar-highway")
      .transition().duration(750)
      .attr("y", d => y(d.avgHighwayMPG))
      .attr("height", d => height - y(d.avgHighwayMPG));

    allBars.on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.8);
      d3.select("#tooltip")
        .style("display", "block")
        .html(`Brand: ${d.name}<br>City MPG: ${d.avgCityMPG.toFixed(2)}<br>Highway MPG: ${d.avgHighwayMPG.toFixed(2)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      d3.select("#tooltip").style("display", "none");
    });

    bars.exit().remove();
  }

  function sortBrands(sortOrder) {
    sortedBrands.sort((a, b) => sortOrder === "high" ? b.avgMPG - a.avgMPG : a.avgMPG - b.avgMPG);
    updateChart();
  }

  // Initial chart render
  updateChart();

  // X-axis label
  chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Brands");

  // Y-axis label
  chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .text("Average MPG");

  // Legend
  const legend = chartGroup.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 150}, -40)`);

  const legendItems = [
    { label: "City MPG", color: "#69b3a2" },
    { label: "Highway MPG", color: "#404080" }
  ];

  legendItems.forEach((item, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", item.color);

    legendItem.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text(item.label);
  });

  function createButton(x, text, sortOrder) {
    const buttonGroup = chartGroup.append("g")
      .attr("class", "sort-button")
      .attr("transform", `translate(${x}, -40)`)
      .style("cursor", "pointer")
      .on("click", () => sortBrands(sortOrder));

    buttonGroup.append("rect")
      .attr("width", 140)
      .attr("height", 25)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#007bff")
      .attr("stroke", "#0056b3")
      .attr("stroke-width", 2);

    buttonGroup.append("text")
      .attr("x", 70)
      .attr("y", 17)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "12px")
      .text(text);

    buttonGroup.on("mouseover", function() {
      d3.select(this).select("rect").attr("fill", "#3367D6");
    })
    .on("mouseout", function() {
      d3.select(this).select("rect").attr("fill", "#4285F4");
    });

  // Add hover effect
  buttonGroup.on("mouseover", function() {
    d3.select(this).select("rect").attr("fill", "#0056b3");
  })
  .on("mouseout", function() {
    d3.select(this).select("rect").attr("fill", "#007bff");
  });
  }

  // Update the button creation calls
  createButton(10, "Sort Highest MPG", "high");
  createButton(160, "Sort Lowest MPG", "low");

  // Cleanup function
  return function cleanup() {
    chartGroup.remove();
    d3.select("#tooltip").style("display", "none");
  };
}

// best one
function drawConclusion() {
  // Remove any existing content in the SVG
  svg.selectAll("*").remove();

  // Define the key findings
  const findings = [
      { text: "Strong correlation between city and highway MPG", icon: "🔗" },
      { text: "Electric vehicles have the highest MPG equivalent", icon: "⚡" },
      { text: "Hybrid and electric brands lead in fuel efficiency", icon: "🍃" },
      { text: "Significant variation in MPG across different fuel types", icon: "📊" }
  ];

  // Add title
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("class", "title")
      .text("Key Findings from 2017 Automobile Data");

  // Add groups for each finding
  const findingGroups = svg.selectAll(".finding")
      .data(findings)
      .enter()
      .append("g")
      .attr("class", "finding")
      .attr("transform", (d, i) => `translate(${width / 2 - 100}, ${100 + i * 70})`)
      .style("opacity", 0);

  // Add circle for each finding
  findingGroups.append("circle")
      .attr("r", 25)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#007bff")
      .attr("stroke-width", 2);

  // Add icon text for each finding
  findingGroups.append("text")
      .attr("class", "icon")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("x", 0)
      .text(d => d.icon);

  // Add finding text for each finding
  findingGroups.append("text")
      .attr("x", 40)
      .attr("y", 5)
      .attr("class", "finding-text")
      .text(d => d.text);

  // Transition to fade in the findings
  findingGroups.transition()
      .delay((d, i) => i * 300)
      .duration(500)
      .style("opacity", 1);

  // Add mouseover and mouseout effects to the findings
  findingGroups.on("mouseover", function() {
      d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 28)
          .attr("fill", "#e0e0f0");
  }).on("mouseout", function() {
      d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 25)
          .attr("fill", "#f0f0f0");
  });

  // Add call-to-action text
  const callToAction = svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 20)
      .attr("text-anchor", "middle")
      .attr("class", "cta")
      .style("opacity", 0);

  // Define call-to-action texts
  const ctaTexts = [
      "Consider fuel efficiency in your next car purchase! 🚗",
      "Explore electric and hybrid options for better MPG! ⚡",
      "Compare city and highway MPG when choosing a car! 🏙️🛣️",
      "Think about long-term savings from fuel efficiency! 💰"
  ];

  // Initialize the current call-to-action index
  let currentCTA = 0;

  // Function to rotate call-to-action texts
  function rotateCTA() {
      callToAction.transition()
          .duration(500)
          .style("opacity", 0)
          .on("end", function() {
              currentCTA = (currentCTA + 1) % ctaTexts.length;
              callToAction.text(ctaTexts[currentCTA])
                  .transition()
                  .duration(500)
                  .style("opacity", 1);
          });
  }

  // Start rotating call-to-action texts
  rotateCTA();
  setInterval(rotateCTA, 5000);

  // Add data source text
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 90)
      .attr("text-anchor", "middle")
      .attr("class", "data-source")
      .text("Data source: 2017 Automobile Fuel Efficiency Dataset");
}

function updateButtonStates() {
  d3.select("#prev-button")
    .classed("disabled", currentScene === 1)
    .property("disabled", currentScene === 1);
  
  d3.select("#next-button")
    .classed("disabled", currentScene === totalScenes)
    .property("disabled", currentScene === totalScenes);
}
