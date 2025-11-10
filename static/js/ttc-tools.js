/**
 * TTC Tools - Specific functionality for traffic control tools
 * Handles line styling and work zone patterns
 */

console.log('TTC Tools script loading...'); // Debug

// Flag to prevent interference during apply process
let isProcessingApply = false;

// Store last applied values for reset functionality
let lastAppliedValues = {};

console.log('TTC Tools script loaded, isProcessingApply initialized'); // Debug

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

// Show feature properties panel
function showFeatureProperties(layer) {
    console.log('=== showFeatureProperties START ===');
    console.log('showFeatureProperties called for layer:', layer); // Debug statement
    console.log('Layer type:', layer?.ttcAttributes?.type);
    console.log('Layer has ttcAttributes:', !!layer?.ttcAttributes);
    
    const panel = document.getElementById('properties-panel');
    const propertiesDiv = document.getElementById('feature-properties');
    
    console.log('Panel element found:', !!panel);
    console.log('Properties div found:', !!propertiesDiv);
    
    if (!panel) {
        console.error('Properties panel element not found');
        return;
    }
    
    if (!propertiesDiv) {
        console.error('Feature properties div not found');
        return;
    }
    
    if (!layer || !layer.ttcAttributes) {
        console.error('Layer has no attributes:', layer);
        return;
    }
    
    console.log('Layer attributes:', layer.ttcAttributes); // Debug statement
    
    // Clear previous content
    propertiesDiv.innerHTML = '';
    
    // Store reference to current layer
    panel.currentLayer = layer;
    
    // Create form based on feature type
    const formHTML = createAttributeForm(layer.ttcAttributes, layer);
    propertiesDiv.innerHTML = formHTML;
    
    // Add real-time update event listeners to all form inputs
    addRealTimeUpdateListeners(panel, layer);
    
    // Initialize last applied values if they don't exist
    if (!lastAppliedValues[layer._leaflet_id]) {
        lastAppliedValues[layer._leaflet_id] = {
            labelEnabled: layer.ttcAttributes.labelEnabled !== false,
            labelOffsetX: layer.ttcAttributes.labelOffsetX !== undefined ? layer.ttcAttributes.labelOffsetX : 0,
            labelOffsetY: layer.ttcAttributes.labelOffsetY !== undefined ? layer.ttcAttributes.labelOffsetY : 25,
            labelFontSize: layer.ttcAttributes.labelFontSize !== undefined ? layer.ttcAttributes.labelFontSize : 12,
            labelRotation: layer.ttcAttributes.labelRotation !== undefined ? layer.ttcAttributes.labelRotation : calculateDefaultRotation(layer)
        };
    }
    
    // Show panel by removing all hiding styles
    panel.classList.remove('hidden');
    panel.style.display = '';  // Clear inline display style
    panel.style.visibility = '';  // Clear inline visibility style
    
    console.log('Properties panel should now be visible'); // Debug statement
    
    // Update status
    const measurementInfo = document.getElementById('measurement-info');
    if (measurementInfo) {
        measurementInfo.textContent = 'Measurement: Editing feature attributes';
    }
}

// Calculate the default rotation value for a feature
function calculateDefaultRotation(layer) {
    if (!layer || !layer.ttcAttributes) return 0;
    
    // Point features (warning-sign, work-point, custom-label) have 0 rotation by default
    if (layer.ttcAttributes.type === 'warning-sign' || layer.ttcAttributes.type === 'work-point' || layer.ttcAttributes.type === 'custom-label') {
        return 0;
    }
    
    // For line features, calculate the angle
    if (layer.getLatLngs) {
        const latlngs = layer.getLatLngs();
        if (latlngs && latlngs.length >= 2) {
            const midIndex = Math.floor(latlngs.length / 2);
            let startPoint, endPoint;
            
            if (latlngs.length === 2) {
                startPoint = latlngs[0];
                endPoint = latlngs[1];
            } else {
                startPoint = latlngs[midIndex - 1] || latlngs[0];
                endPoint = latlngs[midIndex] || latlngs[latlngs.length - 1];
            }
            
            const map = layer._map;
            if (map) {
                const startScreenPoint = map.latLngToContainerPoint(startPoint);
                const endScreenPoint = map.latLngToContainerPoint(endPoint);
                
                const deltaX = endScreenPoint.x - startScreenPoint.x;
                const deltaY = endScreenPoint.y - startScreenPoint.y;
                return Math.round(Math.atan2(deltaY, deltaX) * (180 / Math.PI));
            }
        }
    }
    
    return 0;
}

