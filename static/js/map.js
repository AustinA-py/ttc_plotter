/**
 * TTC Plotter - Main Map Functionality
 * Handles map initialization and base layers
 */

// Global map instance
let map;
let drawnItems;
let currentTool = null;

// Feature collections for different TTC elements
let ttcFeatures = {
    workZones: [],
    workPoints: [],
    laneClosures: [],
    tapers: [],
    buffers: [],
    warningSigns: []
};

// Initialize the map
function initializeMap() {
    // Create map centered on a default location (can be changed)
    map = L.map('map', {
        center: [39.8283, -98.5795], // Center of USA - change as needed
        zoom: 13,
        zoomControl: true
    });

    // Add satellite imagery base layer (using Google Satellite)
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 22
    }).addTo(map);

    // Create a layer group for drawn items
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize map event listeners
    initializeMapEvents();
    
    console.log('Map initialized successfully');
}

// Initialize map event listeners
function initializeMapEvents() {
    // Track mouse coordinates
    map.on('mousemove', function(e) {
        updateCursorCoordinates(e.latlng);
    });

    // Handle map clicks for different tools
    map.on('click', function(e) {
        if (currentTool) {
            handleToolClick(e);
        }
    });

    // Update feature count when features are added/removed
    map.on('draw:created', function(e) {
        drawnItems.addLayer(e.layer);
        updateFeatureCount();
    });

    map.on('draw:deleted', function(e) {
        updateFeatureCount();
    });

    // Update zoom display
    map.on('zoom', function(e) {
        updateZoomDisplay();
    });

    // Handle drawing events for measurements
    map.on('draw:drawstart', function(e) {
        // Drawing started - no need to show measurement display
    });

    map.on('draw:drawstop', function(e) {
        // Drawing stopped - no need to hide measurement display
    });

    map.on('draw:drawvertex', function(e) {
        updateCurrentSegmentLength(e);
    });

    // Initial zoom update
    updateZoomDisplay();
}

