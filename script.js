// Nastavení mapy, jejího středu a úrovně přiblížení
var map = L.map('map').setView([50, 16], 7);

// PODKLADOVE MAPY - https://leaflet-extras.github.io/leaflet-providers/preview/

// Určení podkladové mapy, maximální úrovně přiblížení a zdroje dat
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


// Přidání ortofota jako WMS služby, určení vrstvy, formátu a průhlednosti
var ZTM = L.tileLayer.wms("https://ags.cuzk.gov.cz/arcgis1/services/ZTM/ZTM25/MapServer/WMSServer", {
    layers: "0",  // 
    format: "image/png",
    transparent: false,
    attribution: "&copy; <a href='https://www.cuzk.cz'>ČÚZK</a>"
});


var voj = L.tileLayer.wms("http://www.chartae-antiquae.cz/WMS/Military3/", {
    layers: "Military3",               // název vrstvy
    format: "image/png",
    transparent: true,                 // pokud má být nad jinou mapou
    attribution: "&copy; <a href='http://www.chartae-antiquae.cz/'>Chartae Antiquae</a>"
});

// Proměnná uchovávající podkladové mapy, mezi kterými chceme přepínat
var baseMaps = {
    "OpenStreetMap": osm, // "popis mapy": nazevPromenne
    "ZTM 25 ČR": ZTM,
    "III. vojenské mapování": voj,

};

// Grafické přepínání podkladových map
var layerControl = L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);






////////////////////////////////////////////////////////////KARTOGRAM//////////////////////////////////////////////////////////////////////




// Načtení GeoJSONu s polygony ORP do mapy
var OKR_L = L.geoJSON(OKR,{
    style: kartogram,
    onEachFeature: onEachFeature 
}).addTo(map);


function getColor(d) {
return d > 20 ? '#800026' :
        d > 19.5 ? '#BD0026' :
        d > 18.0  ? '#E31A1C' :
        d > 16.5  ? '#FC4E2A' :
        d > 15.5  ? '#FD8D3C' :
        '#FFEDA0'; // Výchozí barva
}
// Styl kartogramu
function kartogram(feature) {
return {
    fillColor: getColor((feature.properties.OBYV_65/feature.properties.POCET_OBYV)*100), // Styl na základě atributu "hustota"
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
};
}

// Výběr prvku po najetí kurzorem myši
function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.75
    });
    
    layer.bringToFront()
    OKDp.bringToFront()
    ageGroups.bringToFront(); // PRIDANI VRSTVY KARTODIAGRAMU
}
// Resetování stylu kartogramu po zrušení jeho výběru myší
function resetHighlight(e) {
    OKR_L.resetStyle(e.target);
}

// Přiblížení na vybraný polygon po kliknutí myší
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// Přístup k jednotlivým polygonů ve vrstvě
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// Vytvoření legendy a nastavení její pozice
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        grades = [14.2, 15.5, 16.5, 18.0, 20.0], // Hranice intervalů - zjištěn rozpt. v arcgis -> 
        labels = [];

    div.innerHTML += '<h4>Podíl seniorů [%]</h4>'; // Nadpis legendy

    // Procházení intervalů hustoty - pro každý interval se vygeneruje štítek s barevným čtvercem.
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }

    return div;
};

// Přidání legendy do mapy
legend.addTo(map);




////////////////////////////////////////////////////////////////////////KARTODIAGRAM/////////////////////////////////////////////////////////////////////////////////


// 1. Funkce pro škálování hodnoty na radius
function scaleRadius(nadeje) {
    const minVal = 75;
    const maxVal = 80;
    const minRadius = 5;
    const maxRadius = 12;

    if (typeof nadeje !== 'number' || isNaN(nadeje)) return minRadius;

    const clamped = Math.max(minVal, Math.min(nadeje, maxVal));
    return ((clamped - minVal) / (maxVal - minVal)) * (maxRadius - minRadius) + minRadius;
}




// 1. Načtení GeoJSON vrstev do mapy
var OKDp = L.geoJSON(OKR_B, {
    pointToLayer: function (feature, latlng) {
        var nadejeMuzi = feature.properties.NADEJE_DOZ_MUZI;
        var nadejeZeny = feature.properties.NADEJE_DOZ_ZENY;

        var nadeje = (nadejeMuzi + nadejeZeny) / 2;
        var radiusDiagram = scaleRadius(nadeje);

        return L.circleMarker(latlng, {
            radius: radiusDiagram,
            fillColor: "rgb(255, 230, 4)",
            color: "#000",
            weight: 1.5,
            fillOpacity: 0.8,
            opacity: 1
        });
    }
}).addTo(map); 