// Create attribute form HTML based on feature type
function createAttributeForm(attributes, layer) {
    console.log('Creating attribute form for:', attributes); // Debug
    
    let formHTML = `<div class="feature-type"><strong>Feature Type:</strong> ${attributes.type.replace('-', ' ').toUpperCase()}</div><br>`;
    
    switch (attributes.type) {
        case 'work-zone':
            formHTML += `
                <div class="form-group">
                    <label for="feature-title">Title:</label>
                    <input type="text" id="feature-title" value="${attributes.title}" placeholder="Enter work zone title">
                </div>
            `;
            break;
            
        case 'lane-closure':
        case 'taper':
        case 'buffer':
            formHTML += `
                <div class="form-group">
                    <label for="feature-position">Position:</label>
                    <select id="feature-position">
                        <option value="Advanced" ${attributes.position === 'Advanced' ? 'selected' : ''}>Advanced</option>
                        <option value="Post" ${attributes.position === 'Post' ? 'selected' : ''}>Post</option>
                    </select>
                </div>
            `;
            break;
            
        case 'warning-sign':
            formHTML += `
                <div class="form-group">
                    <label for="feature-sign-type">Sign Type:</label>
                    <select id="feature-sign-type">
                        <option value="Lane Closed" ${attributes.signType === 'Lane Closed' ? 'selected' : ''}>Lane Closed</option>
                        <option value="Shoulder Closed" ${attributes.signType === 'Shoulder Closed' ? 'selected' : ''}>Shoulder Closed</option>
                        <option value="Road Work Ahead" ${attributes.signType === 'Road Work Ahead' ? 'selected' : ''}>Road Work Ahead</option>
                    </select>
                </div>
            `;
            break;
            
        case 'work-point':
            formHTML += `
                <div class="form-group">
                    <label for="feature-title">Title:</label>
                    <input type="text" id="feature-title" value="${attributes.title}" placeholder="Enter work point title">
                </div>
            `;
            break;
            
        case 'custom-label':
            formHTML += `
                <div class="form-group">
                    <label for="feature-title">Label Text:</label>
                    <input type="text" id="feature-title" value="${attributes.title}" placeholder="Enter label text">
                </div>
            `;
            break;
    }
    
    // Add collapsible Advanced Labeling Properties section for all feature types
    formHTML += `
        <hr style="margin: 15px 0; border: 1px solid #ddd;">
        <div class="advanced-labeling-section">
            <div class="collapsible-header" onclick="toggleAdvancedLabeling(this)">
                <span>Labeling Properties</span>
                <span class="collapse-arrow">▼</span>
            </div>
            <div class="collapsible-content" style="display: none;">
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="feature-label-enabled" ${attributes.labelEnabled !== false ? 'checked' : ''}>
                        <span>Display Label</span>
                    </label>
                </div>
    `;
    
    // Add label offset for non-work-zone features
    if (attributes.type !== 'work-zone') {
        formHTML += `
            <div class="form-group">
                <label for="feature-label-offset-x">Label X Offset (pixels):</label>
                <input type="number" id="feature-label-offset-x" value="${attributes.labelOffsetX !== undefined ? attributes.labelOffsetX : 0}" min="-100" max="100" step="5">
            </div>
            <div class="form-group">
                <label for="feature-label-offset-y">Label Y Offset (pixels):</label>
                <input type="number" id="feature-label-offset-y" value="${attributes.labelOffsetY !== undefined ? attributes.labelOffsetY : 25}" min="-100" max="100" step="5">
            </div>
        `;
    }
    
    // Add font size for all features
    formHTML += `
            <div class="form-group">
                <label for="feature-label-font-size">Label Font Size (pixels):</label>
                <input type="number" id="feature-label-font-size" value="${attributes.labelFontSize !== undefined ? attributes.labelFontSize : 12}" min="8" max="24" step="1">
            </div>
            <div class="form-group">
                <label for="feature-label-rotation">Label Rotation (degrees):</label>
                <input type="number" id="feature-label-rotation" value="${attributes.labelRotation !== undefined ? attributes.labelRotation : (layer ? calculateDefaultRotation(layer) : 0)}" min="-180" max="180" step="5">
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <button type="button" id="reset-labeling-btn" onclick="resetLabelingValues()" style="background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Reset to Last Applied Values
                </button>
            </div>
        </div>
    </div>
    `;
    
    console.log('Generated form HTML:', formHTML); // Debug
    return formHTML;
}