// Update cursor coordinates display
function updateCursorCoordinates(latlng) {
    const coords = document.getElementById('cursor-coordinates');
    if (coords) {
        coords.textContent = `Coordinates: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
}

// Update zoom display
function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('map-zoom');
    if (zoomDisplay) {
        zoomDisplay.textContent = `Zoom: ${map.getZoom()}`;
    }
}

// Update current segment length during drawing
function updateCurrentSegmentLength(e) {
    if (!e.layers || !currentTool) return;
    
    const layers = e.layers.getLayers();
    if (layers.length < 1) return;
    
    const layer = layers[0];
    let length = 0;
    
    if (layer.getLatLngs) {
        const latLngs = layer.getLatLngs();
        
        if (currentTool === 'work-location-polygon' && latLngs.length > 0) {
            // For polygons, show the length of the current segment being drawn
            const coords = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
            
            if (coords.length >= 2) {
                // Calculate length of the last segment
                const lastSegment = coords.slice(-2);
                length = calculateDistance(lastSegment[0], lastSegment[1]);
            }
        } else if (latLngs.length >= 2) {
            // For lines, show total length
            for (let i = 0; i < latLngs.length - 1; i++) {
                length += calculateDistance(latLngs[i], latLngs[i + 1]);
            }
        }
    }
    
    // Update status bar measurement info only
    const measurementInfo = document.getElementById('measurement-info');
    if (measurementInfo) {
        const measurementType = currentTool === 'work-location-polygon' ? 'Segment' : 'Length';
        measurementInfo.textContent = `${measurementType}: ${metersToFeet(length).toFixed(1)} ft`;
    }
}

// Update feature count display
function updateFeatureCount() {
    const totalFeatures = Object.values(ttcFeatures).reduce((sum, arr) => sum + arr.length, 0);
    const counter = document.getElementById('feature-count');
    if (counter) {
        counter.textContent = `Features: ${totalFeatures}`;
    }
}

// Handle tool clicks on the map
function handleToolClick(e) {
    switch(currentTool) {
        case 'work-location-point':
            createWorkLocationPoint(e.latlng);
            break;
        case 'warning-sign':
            createWarningSign(e.latlng);
            break;
        // Polygon and line tools will be handled by draw controls
        default:
            console.log('Tool not implemented for click:', currentTool);
    }
}

// Create work location point
function createWorkLocationPoint(latlng) {
    const workPoint = L.marker(latlng, {
        icon: L.divIcon({
            className: 'work-point-icon',
            html: '<i class="fas fa-star"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    });

    // Set default attributes
    workPoint.ttcAttributes = {
        type: 'work-point',
        title: 'Work Point'
    };

    console.log('Work point created with attributes:', workPoint.ttcAttributes); // Debug

    workPoint.addTo(drawnItems);
    ttcFeatures.workPoints.push(workPoint);
    updateFeatureCount();
    
    // Set up initial display first
    updateFeatureDisplay(workPoint);
    
    // Show properties panel for user to set title
    showFeatureProperties(workPoint);
    
    console.log('Work location point created at:', latlng);
}

// Create warning sign
function createWarningSign(latlng) {
    const warningSign = L.marker(latlng, {
        icon: L.divIcon({
            className: 'warning-sign-icon',
            html: '<i class="fas fa-exclamation-triangle"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    });

    // Set default attributes
    warningSign.ttcAttributes = {
        type: 'warning-sign',
        signType: 'Lane Closed'
    };

    console.log('Warning sign created with attributes:', warningSign.ttcAttributes); // Debug

    warningSign.addTo(drawnItems);
    ttcFeatures.warningSigns.push(warningSign);
    
    // Show properties panel for user to set sign type
    showFeatureProperties(warningSign);
    
    // Set up initial display
    updateFeatureDisplay(warningSign);
    updateFeatureCount();
    
    console.log('Warning sign created at:', latlng);
}

// Set current tool
function setCurrentTool(toolName) {
    currentTool = toolName;
    updateToolDisplay();
    
    // Remove previous draw controls if any
    if (map.drawControl) {
        map.removeControl(map.drawControl);
        map.drawControl = null;
    }
    
    // Reset cursor style
    document.getElementById('map').style.cursor = '';
    
    // Add appropriate draw controls for polygon and line tools
    if (toolName === 'work-location-polygon') {
        addPolygonDrawControl();
        // Immediately start polygon drawing
        setTimeout(() => {
            if (map.drawControl && map.drawControl._toolbars && map.drawControl._toolbars.draw) {
                const polygonButton = map.drawControl._toolbars.draw._modes.polygon;
                if (polygonButton && polygonButton.handler) {
                    polygonButton.handler.enable();
                }
            }
        }, 100);
    } else if (toolName === 'lane-closure' || toolName === 'taper' || toolName === 'buffer') {
        addLineDrawControl(toolName);
        // Immediately start line drawing
        setTimeout(() => {
            if (map.drawControl && map.drawControl._toolbars && map.drawControl._toolbars.draw) {
                const polylineButton = map.drawControl._toolbars.draw._modes.polyline;
                if (polylineButton && polylineButton.handler) {
                    polylineButton.handler.enable();
                }
            }
        }, 100);
    } else if (toolName === 'work-location-point' || toolName === 'warning-sign') {
        // Set crosshair cursor for point tools
        document.getElementById('map').style.cursor = 'crosshair';
    }
}

// Add polygon draw control for work zones
function addPolygonDrawControl() {
    const drawControl = new L.Control.Draw({
        edit: false,
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: false, // Disable area display
                showLength: true, // Enable length display
                metric: false,   // Use imperial units
                feet: true,      // Use feet specifically
                shapeOptions: {
                    color: '#ffcc00',
                    fillColor: '#ffcc00',
                    fillOpacity: 0.3,
                    fillPattern: 'diagonal-hatch'
                },
                // Custom measurement function to show feet
                drawError: {
                    color: '#e74c3c',
                    message: '<strong>Error:</strong> shape edges cannot cross!'
                }
            },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });
    
    // Override the measurement display to show current side length in feet
    if (L.Draw.Polygon) {
        // Store the original method if it exists
        if (!L.Draw.Polygon.prototype._originalGetMeasurementString) {
            L.Draw.Polygon.prototype._originalGetMeasurementString = L.Draw.Polygon.prototype._getMeasurementString;
        }
        
        L.Draw.Polygon.prototype._getMeasurementString = function() {
            // Calculate current side length if we have at least one point and cursor position
            if (this._markers && this._markers.length >= 1 && this._currentLatLng) {
                const lastMarker = this._markers[this._markers.length - 1];
                const distance = map.distance(lastMarker.getLatLng(), this._currentLatLng);
                const distanceInFeet = metersToFeet(distance);
                
                return distanceInFeet.toFixed(1) + ' ft side';
            }
            
            // If no current side, show instruction
            return 'Click to start polygon';
        };
    }
    
    map.addControl(drawControl);
    map.drawControl = drawControl;
}

// Add line draw control for TTC line tools
function addLineDrawControl(toolType) {
    let lineOptions;
    switch(toolType) {
        case 'lane-closure':
            lineOptions = { color: '#ff0000', weight: 6, dashArray: '15,10' };
            break;
        case 'taper':
            lineOptions = { color: '#ff9900', weight: 8, dashArray: '12,8' };
            break;
        case 'buffer':
            lineOptions = { color: '#ffff00', weight: 5, dashArray: '10,5,2,5' };
            break;
        default:
            lineOptions = { color: '#0066ff', weight: 4 };
    }
    
    const drawControl = new L.Control.Draw({
        edit: false,
        draw: {
            polyline: {
                shapeOptions: lineOptions,
                showLength: true,
                metric: false,  // Use imperial units
                feet: true      // Use feet specifically
            },
            polygon: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });
    
    // Override the measurement display to show feet for polylines
    if (L.Draw.Polyline) {
        // Store the original method if it exists
        if (!L.Draw.Polyline.prototype._originalGetMeasurementString) {
            L.Draw.Polyline.prototype._originalGetMeasurementString = L.Draw.Polyline.prototype._getMeasurementString;
        }
        
        L.Draw.Polyline.prototype._getMeasurementString = function() {
            if (!this._currentLatLng || !this._markers || this._markers.length === 0) {
                return 'Click to start line';
            }
            
            const currentLatLng = this._currentLatLng;
            const previousLatLng = this._markers[this._markers.length - 1].getLatLng();
            
            let distance;
            if (this._markers.length > 1) {
                // Calculate total distance
                distance = 0;
                for (let i = 0; i < this._markers.length - 1; i++) {
                    distance += map.distance(this._markers[i].getLatLng(), this._markers[i + 1].getLatLng());
                }
                // Add distance to current position
                distance += map.distance(previousLatLng, currentLatLng);
            } else {
                // Just the distance from first point to cursor
                distance = map.distance(previousLatLng, currentLatLng);
            }
            
            return metersToFeet(distance).toFixed(1) + ' ft total';
        };
    }
    
    map.addControl(drawControl);
    map.drawControl = drawControl;
}

// Update tool display
function updateToolDisplay() {
    const toolDisplay = document.getElementById('current-tool');
    if (toolDisplay) {
        const toolNames = {
            'work-location-polygon': 'Work Zone (Polygon) - Click to draw',
            'work-location-point': 'Work Point - Click to place',
            'lane-closure': 'Lane Closure - Draw line',
            'taper': 'Taper - Draw line',
            'buffer': 'Buffer - Draw line',
            'warning-sign': 'Warning Sign - Click to place'
        };
        
        toolDisplay.textContent = currentTool 
            ? `Tool: ${toolNames[currentTool] || currentTool}` 
            : 'Tool: None - Select a tool from sidebar';
    }
    
    // Update measurement info when tool changes
    const measurementInfo = document.getElementById('measurement-info');
    if (measurementInfo) {
        if (currentTool === 'work-location-polygon') {
            measurementInfo.textContent = 'Measurement: Ready to draw polygon';
        } else if (currentTool === 'lane-closure') {
            measurementInfo.textContent = 'Measurement: Draw lane closure line';
        } else if (currentTool === 'taper') {
            measurementInfo.textContent = 'Measurement: Draw taper line';
        } else if (currentTool === 'buffer') {
            measurementInfo.textContent = 'Measurement: Draw buffer line';
        } else if (currentTool === 'work-location-point' || currentTool === 'warning-sign') {
            measurementInfo.textContent = 'Measurement: Point placement';
        } else {
            measurementInfo.textContent = 'Measurement: --';
        }
    }
}

// Clear current tool
function clearCurrentTool() {
    // Disable any active drawing handlers
    if (map.drawControl && map.drawControl._toolbars && map.drawControl._toolbars.draw) {
        Object.values(map.drawControl._toolbars.draw._modes).forEach(mode => {
            if (mode.handler && mode.handler.enabled && mode.handler.enabled()) {
                mode.handler.disable();
            }
        });
    }
    
    currentTool = null;
    updateToolDisplay();
    
    // Reset cursor style
    document.getElementById('map').style.cursor = '';
    
    // Remove draw controls
    if (map.drawControl) {
        map.removeControl(map.drawControl);
        map.drawControl = null;
    }
}

// Clear all features
function clearAllFeatures() {
    if (confirm('Are you sure you want to clear all features? This action cannot be undone.')) {
        drawnItems.clearLayers();
        
        // Reset feature collections
        ttcFeatures = {
            workZones: [],
            workPoints: [],
            laneClosures: [],
            tapers: [],
            buffers: [],
            warningSigns: []
        };
        
        updateFeatureCount();
        console.log('All features cleared');
    }
}

// Get all features as GeoJSON
function getAllFeaturesAsGeoJSON() {
    const geoJSON = {
        type: 'FeatureCollection',
        features: []
    };
    
    drawnItems.eachLayer(function(layer) {
        if (layer.toGeoJSON) {
            const feature = layer.toGeoJSON();
            
            // Add TTC-specific properties
            if (layer.ttcAttributes) {
                // Include all TTC attributes in properties
                feature.properties = {
                    ...feature.properties,
                    ...layer.ttcAttributes
                };
            } else if (layer.options && layer.options.icon && layer.options.icon.options.className) {
                // Fallback for legacy features
                feature.properties.ttcType = layer.options.icon.options.className.replace('-icon', '');
            }
            
            geoJSON.features.push(feature);
        }
    });
    
    return geoJSON;
}

// Load features from GeoJSON
function loadFeaturesFromGeoJSON(geoJSON) {
    clearAllFeatures();
    
    if (geoJSON && geoJSON.features) {
        geoJSON.features.forEach(function(feature) {
            const props = feature.properties;
            const geom = feature.geometry;
            let layer;
            
            // Determine TTC type from properties
            const ttcType = props.type || props.ttcType;
            
            // Create layer based on geometry type and TTC type
            if (geom.type === 'Point') {
                const latlng = [geom.coordinates[1], geom.coordinates[0]];
                
                if (ttcType === 'work-point') {
                    layer = L.marker(latlng, {
                        icon: L.divIcon({
                            className: 'work-point-icon',
                            html: '<i class="fas fa-star"></i>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    });
                    if (typeof ttcFeatures !== 'undefined') {
                        ttcFeatures.workPoints.push(layer);
                    }
                } else if (ttcType === 'warning-sign') {
                    layer = L.marker(latlng, {
                        icon: L.divIcon({
                            className: 'warning-sign-icon',
                            html: '<i class="fas fa-exclamation-triangle"></i>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    });
                    if (typeof ttcFeatures !== 'undefined') {
                        ttcFeatures.warningSigns.push(layer);
                    }
                } else {
                    // Skip unknown point types to avoid creating default blue markers
                    console.warn('Unknown point feature type:', ttcType, 'Skipping feature.');
                    return;
                }
                
            } else if (geom.type === 'Polygon') {
                // Work zone polygon
                if (ttcType === 'work-zone') {
                    const coords = geom.coordinates[0].map(coord => [coord[1], coord[0]]);
                    layer = L.polygon(coords, {
                        color: '#ffcc00',
                        fillColor: '#ffcc00',
                        fillOpacity: 0.3
                    });
                    if (typeof ttcFeatures !== 'undefined') {
                        ttcFeatures.workZones.push(layer);
                    }
                } else {
                    console.warn('Unknown polygon feature type:', ttcType, 'Skipping feature.');
                    return;
                }
                
            } else if (geom.type === 'LineString') {
                // Line features (lane closure, taper, buffer)
                const coords = geom.coordinates.map(coord => [coord[1], coord[0]]);
                let lineStyle;
                
                switch (ttcType) {
                    case 'lane-closure':
                        lineStyle = { color: '#ff0000', weight: 6, dashArray: '15,10' };
                        break;
                    case 'taper':
                        lineStyle = { color: '#ff9900', weight: 8, dashArray: '12,8' };
                        break;
                    case 'buffer':
                        lineStyle = { color: '#ffff00', weight: 5, dashArray: '10,5,2,5' };
                        break;
                    default:
                        console.warn('Unknown line feature type:', ttcType, 'Skipping feature.');
                        return;
                }
                
                layer = L.polyline(coords, lineStyle);
                
                // Add to appropriate ttcFeatures collection after creating layer
                if (typeof ttcFeatures !== 'undefined') {
                    if (ttcType === 'lane-closure') ttcFeatures.laneClosures.push(layer);
                    else if (ttcType === 'taper') ttcFeatures.tapers.push(layer);
                    else if (ttcType === 'buffer') ttcFeatures.buffers.push(layer);
                }
            } else {
                console.warn('Unknown geometry type:', geom.type, 'Skipping feature.');
                return;
            }
            
            if (layer) {
                // Restore TTC attributes
                layer.ttcAttributes = {
                    type: ttcType,
                    title: props.title,
                    position: props.position,
                    signType: props.signType,
                    labelOffset: props.labelOffset,
                    labelFontSize: props.labelFontSize
                };
                
                // Add to map
                layer.addTo(drawnItems);
                
                // Update feature display (labels, etc.)
                if (typeof updateFeatureDisplay === 'function') {
                    updateFeatureDisplay(layer);
                }
            }
        });
        
        updateFeatureCount();
    }
}