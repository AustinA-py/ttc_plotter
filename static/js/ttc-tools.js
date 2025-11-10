/**
 * TTC Tools - Specific functionality for traffic control tools
 * Handles line styling and work zone patterns
 */

// Convert feet to approximate meters for Leaflet (rough conversion)
function feetToMeters(feet) {
    return feet * 0.3048;
}

// Convert meters to feet
function metersToFeet(meters) {
    return meters / 0.3048;
}

// Calculate distance between two lat/lng points in meters
function calculateDistance(latlng1, latlng2) {
    return map.distance(latlng1, latlng2);
}

// Get line styling options based on TTC type
function getLineOptions(ttcType) {
    switch(ttcType) {
        case 'lane-closure':
            return {
                color: '#ff0000',
                weight: 6,
                dashArray: '15,10',
                opacity: 0.8
            };
        case 'taper':
            return {
                color: '#ffff00',
                weight: 8,
                dashArray: '12,8',
                opacity: 0.8,
                lineCap: 'round'
            };
        case 'buffer':
            return {
                color: '#ff9900',
                weight: 5,
                dashArray: '10,5,2,5',
                opacity: 0.9
            };
        default:
            return {
                color: '#0066ff',
                weight: 4,
                opacity: 0.7
            };
    }
}

// Create lane closure line
function createLaneClosure(latLngs) {
    const lineOptions = getLineOptions('lane-closure');
    const line = L.polyline(latLngs, lineOptions);
    
    // Add custom properties for TTC functionality
    line.ttcType = 'lane-closure';
    
    // Add to appropriate collection
    ttcFeatures.laneClosures = ttcFeatures.laneClosures || [];
    ttcFeatures.laneClosures.push(line);
    
    return line;
}

// Create taper line
function createTaper(latLngs) {
    const lineOptions = getLineOptions('taper');
    const line = L.polyline(latLngs, lineOptions);
    
    // Add custom properties for TTC functionality
    line.ttcType = 'taper';
    
    // Add to appropriate collection
    ttcFeatures.tapers.push(line);
    
    return line;
}

// Create buffer line
function createBuffer(latLngs) {
    const lineOptions = getLineOptions('buffer');
    const line = L.polyline(latLngs, lineOptions);
    
    // Add custom properties for TTC functionality
    line.ttcType = 'buffer';
    
    // Add to appropriate collection
    ttcFeatures.buffers = ttcFeatures.buffers || [];
    ttcFeatures.buffers.push(line);
    
    return line;
}

// Create hashed fill pattern for work zones
function createWorkZonePattern() {
    // Create SVG pattern for hashed fill
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'workZoneHatch');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '10');
    pattern.setAttribute('height', '10');
    
    // Create diagonal lines for hashing
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '0');
    line1.setAttribute('y1', '0');
    line1.setAttribute('x2', '10');
    line1.setAttribute('y2', '10');
    line1.setAttribute('stroke', '#ffcc00');
    line1.setAttribute('stroke-width', '2');
    
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '0');
    line2.setAttribute('y1', '10');
    line2.setAttribute('x2', '10');
    line2.setAttribute('y2', '0');
    line2.setAttribute('stroke', '#ffcc00');
    line2.setAttribute('stroke-width', '2');
    
    pattern.appendChild(line1);
    pattern.appendChild(line2);
    defs.appendChild(pattern);
    svg.appendChild(defs);
    document.body.appendChild(svg);
}

// Apply work zone styling with hashed fill
function applyWorkZoneStyling(layer) {
    // Ensure pattern exists
    if (!document.getElementById('workZoneHatch')) {
        createWorkZonePattern();
    }
    
    // Apply styling with solid border and hashed fill
    layer.setStyle({
        color: '#ffcc00',           // Solid border color
        weight: 4,                  // Solid border weight
        opacity: 1,                 // Full opacity for border
        fillColor: '#ffcc00',       // Base fill color
        fillOpacity: 0.4,           // Semi-transparent fill
        dashArray: null             // Remove dash array from border (make it solid)
    });
    
    // Apply hashed pattern to the polygon element
    setTimeout(() => {
        const pathElement = layer.getElement();
        if (pathElement) {
            pathElement.style.fill = 'url(#workZoneHatch)';
            pathElement.style.fillOpacity = '0.6';
        }
    }, 100);
}

// Custom draw handler for TTC lines
function setupTTCLineDrawing() {
    map.on('draw:drawstart', function(e) {
        console.log('Draw started:', e.layerType);
    });
    
    map.on('draw:created', function(e) {
        const layer = e.layer;
        const type = e.layerType;
        
        if (type === 'polyline' && currentTool) {
            // Get the drawn line coordinates
            const latLngs = layer.getLatLngs();
            
            if (latLngs.length >= 2) {
                let styledLine;
                
                if (currentTool === 'lane-closure') {
                    styledLine = createLaneClosure(latLngs);
                } else if (currentTool === 'taper') {
                    styledLine = createTaper(latLngs);
                } else if (currentTool === 'buffer') {
                    styledLine = createBuffer(latLngs);
                }
                
                if (styledLine) {
                    // Remove the temporary draw layer and add our styled line
                    drawnItems.removeLayer(layer);
                    drawnItems.addLayer(styledLine);
                    updateFeatureCount();
                }
            }
        } else if (type === 'polygon' && currentTool === 'work-location-polygon') {
            // Apply work zone styling with hashed fill
            applyWorkZoneStyling(layer);
            
            ttcFeatures.workZones.push(layer);
        }
        
        // Keep the tool active for continued drawing
        if (currentTool === 'work-location-polygon' || currentTool === 'lane-closure' || currentTool === 'taper' || currentTool === 'buffer') {
            setTimeout(() => {
                if (map.drawControl && map.drawControl._toolbars && map.drawControl._toolbars.draw) {
                    const toolMode = currentTool === 'work-location-polygon' ? 'polygon' : 'polyline';
                    const modeButton = map.drawControl._toolbars.draw._modes[toolMode];
                    if (modeButton && modeButton.handler) {
                        modeButton.handler.enable();
                    }
                }
            }, 100);
        }
    });
    
    map.on('draw:drawstop', function(e) {
        // Don't automatically disable the tool - let user continue drawing
        console.log('Draw stopped, tool remains active');
    });
}