// Reset labeling values to last applied values
function resetLabelingValues() {
    const panel = document.getElementById('properties-panel');
    const layer = panel?.currentLayer;
    
    if (!layer || !lastAppliedValues[layer._leaflet_id]) {
        console.log('No last applied values found for reset');
        return;
    }
    
    const values = lastAppliedValues[layer._leaflet_id];
    
    // Reset label enabled state
    const labelEnabledInput = document.getElementById('feature-label-enabled');
    if (labelEnabledInput) labelEnabledInput.checked = values.labelEnabled !== false;
    
    // Reset form inputs to last applied values
    if (layer.ttcAttributes.type !== 'work-zone') {
        const offsetXInput = document.getElementById('feature-label-offset-x');
        const offsetYInput = document.getElementById('feature-label-offset-y');
        if (offsetXInput) offsetXInput.value = values.labelOffsetX !== undefined ? values.labelOffsetX : 0;
        if (offsetYInput) offsetYInput.value = values.labelOffsetY !== undefined ? values.labelOffsetY : 25;
    }
    
    const fontSizeInput = document.getElementById('feature-label-font-size');
    const rotationInput = document.getElementById('feature-label-rotation');
    
    if (fontSizeInput) fontSizeInput.value = values.labelFontSize !== undefined ? values.labelFontSize : 12;
    if (rotationInput) rotationInput.value = values.labelRotation !== undefined ? values.labelRotation : calculateDefaultRotation(layer);
    
    // Apply the reset values immediately
    updateFeatureFromForm(layer);
}

// Toggle advanced labeling properties section
function toggleAdvancedLabeling(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.collapse-arrow');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▲';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▼';
    }
}

// Add real-time update listeners to form inputs
function addRealTimeUpdateListeners(panel, layer) {
    console.log('Adding real-time update listeners'); // Debug
    
    // Get all input elements in the properties panel
    const inputs = panel.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        // Add event listeners for different input types
        const eventType = input.type === 'range' || input.type === 'number' ? 'input' : 'change';
        
        input.addEventListener(eventType, () => {
            console.log('Input changed:', input.id, 'new value:', input.value); // Debug
            updateFeatureFromForm(layer);
        });
    });
}

// Update feature attributes and display in real-time (without hiding panel)
function updateFeatureFromForm(layer) {
    console.log('Real-time update for layer:', layer.ttcAttributes.type); // Debug
    
    if (!layer || !layer.ttcAttributes) {
        console.error('No layer or attributes found');
        return;
    }
    
    // Update attributes based on feature type
    switch (layer.ttcAttributes.type) {
        case 'work-zone':
            const title = document.getElementById('feature-title')?.value;
            if (title !== undefined) {
                layer.ttcAttributes.title = title || 'Work Zone';
            }
            break;
            
        case 'lane-closure':
        case 'taper':
        case 'buffer':
            const position = document.getElementById('feature-position')?.value;
            if (position !== undefined) {
                layer.ttcAttributes.position = position;
            }
            break;
            
        case 'warning-sign':
            const signType = document.getElementById('feature-sign-type')?.value;
            if (signType !== undefined) {
                layer.ttcAttributes.signType = signType;
            }
            break;
            
        case 'work-point':
            const workPointTitle = document.getElementById('feature-title')?.value;
            if (workPointTitle !== undefined) {
                layer.ttcAttributes.title = workPointTitle || 'Work Point';
            }
            break;
            
        case 'custom-label':
            const customLabelTitle = document.getElementById('feature-title')?.value;
            if (customLabelTitle !== undefined) {
                layer.ttcAttributes.title = customLabelTitle || 'Label';
            }
            break;
    }
    
    // Capture label customization settings (applies to all feature types)
    const labelEnabled = document.getElementById('feature-label-enabled')?.checked;
    const labelOffsetX = document.getElementById('feature-label-offset-x')?.value;
    const labelOffsetY = document.getElementById('feature-label-offset-y')?.value;
    const labelFontSize = document.getElementById('feature-label-font-size')?.value;
    const labelRotation = document.getElementById('feature-label-rotation')?.value;

    // Update label enabled state
    layer.ttcAttributes.labelEnabled = labelEnabled;
    
    if (labelOffsetX !== undefined && labelOffsetX !== '') {
        layer.ttcAttributes.labelOffsetX = parseInt(labelOffsetX);
    }
    if (labelOffsetY !== undefined && labelOffsetY !== '') {
        layer.ttcAttributes.labelOffsetY = parseInt(labelOffsetY);
    }
    if (labelFontSize) {
        layer.ttcAttributes.labelFontSize = parseInt(labelFontSize);
    }
    if (labelRotation !== '' && labelRotation !== null && labelRotation !== undefined) {
        layer.ttcAttributes.labelRotation = parseInt(labelRotation);
    }    console.log('Real-time updated attributes:', layer.ttcAttributes); // Debug
    
    // Update the display immediately
    updateFeatureDisplay(layer);
}