/// 3. Legenda
var diagramLegend = L.control({ position: 'bottomright' });

diagramLegend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    var hodnoty = [75, 76, 77, 78, 79, 80]; // hodnoty v arcgis pro -> po jednom roce
    var labels = [];

    div.innerHTML += '<h4>Naděje dožití [let]</h4>';

    hodnoty.forEach(h => {
        const radius = scaleRadius(h);
        labels.push(`
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <i style="
                    background: rgb(255, 230, 4); 
                    width: ${radius * 2}px; 
                    height: ${radius * 2}px; 
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 10px;
                    flex-shrink: 0;
                    border: 1.5px solid black;">
                </i> 
                <span>${h}</span>
            </div>`);
    });

    div.innerHTML += labels.join('');
    return div;
};

diagramLegend.addTo(map);



//////////////////////////////////////////////////////////////////VYSECOVY GRAF/////////////////////////////////////////////////////////////////////////////////////;



// Funkce pro přiřazení akcí k polygonům (okresy)
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function (e) {
            console.table(feature.properties); // Výpis vlastností do konzole
            vykresliPieChartDoPole2(feature);  // Vykreslení výsečového grafu do pole2
        }
    });
}

function vykresliPieChartDoPole2(feature) {
    // Vyprázdní kontejner
    d3.select("#pole2").html("");

    // Přidáme nadpis (např. jméno okresu)
    d3.select("#pole2")
      .append("h2")
      .text(`Věkové rozdělení okresu: ${feature.properties.NAZ_LAU1 || 'N/A'}`);

    const data = [
        { label: "0–14 let", value: feature.properties.OBYV_0_14 },
        { label: "15–64 let", value: feature.properties.OBYV_15_64 },
        { label: "65+ let", value: feature.properties.OBYV_65 }
    ];

    const width = 120;
    const height = 120;
    const radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.label))
        .range(["#4f81bd", "#9bbb59", "#c0504d"]); // Modrá, zelená, červená

    const svg = d3.select("#pole2")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Kreslení výsečí
    svg.selectAll('path')
        .data(pie(data))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', '1.5px');

    // Přidání legendy do #pole2 - legenda pod grafem
    const legend = d3.select("#pole2")
        .append("div")
        .attr("class", "legend")
        .style("margin-top", "10px");

    data.forEach(d => {
        
        legend.append("div").html(`
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
            
                <div style="
                    width: 14px; 
                    height: 14px; 
                    background: ${color(d.label)}; 
                    border-radius: 50%; 
                    margin-right: 8px;
                    flex-shrink: 0;
                    border: 1px solid #000;">
                </div>
                <span>${d.label}: ${d.value.toLocaleString()}</span>
            </div>
        `);
        

    });
}





function zmena() {
    const bodyElement = document.body;
    const nadpisElement = document.querySelector('h3');
    
    if (!nadpisElement) return;
  
    // Původní obrázek a nový obrázek
    const puvodniPozadi = 'url("pozadi2.jpg")';
    const novePozadi = 'url("pozadi1.jpg")';
  
    // Nové hodnoty pro nadpis (můžeš upravit dle potřeby)
    const puvodniNadpis = 'rgb(106, 0, 0)';
    const novyNadpis = 'rgb(106, 0, 0)'; // pro ukázku zelená
    const puvodniVelikost = '1.17em';
    const novaVelikost = '1.4em';
  
    // Získám aktuální hodnotu background-image (přes computed style)
    const aktualniPozadi = getComputedStyle(bodyElement).backgroundImage;
  
    // Přepínám obrázky pozadí
    if (aktualniPozadi.includes('pozadi1.jpg')) {
      // Pokud je aktuálně pozadi1, přepni na pozadi2
      bodyElement.style.backgroundImage = puvodniPozadi;
      nadpisElement.style.color = puvodniNadpis;
      nadpisElement.style.fontSize = puvodniVelikost;
    } else {
      // Jinak přepni na pozadi1
      bodyElement.style.backgroundImage = novePozadi;
      nadpisElement.style.color = novyNadpis;
      nadpisElement.style.fontSize = novaVelikost;
    }
  }
  