// Apply properties from form to layer (now just finalizes the real-time changes)
function applyFeatureProperties() {
    console.log('=== applyFeatureProperties START ==='); // Debug statement
    
    // Set flag to prevent drawing interference
    isProcessingApply = true;
    console.log('isProcessingApply set to true'); // Debug
    
    const panel = document.getElementById('properties-panel');
    const layer = panel?.currentLayer;
    
    console.log('Panel found:', !!panel); // Debug
    console.log('Current layer:', !!layer); // Debug
    console.log('Layer attributes:', layer?.ttcAttributes); // Debug
    
    if (!layer || !layer.ttcAttributes) {
        console.error('No layer or attributes found - exiting early');
        isProcessingApply = false;
        return;
    }
    
    console.log('Finalizing properties for:', layer.ttcAttributes.type); // Debug statement
    
    // Store current values as "last applied" for reset functionality
    lastAppliedValues[layer._leaflet_id] = {
        labelEnabled: layer.ttcAttributes.labelEnabled,
        labelOffsetX: layer.ttcAttributes.labelOffsetX,
        labelOffsetY: layer.ttcAttributes.labelOffsetY,
        labelFontSize: layer.ttcAttributes.labelFontSize,
        labelRotation: layer.ttcAttributes.labelRotation
    };
    
    // Since real-time updates have already applied changes, we just need to do final update
    console.log('Final layer attributes:', layer.ttcAttributes); // Debug
    
    // Final update to ensure everything is current
    console.log('Calling final updateFeatureDisplay...');
    updateFeatureDisplay(layer);
    
    // Clear current drawing tool and exit drawing mode
    console.log('Calling clearCurrentTool...');
    clearCurrentTool();
    
    // Remove active class from all tool buttons
    console.log('Removing active classes from tool buttons...');
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hide panel automatically after applying
    console.log('Calling hideFeatureProperties...');
    hideFeatureProperties();
    
    // Clear the processing flag after a short delay
    setTimeout(() => {
        isProcessingApply = false;
        console.log('isProcessingApply cleared');
    }, 100);
    
    console.log('=== applyFeatureProperties END ===');
}

// Hide feature properties panel
function hideFeatureProperties() {
    console.log('=== hideFeatureProperties START ==='); // Debug statement
    
    const panel = document.getElementById('properties-panel');
    
    if (!panel) {
        console.error('Properties panel not found');
        return;
    }
    
    console.log('Panel found - current classes BEFORE:', panel.className); // Debug
    console.log('Panel style display BEFORE:', panel.style.display); // Debug
    console.log('Panel classList contains "hidden":', panel.classList.contains('hidden')); // Debug
    console.log('Panel offsetWidth/Height BEFORE:', panel.offsetWidth, 'x', panel.offsetHeight); // Debug
    
    // Multiple approaches to hide the panel
    panel.classList.add('hidden');
    panel.style.display = 'none';  // Force display none
    panel.currentLayer = null;
    
    console.log('Panel classes AFTER:', panel.className); // Debug
    console.log('Panel style display AFTER:', panel.style.display); // Debug
    console.log('Panel classList contains "hidden" now:', panel.classList.contains('hidden')); // Debug
    console.log('Panel offsetWidth/Height AFTER:', panel.offsetWidth, 'x', panel.offsetHeight); // Debug
    
    // Check computed styles
    const computedStyle = window.getComputedStyle(panel);
    console.log('Computed display style:', computedStyle.display); // Debug
    console.log('Computed visibility:', computedStyle.visibility); // Debug
    
    // Clear current drawing tool to ensure clean state
    if (typeof clearCurrentTool === 'function') {
        console.log('Calling clearCurrentTool from hideFeatureProperties...');
        clearCurrentTool();
    } else {
        console.log('clearCurrentTool function not found');
    }
    
    // Reset tool button states
    console.log('Resetting tool button states...');
    const toolButtons = document.querySelectorAll('.tool-btn');
    console.log('Found', toolButtons.length, 'tool buttons');
    toolButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Reset status
    const measurementInfo = document.getElementById('measurement-info');
    if (measurementInfo) {
        measurementInfo.textContent = 'Measurement: --';
        console.log('Reset measurement info');
    } else {
        console.log('Measurement info element not found');
    }
    
    // Update tool display
    if (typeof updateToolDisplay === 'function') {
        console.log('Calling updateToolDisplay...');
        updateToolDisplay();
    } else {
        console.log('updateToolDisplay function not found');
    }
    
    // Force a reflow to ensure the changes take effect
    panel.offsetHeight; // Reading this forces a reflow
    
    console.log('=== hideFeatureProperties END - Panel should be hidden ==='); // Debug statement
}

// Update feature display with current attributes
function updateFeatureDisplay(layer) {
    console.log('=== updateFeatureDisplay START ===', layer.ttcAttributes); // Debug
    
    if (!layer.ttcAttributes) {
        console.log('No attributes found, exiting'); // Debug
        return;
    }
    
    // Remove existing label if it exists
    if (layer.labelMarker) {
        console.log('Removing existing label'); // Debug
        drawnItems.removeLayer(layer.labelMarker);
        layer.labelMarker = null;
    }
    
    let popupContent = '';
    let labelText = '';
    let labelPosition = null;
    
    console.log('Processing feature type:', layer.ttcAttributes.type); // Debug
    
    switch (layer.ttcAttributes.type) {
        case 'work-zone':
            popupContent = `<strong>Work Zone</strong><br>Title: ${layer.ttcAttributes.title}<br><em>Click to edit attributes</em>`;
            labelText = layer.ttcAttributes.title;
            labelPosition = layer.getBounds().getCenter(); // Center of polygon
            console.log('Work zone - labelText:', labelText, 'position:', labelPosition); // Debug
            break;
            
        case 'lane-closure':
        case 'taper':
        case 'buffer':
            const lineLength = calculateLineLength(layer);
            const featureType = layer.ttcAttributes.type.replace('-', ' ').toUpperCase();
            labelText = `${layer.ttcAttributes.position} | ${featureType} | ${lineLength.toFixed(0)} ft`;
            labelPosition = getLineMidpoint(layer);
            popupContent = `<strong>${featureType}</strong><br>Position: ${layer.ttcAttributes.position}<br>Length: ${lineLength.toFixed(0)} ft<br><em>Click to edit attributes</em>`;
            console.log('Line feature - labelText:', labelText, 'position:', labelPosition, 'length:', lineLength); // Debug
            break;
            
        case 'warning-sign':
            popupContent = `<strong>Warning Sign</strong><br>Type: ${layer.ttcAttributes.signType}<br><em>Click to edit attributes</em>`;
            labelText = layer.ttcAttributes.signType;
            labelPosition = layer.getLatLng(); // Point position
            console.log('Warning sign - labelText:', labelText, 'position:', labelPosition); // Debug
            break;
            
        case 'work-point':
            popupContent = `<strong>Work Point</strong><br>Title: ${layer.ttcAttributes.title}<br><em>Click to edit attributes</em>`;
            labelText = layer.ttcAttributes.title;
            labelPosition = layer.getLatLng(); // Point position
            console.log('Work point - labelText:', labelText, 'position:', labelPosition); // Debug
            break;
            
        case 'custom-label':
            popupContent = `<strong>Custom Label</strong><br>Text: ${layer.ttcAttributes.title}<br><em>Click to edit attributes</em>`;
            labelText = layer.ttcAttributes.title;
            labelPosition = layer.getLatLng(); // Point position
            console.log('Custom label - labelText:', labelText, 'position:', labelPosition); // Debug
            break;
            
        case 'call-out':
            // Call-outs don't have labels or popups, just the line
            console.log('Call-out line - no label created'); // Debug
            break;
    }
    
    console.log('Final label data - text:', labelText, 'position:', labelPosition); // Debug
    
    // Create label if we have text and position AND labels are enabled
    if (labelText && labelPosition && layer.ttcAttributes.labelEnabled !== false) {
        console.log('Creating label for custom label...'); // Debug
        createFeatureLabel(layer, labelText, labelPosition);
    } else {
        console.log('No label created for custom label - labelText:', labelText, 'labelPosition:', labelPosition, 'labelEnabled:', layer.ttcAttributes.labelEnabled); // Debug
    }
    
    if (popupContent) {
        layer.bindPopup(popupContent);
        
        // Remove any existing click handlers to prevent duplicates
        layer.off('click');
        
        // Add click handler to edit attributes
        layer.on('click', function(e) {
            console.log('Feature clicked:', layer.ttcAttributes.type); // Debug
            const deleteMode = document.getElementById('delete-mode');
            
            // Check if we're in delete mode
            if (deleteMode && deleteMode.classList.contains('active')) {
                console.log('In delete mode, triggering deletion for:', layer.ttcAttributes.type); // Debug
                
                // Handle deletion directly
                if (confirm('Delete this feature?')) {
                    // Remove label if it exists
                    if (layer.labelMarker) {
                        drawnItems.removeLayer(layer.labelMarker);
                    }
                    
                    drawnItems.removeLayer(layer);
                    
                    // Remove from feature collections
                    Object.keys(ttcFeatures).forEach(key => {
                        const index = ttcFeatures[key].indexOf(layer);
                        if (index > -1) {
                            ttcFeatures[key].splice(index, 1);
                        }
                    });
                    
                    updateFeatureCount();
                    console.log('Feature deleted via direct click');
                    
                    // Close delete tool after successful deletion
                    if (deleteMode.classList.contains('active')) {
                        deleteMode.classList.remove('active');
                        if (typeof disableDeleteMode === 'function') {
                            disableDeleteMode();
                        }
                        console.log('Delete tool closed after feature deletion');
                    }
                }
                
                // Stop the event from propagating further
                e.originalEvent.stopPropagation();
                
            } else {
                // Not in delete mode, open properties panel
                showFeatureProperties(layer);
                e.originalEvent.stopPropagation();
            }
        });
    } else {
        console.log('No popup content for feature type:', layer.ttcAttributes.type); // Debug
    }
    
    console.log('=== updateFeatureDisplay END ==='); // Debug
}

// Calculate line length in feet
function calculateLineLength(layer) {
    if (!layer.getLatLngs) return 0;
    
    const latLngs = layer.getLatLngs();
    let totalLength = 0;
    
    for (let i = 0; i < latLngs.length - 1; i++) {
        totalLength += calculateDistance(latLngs[i], latLngs[i + 1]);
    }
    
    return metersToFeet(totalLength);
}

// Get midpoint of a line
function getLineMidpoint(layer) {
    if (!layer.getLatLngs) return null;
    
    const latLngs = layer.getLatLngs();
    if (latLngs.length < 2) return null;
    
    // Find the point at half the total length
    const totalLength = calculateLineLength(layer);
    const targetLength = totalLength / 2;
    
    let currentLength = 0;
    
    for (let i = 0; i < latLngs.length - 1; i++) {
        const segmentLength = metersToFeet(calculateDistance(latLngs[i], latLngs[i + 1]));
        
        if (currentLength + segmentLength >= targetLength) {
            // The midpoint is in this segment
            const ratio = (targetLength - currentLength) / segmentLength;
            const lat = latLngs[i].lat + (latLngs[i + 1].lat - latLngs[i].lat) * ratio;
            const lng = latLngs[i].lng + (latLngs[i + 1].lng - latLngs[i].lng) * ratio;
            return L.latLng(lat, lng);
        }
        
        currentLength += segmentLength;
    }
    
    // Fallback to geometric center
    return latLngs[Math.floor(latLngs.length / 2)];
}

// Create a label for a feature
function createFeatureLabel(layer, text, position) {
    console.log('=== createFeatureLabel START ==='); // Debug
    console.log('Parameters - text:', text, 'position:', position, 'layer type:', layer.ttcAttributes.type); // Debug
    
    // Get customizable values from layer attributes
    const labelOffsetX = layer.ttcAttributes.labelOffsetX !== undefined ? layer.ttcAttributes.labelOffsetX : 0;
    const labelOffsetY = layer.ttcAttributes.labelOffsetY !== undefined ? layer.ttcAttributes.labelOffsetY : 25;
    const labelFontSize = layer.ttcAttributes.labelFontSize || 12;
    const customRotation = layer.ttcAttributes.labelRotation; // Can be undefined for auto behavior
    
    console.log('Using label offsets - X:', labelOffsetX, 'Y:', labelOffsetY, 'font size:', labelFontSize, 'custom rotation:', customRotation); // Debug
    
    let offsetPosition = position;
    let rotation = customRotation !== undefined ? customRotation : 0; // Use custom rotation if set, otherwise default to 0
    
    // Handle different feature types
    if (layer.ttcAttributes.type === 'warning-sign' || layer.ttcAttributes.type === 'work-point' || layer.ttcAttributes.type === 'custom-label') {
        console.log('Calculating offset for point feature...'); // Debug
        // Offset the label using both X and Y offsets
        const map = layer._map;
        if (map) {
            const point = map.latLngToContainerPoint(position);
            const offsetPoint = L.point(point.x + labelOffsetX, point.y - labelOffsetY); // X offset right, Y offset up
            offsetPosition = map.containerPointToLatLng(offsetPoint);
            console.log('Offset position:', offsetPosition); // Debug
        }
    } else {
        // For line features, calculate angle and offset position above the line
        console.log('Calculating angle and offset for line feature...'); // Debug
        const latlngs = layer.getLatLngs();
        
        if (latlngs && latlngs.length >= 2) {
            // Get the line segment at the midpoint for angle calculation
            const midIndex = Math.floor(latlngs.length / 2);
            let startPoint, endPoint;
            
            if (latlngs.length === 2) {
                startPoint = latlngs[0];
                endPoint = latlngs[1];
            } else {
                // For multi-segment lines, use the segment around the midpoint
                startPoint = latlngs[midIndex - 1] || latlngs[0];
                endPoint = latlngs[midIndex] || latlngs[latlngs.length - 1];
            }
            
            // Calculate angle using screen coordinates for proper map projection handling
            const map = layer._map;
            if (map) {
                const startScreenPoint = map.latLngToContainerPoint(startPoint);
                const endScreenPoint = map.latLngToContainerPoint(endPoint);
                
                // Only calculate automatic rotation if no custom rotation is set
                if (customRotation === undefined) {
                    // Calculate angle in screen coordinates (this accounts for map projection)
                    const deltaX = endScreenPoint.x - startScreenPoint.x;
                    const deltaY = endScreenPoint.y - startScreenPoint.y;
                    rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                    
                    console.log('Line angle calculated from screen coords:', rotation, 'degrees'); // Debug
                }
                
                // Offset the label above the line (perpendicular to line direction)
                const centerPoint = map.latLngToContainerPoint(position);
                // Calculate perpendicular offset - subtract 90 degrees to go "up" relative to line direction
                const perpendicularAngle = (rotation - 90) * (Math.PI / 180);
                
                const offsetPoint = L.point(
                    centerPoint.x + Math.cos(perpendicularAngle) * labelOffsetY + labelOffsetX, // Y offset perpendicular + X offset parallel to screen
                    centerPoint.y + Math.sin(perpendicularAngle) * labelOffsetY
                );
                
                offsetPosition = map.containerPointToLatLng(offsetPoint);
                console.log('Line offset position:', offsetPosition); // Debug
            }
        }
    }
    
    console.log('Creating label marker with rotation:', rotation); // Debug
    
    // Create label marker with rotation and custom font size
    const labelMarker = L.marker(offsetPosition, {
        icon: L.divIcon({
            className: 'feature-label',
            html: `<div class="label-text" style="transform: translate(-50%, -50%) rotate(${rotation}deg); font-size: ${labelFontSize}px;">${text}</div>`,
            iconSize: [null, null], // Auto-size based on content
            iconAnchor: [null, null] // Will be centered by CSS
        }),
        interactive: false // Labels should not be clickable
    });
    
    console.log('Label marker created:', labelMarker); // Debug
    
    // Add to map and store reference
    try {
        labelMarker.addTo(drawnItems);
        layer.labelMarker = labelMarker;
        console.log('Label added to map successfully'); // Debug
    } catch (error) {
        console.error('Error adding label to map:', error); // Debug
    }
    
    console.log('=== createFeatureLabel END ==='); // Debug
}

// Custom draw handler for TTC lines
function setupTTCLineDrawing() {
    map.on('draw:drawstart', function(e) {
        console.log('Draw started:', e.layerType);
    });
    
    map.on('draw:created', function(e) {
        const layer = e.layer;
        const type = e.layerType;
        
        console.log('Draw created event:', type, 'currentTool:', currentTool); // Debug
        
        if (type === 'polyline' && currentTool) {
            // Get the drawn line coordinates
            const latLngs = layer.getLatLngs();
            
            if (latLngs.length >= 2) {
                let styledLine;
                
                if (currentTool === 'lane-closure') {
                    styledLine = createLaneClosure(latLngs);
                    styledLine.ttcAttributes = {
                        type: 'lane-closure',
                        position: 'Advanced'
                    };
                } else if (currentTool === 'taper') {
                    styledLine = createTaper(latLngs);
                    styledLine.ttcAttributes = {
                        type: 'taper',
                        position: 'Advanced'
                    };
                } else if (currentTool === 'buffer') {
                    styledLine = createBuffer(latLngs);
                    styledLine.ttcAttributes = {
                        type: 'buffer',
                        position: 'Advanced'
                    };
                } else if (currentTool === 'call-out') {
                    // Create simple black line for call-out
                    styledLine = L.polyline(latLngs, {
                        color: '#000000',
                        weight: 2,
                        opacity: 1
                    });
                    styledLine.ttcAttributes = {
                        type: 'call-out'
                    };
                    
                    // Add to call-outs collection
                    ttcFeatures.callOuts = ttcFeatures.callOuts || [];
                    ttcFeatures.callOuts.push(styledLine);
                }
                
                if (styledLine) {
                    console.log('Created styled line with attributes:', styledLine.ttcAttributes); // Debug
                    
                    // Remove the temporary draw layer and add our styled line
                    drawnItems.removeLayer(layer);
                    drawnItems.addLayer(styledLine);
                    updateFeatureCount();
                    
                    // Set up initial display first (but skip for call-outs as they don't have labels)
                    if (styledLine.ttcAttributes.type !== 'call-out') {
                        updateFeatureDisplay(styledLine);
                    }
                    
                    // Show properties panel for newly created features (except call-outs)
                    if (styledLine.ttcAttributes.type !== 'call-out') {
                        showFeatureProperties(styledLine);
                    } else {
                        // For call-outs, close the tool immediately after creation
                        console.log('Call-out created, closing tool...'); // Debug
                        clearCurrentTool();
                        // Remove active class from all tool buttons
                        document.querySelectorAll('.tool-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                    }
                }
            }
        } else if (type === 'polygon' && currentTool === 'work-location-polygon') {
            // Apply work zone styling with hashed fill
            applyWorkZoneStyling(layer);
            
            // Set default attributes
            layer.ttcAttributes = {
                type: 'work-zone',
                title: 'Work Zone'
            };
            
            console.log('Created work zone with attributes:', layer.ttcAttributes); // Debug
            
            ttcFeatures.workZones.push(layer);
            
            // Set up initial display first
            updateFeatureDisplay(layer);
            
            // Always show properties panel for newly created features
            showFeatureProperties(layer);
        }
        
        // Keep the tool active for continued drawing only if not processing apply (excluding call-out which closes immediately)
        if (!isProcessingApply && (currentTool === 'work-location-polygon' || currentTool === 'lane-closure' || currentTool === 'taper' || currentTool === 'buffer') && currentTool !== 'call-out') {
            setTimeout(() => {
                // Double-check that we're still not processing apply
                if (!isProcessingApply && map.drawControl && map.drawControl._toolbars && map.drawControl._toolbars.draw) {
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
        // But don't interfere if we're processing an apply operation
        if (!isProcessingApply) {
            console.log('Draw stopped, tool remains active');
        } else {
            console.log('Draw stopped during apply process - not reactivating tool');
        }
    });
}

// Make functions globally accessible for event handlers in other files
console.log('Making functions globally accessible...'); // Debug
window.applyFeatureProperties = applyFeatureProperties;
window.hideFeatureProperties = hideFeatureProperties;
window.showFeatureProperties = showFeatureProperties;
window.resetLabelingValues = resetLabelingValues;
console.log('Functions assigned to window object:', {
    applyFeatureProperties: typeof window.applyFeatureProperties,
    hideFeatureProperties: typeof window.hideFeatureProperties,
    showFeatureProperties: typeof window.showFeatureProperties,
    resetLabelingValues: typeof window.resetLabelingValues
}); // Debug

// Add a mutation observer to monitor the properties panel
document.addEventListener('DOMContentLoaded', function() {
    const panel = document.getElementById('properties-panel');
    if (panel) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log('Properties panel class changed:', panel.className);
                }
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    console.log('Properties panel style changed:', panel.style.cssText);
                }
            });
        });
        
        observer.observe(panel, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        console.log('Mutation observer attached to properties panel');
    }
});